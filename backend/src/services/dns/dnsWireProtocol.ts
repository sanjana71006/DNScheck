import dgram from 'dgram';
import { DNSRecordType, DnsFlags } from '../../shared/types/dns.js';
import { logger } from '../../utils/logger.js';

export const DNS_RECORD_TYPE_CODES: Record<string, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  SPF: 16 // queried as TXT
};

export const DNS_TYPE_FROM_CODE: Record<number, DNSRecordType> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA'
};

export const RCODE_NAMES: Record<number, string> = {
  0: 'NOERROR',
  1: 'FORMERR',
  2: 'SERVFAIL',
  3: 'NXDOMAIN',
  4: 'NOTIMP',
  5: 'REFUSED',
  9: 'NOTAUTH',
  10: 'NOTZONE'
};

export interface WireDnsAnswer {
  name: string;
  type: DNSRecordType | string;
  typeCode: number;
  classCode: number;
  ttl: number;
  data: string;
}

export interface WireDnsResult {
  rcode: string;
  rcodeCode: number;
  flags: DnsFlags;
  answers: WireDnsAnswer[];
  latencyMs: number;
  transport: 'UDP' | 'DOH';
  rawBuffer?: Buffer;
}

/**
 * Encodes domain into DNS QNAME format (e.g. "example.com" -> \x07example\x03com\x00)
 */
export function encodeDomainName(domain: string): Buffer {
  const parts = domain.replace(/\.$/, '').split('.');
  const buffers: Buffer[] = [];

  for (const part of parts) {
    const len = Buffer.from([part.length]);
    const str = Buffer.from(part, 'ascii');
    buffers.push(len, str);
  }
  buffers.push(Buffer.from([0])); // root label null byte
  return Buffer.concat(buffers);
}

/**
 * Builds a RFC 1035 compliant DNS query packet
 */
export function buildDnsQueryPacket(
  domain: string,
  recordType: DNSRecordType,
  recursionDesired = false,
  transactionId = Math.floor(Math.random() * 65535)
): Buffer {
  const header = Buffer.alloc(12);

  // Transaction ID (2 bytes)
  header.writeUInt16BE(transactionId, 0);

  // Flags: Query (QR=0), Opcode=0, RD (bit 8)
  const flags = recursionDesired ? 0x0100 : 0x0000;
  header.writeUInt16BE(flags, 2);

  // QDCOUNT = 1, ANCOUNT = 0, NSCOUNT = 0, ARCOUNT = 0
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(0, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(0, 10);

  const qname = encodeDomainName(domain);

  const questionFooter = Buffer.alloc(4);
  const typeCode = DNS_RECORD_TYPE_CODES[recordType] || 1;
  questionFooter.writeUInt16BE(typeCode, 0); // QTYPE
  questionFooter.writeUInt16BE(1, 2); // QCLASS = IN (Internet)

  return Buffer.concat([header, qname, questionFooter]);
}

/**
 * Reads a domain name from packet, handling DNS pointer compression (0xc0)
 */
function readDomainName(buffer: Buffer, offset: number): { name: string; newOffset: number } {
  const labels: string[] = [];
  let curr = offset;
  let jumped = false;
  let finalOffset = curr;

  while (curr < buffer.length) {
    const len = buffer.readUInt8(curr);
    if (len === 0) {
      if (!jumped) finalOffset = curr + 1;
      break;
    }

    // Pointer compression: top 2 bits are 11
    if ((len & 0xc0) === 0xc0) {
      const pointerOffset = buffer.readUInt16BE(curr) & 0x3fff;
      if (!jumped) {
        finalOffset = curr + 2;
        jumped = true;
      }
      curr = pointerOffset;
      continue;
    }

    curr += 1;
    labels.push(buffer.toString('utf8', curr, curr + len));
    curr += len;
    if (!jumped) finalOffset = curr;
  }

  return { name: labels.join('.'), newOffset: finalOffset };
}

/**
 * Parses RFC 1035 DNS response buffer
 */
export function parseDnsResponsePacket(buffer: Buffer): Omit<WireDnsResult, 'latencyMs' | 'transport'> {
  if (buffer.length < 12) {
    throw new Error('DNS response buffer too short (<12 bytes)');
  }

  const flagsWord = buffer.readUInt16BE(2);
  const aa = Boolean(flagsWord & 0x0400); // Bit 5: Authoritative Answer
  const rd = Boolean(flagsWord & 0x0100); // Bit 8: Recursion Desired
  const ra = Boolean(flagsWord & 0x0080); // Bit 9: Recursion Available
  const ad = Boolean(flagsWord & 0x0020); // Bit 11: Authentic Data (DNSSEC)
  const cd = Boolean(flagsWord & 0x0010); // Bit 12: Checking Disabled
  const rcodeVal = flagsWord & 0x000f; // Bits 12-15: RCODE
  const rcode = RCODE_NAMES[rcodeVal] || `RCODE_${rcodeVal}`;

  const qdcount = buffer.readUInt16BE(4);
  const ancount = buffer.readUInt16BE(6);

  let offset = 12;

  // Skip questions section
  for (let i = 0; i < qdcount; i++) {
    const { newOffset } = readDomainName(buffer, offset);
    offset = newOffset + 4; // QTYPE (2) + QCLASS (2)
  }

  const answers: WireDnsAnswer[] = [];

  // Parse answers
  for (let i = 0; i < ancount && offset < buffer.length; i++) {
    const { name, newOffset } = readDomainName(buffer, offset);
    offset = newOffset;

    if (offset + 10 > buffer.length) break;

    const typeCode = buffer.readUInt16BE(offset);
    const classCode = buffer.readUInt16BE(offset + 2);
    const ttl = buffer.readUInt32BE(offset + 4);
    const rdlength = buffer.readUInt16BE(offset + 8);
    offset += 10;

    let data = '';

    if (typeCode === 1 && rdlength === 4) {
      // A (IPv4)
      data = `${buffer[offset]}.${buffer[offset + 1]}.${buffer[offset + 2]}.${buffer[offset + 3]}`;
    } else if (typeCode === 28 && rdlength === 16) {
      // AAAA (IPv6)
      const parts: string[] = [];
      for (let p = 0; p < 16; p += 2) {
        parts.push(buffer.readUInt16BE(offset + p).toString(16));
      }
      data = parts.join(':').replace(/(^|:)0(:0)+(:|$)/, '::');
    } else if (typeCode === 5 || typeCode === 2) {
      // CNAME or NS
      data = readDomainName(buffer, offset).name;
    } else if (typeCode === 15 && rdlength >= 3) {
      // MX
      const priority = buffer.readUInt16BE(offset);
      const exchange = readDomainName(buffer, offset + 2).name;
      data = `${priority} ${exchange}`;
    } else if (typeCode === 16) {
      // TXT
      let txtOffset = offset;
      const endOffset = offset + rdlength;
      const chunks: string[] = [];
      while (txtOffset < endOffset) {
        const chunkLen = buffer.readUInt8(txtOffset);
        txtOffset += 1;
        chunks.push(buffer.toString('utf8', txtOffset, txtOffset + chunkLen));
        txtOffset += chunkLen;
      }
      data = chunks.join('');
    } else if (typeCode === 6) {
      // SOA
      const mname = readDomainName(buffer, offset);
      let soaOffset = mname.newOffset;
      const rname = readDomainName(buffer, soaOffset);
      soaOffset = rname.newOffset;
      if (soaOffset + 20 <= buffer.length) {
        const serial = buffer.readUInt32BE(soaOffset);
        data = `${mname.name} ${rname.name} serial:${serial}`;
      }
    } else {
      data = buffer.slice(offset, offset + rdlength).toString('utf8');
    }

    offset += rdlength;

    answers.push({
      name,
      type: DNS_TYPE_FROM_CODE[typeCode] || `TYPE_${typeCode}`,
      typeCode,
      classCode,
      ttl,
      data
    });
  }

  return {
    rcode,
    rcodeCode: rcodeVal,
    flags: { aa, rd, ra, ad, cd },
    answers
  };
}

/**
 * Direct Live UDP DNS Query with RD=0 option for authoritative verification
 */
export function queryDnsUdp(
  serverIp: string,
  domain: string,
  recordType: DNSRecordType,
  options: { port?: number; timeoutMs?: number; recursionDesired?: boolean } = {}
): Promise<WireDnsResult> {
  const { port = 53, timeoutMs = 2500, recursionDesired = false } = options;

  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const startTime = Date.now();
    let isFinished = false;

    const timer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        socket.close();
        reject(new Error(`DNS UDP query to ${serverIp}:${port} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    socket.on('error', (err) => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        socket.close();
        reject(err);
      }
    });

    socket.on('message', (msg) => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        socket.close();
        const latencyMs = Date.now() - startTime;

        try {
          const parsed = parseDnsResponsePacket(msg);
          resolve({
            ...parsed,
            latencyMs,
            transport: 'UDP',
            rawBuffer: msg
          });
        } catch (parseErr) {
          reject(parseErr);
        }
      }
    });

    try {
      const packet = buildDnsQueryPacket(domain, recordType, recursionDesired);
      socket.send(packet, port, serverIp, (err) => {
        if (err && !isFinished) {
          isFinished = true;
          clearTimeout(timer);
          socket.close();
          reject(err);
        }
      });
    } catch (err) {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        socket.close();
        reject(err);
      }
    }
  });
}

/**
 * Live DNS-over-HTTPS (DoH) query using wire format with JSON fallback
 */
export async function queryDnsDoH(
  dohEndpoint: string,
  domain: string,
  recordType: DNSRecordType,
  options: { timeoutMs?: number } = {}
): Promise<WireDnsResult> {
  const { timeoutMs = 3000 } = options;
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1. Try RFC 8484 DNS Wire Format (application/dns-message)
    const wirePacket = buildDnsQueryPacket(domain, recordType, true);

    const wireRes = await fetch(dohEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/dns-message',
        Accept: 'application/dns-message'
      },
      body: new Uint8Array(wirePacket),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (wireRes.ok && wireRes.headers.get('content-type')?.includes('application/dns-message')) {
      const arrayBuffer = await wireRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsed = parseDnsResponsePacket(buffer);
      return {
        ...parsed,
        latencyMs: Date.now() - startTime,
        transport: 'DOH',
        rawBuffer: buffer
      };
    }

    // 2. Fallback: application/dns-json format (Google & Cloudflare DoH format)
    const url = new URL(dohEndpoint);
    url.searchParams.set('name', domain);
    url.searchParams.set('type', recordType);

    const jsonRes = await fetch(url.toString(), {
      headers: { Accept: 'application/dns-json' }
    });

    if (!jsonRes.ok) {
      throw new Error(`DoH endpoint HTTP ${jsonRes.status}: ${jsonRes.statusText}`);
    }

    const data = await jsonRes.json();
    const rcodeVal = data.Status !== undefined ? Number(data.Status) : 0;
    const rcode = RCODE_NAMES[rcodeVal] || `RCODE_${rcodeVal}`;

    const answers: WireDnsAnswer[] = (data.Answer || []).map((ans: any) => ({
      name: ans.name || domain,
      type: DNS_TYPE_FROM_CODE[ans.type] || String(ans.type),
      typeCode: ans.type,
      classCode: 1,
      ttl: ans.TTL || 300,
      data: String(ans.data).replace(/^"|"$/g, '')
    }));

    return {
      rcode,
      rcodeCode: rcodeVal,
      flags: {
        aa: Boolean(data.AA),
        rd: Boolean(data.RD),
        ra: Boolean(data.RA),
        ad: Boolean(data.AD),
        cd: Boolean(data.CD)
      },
      answers,
      latencyMs: Date.now() - startTime,
      transport: 'DOH'
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

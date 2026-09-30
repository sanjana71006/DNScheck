import { Resolver } from 'dns/promises';
import { DNSRecordType, QueryStatus, DnsFlags } from '../../shared/index.js';
import { ENV } from '../../config/env.js';
import { dnsConcurrencyLimit, runWithTimeout } from '../../utils/concurrency.js';
import { queryDnsDoH, queryDnsUdp } from './dnsWireProtocol.js';
import { logger } from '../../utils/logger.js';

export interface ResolverResponse {
  answers: string[];
  ttl?: number;
  responseTimeMs: number;
  status: QueryStatus;
  transport: 'UDP' | 'TCP' | 'DOH';
  rcode: string;
  flags?: DnsFlags;
  error?: string;
  timestamp: string;
}

interface CacheEntry extends ResolverResponse {
  expiresAt: number;
}

const dnsCache = new Map<string, CacheEntry>();

export class DNSResolverService {
  private timeoutMs: number;

  constructor(timeoutMs = ENV.DNS_QUERY_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  private getCacheKey(domain: string, recordType: DNSRecordType, resolverIp: string): string {
    return `${domain.toLowerCase()}|${recordType}|${resolverIp}`;
  }

  public clearCache(): void {
    dnsCache.clear();
  }

  public async query(
    domain: string,
    recordType: DNSRecordType,
    resolverIp: string,
    options: {
      transport?: 'UDP' | 'TCP' | 'DOH';
      dohEndpoint?: string;
      useCache?: boolean;
    } = {}
  ): Promise<ResolverResponse> {
    const { transport = 'UDP', dohEndpoint, useCache = false } = options;
    const cacheKey = this.getCacheKey(domain, recordType, resolverIp);
    const now = Date.now();

    // Cache check only if specifically enabled
    if (useCache && dnsCache.has(cacheKey)) {
      const entry = dnsCache.get(cacheKey)!;
      if (entry.expiresAt > now) {
        return { ...entry };
      }
      dnsCache.delete(cacheKey);
    }

    return dnsConcurrencyLimit(async () => {
      // 1. If DoH transport is specified with an endpoint (e.g. Cloudflare, Google)
      if (transport === 'DOH' && dohEndpoint) {
        try {
          const dohRes = await queryDnsDoH(dohEndpoint, domain, recordType, {
            timeoutMs: this.timeoutMs
          });

          let status: QueryStatus = 'SUCCESS';
          if (dohRes.rcode === 'NXDOMAIN') status = 'NXDOMAIN';
          else if (dohRes.rcode === 'SERVFAIL') status = 'SERVFAIL';
          else if (dohRes.rcode !== 'NOERROR') status = 'ERROR';

          const answers = dohRes.answers
            .filter((a) => a.type === recordType || (recordType === 'A' && a.type === 'A'))
            .map((a) => a.data);

          const result: ResolverResponse = {
            answers,
            ttl: dohRes.answers[0]?.ttl || 300,
            responseTimeMs: dohRes.latencyMs,
            status,
            transport: 'DOH',
            rcode: dohRes.rcode,
            flags: dohRes.flags,
            timestamp: new Date().toISOString()
          };

          if (useCache && result.status === 'SUCCESS') {
            dnsCache.set(cacheKey, { ...result, expiresAt: now + (result.ttl || 60) * 1000 });
          }

          return result;
        } catch (dohErr: any) {
          logger.debug(`DoH query failed for ${resolverIp} (${dohEndpoint}), falling back to direct UDP: ${dohErr.message}`);
        }
      }

      // 2. Direct UDP Query with wire format
      try {
        const wireRes = await queryDnsUdp(resolverIp, domain, recordType, {
          timeoutMs: this.timeoutMs,
          recursionDesired: true
        });

        let status: QueryStatus = 'SUCCESS';
        if (wireRes.rcode === 'NXDOMAIN') status = 'NXDOMAIN';
        else if (wireRes.rcode === 'SERVFAIL') status = 'SERVFAIL';
        else if (wireRes.rcode !== 'NOERROR') status = 'ERROR';

        const answers = wireRes.answers
          .filter((a) => a.type === recordType || (recordType === 'A' && a.type === 'A'))
          .map((a) => a.data);

        return {
          answers,
          ttl: wireRes.answers[0]?.ttl || 300,
          responseTimeMs: wireRes.latencyMs,
          status,
          transport: 'UDP',
          rcode: wireRes.rcode,
          flags: wireRes.flags,
          timestamp: new Date().toISOString()
        };
      } catch (wireErr: any) {
        // 3. Fallback to Node.js Resolver
        const resolver = new Resolver();
        try {
          resolver.setServers([resolverIp]);
        } catch (err: any) {
          return {
            answers: [],
            responseTimeMs: 0,
            status: 'ERROR',
            transport: 'UDP',
            rcode: 'REFUSED',
            error: `Invalid resolver IP: ${err.message}`,
            timestamp: new Date().toISOString()
          };
        }

        const start = Date.now();
        let answers: string[] = [];
        let ttl: number | undefined = 300;
        let status: QueryStatus = 'SUCCESS';
        let errorMsg: string | undefined;
        let rcode = 'NOERROR';

        try {
          await runWithTimeout(
            async () => {
              switch (recordType) {
                case 'A': {
                  const res: any = await resolver.resolve4(domain, { ttl: true });
                  answers = Array.isArray(res) ? res.map((r: any) => r.address) : [];
                  if (res && res.length > 0) ttl = res[0].ttl;
                  break;
                }
                case 'AAAA': {
                  const res: any = await resolver.resolve6(domain, { ttl: true });
                  answers = Array.isArray(res) ? res.map((r: any) => r.address) : [];
                  if (res && res.length > 0) ttl = res[0].ttl;
                  break;
                }
                case 'CNAME': {
                  const res: any = await resolver.resolveCname(domain);
                  answers = Array.isArray(res) ? res : [res];
                  break;
                }
                case 'MX': {
                  const res: any = await resolver.resolveMx(domain);
                  answers = Array.isArray(res) ? res.map((r: any) => `${r.priority} ${r.exchange}`) : [];
                  break;
                }
                case 'TXT': {
                  const res: any = await resolver.resolveTxt(domain);
                  answers = Array.isArray(res)
                    ? res.map((parts: any) => (Array.isArray(parts) ? parts.join('') : String(parts)))
                    : [];
                  break;
                }
                case 'NS': {
                  answers = await resolver.resolveNs(domain);
                  break;
                }
                case 'SOA': {
                  const res = await resolver.resolveSoa(domain);
                  answers = [`${res.nsname} ${res.hostmaster} ${res.serial} ${res.refresh} ${res.retry} ${res.expire} ${res.minttl}`];
                  ttl = res.minttl;
                  break;
                }
              }
            },
            this.timeoutMs,
            `Resolver ${resolverIp} timed out after ${this.timeoutMs}ms`
          );
        } catch (err: any) {
          const code = err.code || '';
          if (code === 'ENOTFOUND' || code === 'NODATA' || code === 'ENODATA') {
            status = 'SUCCESS';
            rcode = 'NOERROR';
            answers = [];
          } else if (code === 'NXDOMAIN') {
            status = 'NXDOMAIN';
            rcode = 'NXDOMAIN';
            errorMsg = 'Domain does not exist (NXDOMAIN)';
          } else if (code === 'SERVFAIL') {
            status = 'SERVFAIL';
            rcode = 'SERVFAIL';
            errorMsg = 'Server failure (SERVFAIL)';
          } else if (code === 'TIMEOUT' || err.message?.includes('timed out')) {
            status = 'TIMEOUT';
            rcode = 'TIMEOUT';
            errorMsg = `DNS query timed out after ${this.timeoutMs}ms`;
          } else {
            status = 'ERROR';
            rcode = 'ERROR';
            errorMsg = err.message || 'DNS resolution error';
          }
        }

        const responseTimeMs = Date.now() - start;

        return {
          answers,
          ttl,
          responseTimeMs,
          status,
          transport: 'UDP',
          rcode,
          flags: { rd: true, ra: status === 'SUCCESS' },
          error: errorMsg,
          timestamp: new Date().toISOString()
        };
      }
    });
  }
}

export const dnsResolverService = new DNSResolverService();

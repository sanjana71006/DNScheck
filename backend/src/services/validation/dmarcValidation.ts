import { Resolver } from 'dns/promises';
import { Finding } from '../../shared/index.js';
import { runWithTimeout } from '../../utils/concurrency.js';
import { logger } from '../../utils/logger.js';

export interface DMARCValidationResult {
  status: 'VALID' | 'WARNING' | 'ERROR' | 'MISSING';
  records: string[];
  policy?: 'none' | 'quarantine' | 'reject';
  rua?: string;
  ruf?: string;
  pct?: number;
  findings: Finding[];
  details: string;
}

export class DMARCValidation {
  public static async queryAndValidate(
    domain: string,
    resolverIps = ['8.8.8.8', '1.1.1.1']
  ): Promise<DMARCValidationResult> {
    const findings: Finding[] = [];
    const dmarcHost = `_dmarc.${domain.trim().toLowerCase().replace(/\.+$/, '')}`;

    const resolver = new Resolver();
    resolver.setServers(resolverIps);

    let txtRecords: string[] = [];
    try {
      const res: any = await runWithTimeout(() => resolver.resolveTxt(dmarcHost), 3000);
      txtRecords = Array.isArray(res) ? res.map((parts: any) => (Array.isArray(parts) ? parts.join('') : String(parts))) : [];
    } catch (err: any) {
      logger.debug(`DMARC lookup failed for ${dmarcHost}: ${err.message}`);
    }

    const dmarcRecords = txtRecords.filter((r) => r.trim().startsWith('v=DMARC1'));

    if (dmarcRecords.length === 0) {
      findings.push({
        severity: 'WARNING',
        category: 'SECURITY_DMARC',
        title: 'Missing DMARC Record',
        description: `No DMARC policy record was found at ${dmarcHost}.`,
        evidence: `No TXT record starting with "v=DMARC1" at ${dmarcHost}`,
        recommendation:
          'Publish a DMARC policy (e.g. "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com") to protect your brand and email reputation.',
        createdAt: new Date().toISOString()
      });

      return {
        status: 'MISSING',
        records: [],
        findings,
        details: 'No DMARC record found. Receivers cannot verify domain alignment.'
      };
    }

    // Check multiple DMARC records (RFC 7489 violation)
    if (dmarcRecords.length > 1) {
      findings.push({
        severity: 'CRITICAL',
        category: 'SECURITY_DMARC',
        title: 'Multiple DMARC Records Detected',
        description:
          'RFC 7489 Section 6.6.3 dictates that a domain MUST NOT publish more than one DMARC TXT record. Multiple records invalidate DMARC handling.',
        evidence: `Found ${dmarcRecords.length} records: ${dmarcRecords.join(' | ')}`,
        recommendation: 'Remove redundant DMARC records leaving only a single canonical policy record.',
        createdAt: new Date().toISOString()
      });

      return {
        status: 'ERROR',
        records: dmarcRecords,
        findings,
        details: 'Multiple DMARC records detected. DMARC validation is invalidated by mail receivers.'
      };
    }

    const raw = dmarcRecords[0].trim();
    // Parse key-value pairs separated by semicolon
    const tags = new Map<string, string>();
    const tagPairs = raw.split(';').map((s) => s.trim()).filter(Boolean);

    for (const pair of tagPairs) {
      const idx = pair.indexOf('=');
      if (idx !== -1) {
        const k = pair.substring(0, idx).trim().toLowerCase();
        const v = pair.substring(idx + 1).trim();
        tags.set(k, v);
      }
    }

    const policy = tags.get('p')?.toLowerCase() as 'none' | 'quarantine' | 'reject' | undefined;
    const rua = tags.get('rua');
    const ruf = tags.get('ruf');
    const pctStr = tags.get('pct');
    const pct = pctStr ? parseInt(pctStr, 10) : 100;

    let hasSyntaxError = false;

    if (!policy) {
      hasSyntaxError = true;
      findings.push({
        severity: 'CRITICAL',
        category: 'SECURITY_DMARC',
        title: 'DMARC Policy Tag (p=) Missing',
        description: 'The mandatory "p=" policy tag is missing from the DMARC record.',
        evidence: raw,
        recommendation: 'Specify a policy: p=none (monitor), p=quarantine, or p=reject.',
        createdAt: new Date().toISOString()
      });
    } else if (!['none', 'quarantine', 'reject'].includes(policy)) {
      hasSyntaxError = true;
      findings.push({
        severity: 'CRITICAL',
        category: 'SECURITY_DMARC',
        title: 'Invalid DMARC Policy Value',
        description: `The policy "p=${policy}" is invalid. Must be none, quarantine, or reject.`,
        evidence: raw,
        recommendation: 'Set p=none, p=quarantine, or p=reject.',
        createdAt: new Date().toISOString()
      });
    } else if (policy === 'none') {
      findings.push({
        severity: 'INFO',
        category: 'SECURITY_DMARC',
        title: 'DMARC Policy in Monitoring Mode (p=none)',
        description: 'Domain DMARC policy is set to "none". Unaligned emails will still be delivered.',
        evidence: `p=${policy}`,
        recommendation: 'Once delivery reports are verified, advance policy to "quarantine" or "reject".',
        createdAt: new Date().toISOString()
      });
    }

    if (!rua) {
      findings.push({
        severity: 'WARNING',
        category: 'SECURITY_DMARC',
        title: 'No Aggregate Reporting URI (rua=)',
        description: 'DMARC record does not specify an aggregate report email via "rua=mailto:...".',
        evidence: raw,
        recommendation: 'Add "rua=mailto:reports@yourdomain.com" to receive forensic delivery feedback.',
        createdAt: new Date().toISOString()
      });
    }

    if (pctStr && (isNaN(pct) || pct < 0 || pct > 100)) {
      hasSyntaxError = true;
      findings.push({
        severity: 'WARNING',
        category: 'SECURITY_DMARC',
        title: 'Invalid DMARC Percentage (pct=)',
        description: `The percentage "pct=${pctStr}" must be an integer between 0 and 100.`,
        evidence: `pct=${pctStr}`,
        recommendation: 'Ensure pct is a number between 0 and 100.',
        createdAt: new Date().toISOString()
      });
    }

    const status = hasSyntaxError ? 'ERROR' : policy === 'none' ? 'WARNING' : 'VALID';

    return {
      status,
      records: dmarcRecords,
      policy,
      rua,
      ruf,
      pct,
      findings,
      details: `DMARC policy "${policy || 'undefined'}" active (${pct}% coverage). ${rua ? 'Aggregate reports configured.' : 'No aggregate reports.'}`
    };
  }
}

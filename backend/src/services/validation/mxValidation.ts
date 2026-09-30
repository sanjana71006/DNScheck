import { Resolver } from 'dns/promises';
import { Finding } from '../../shared/index.js';
import { DNSSyntaxValidation } from './dnsSyntaxValidation.js';
import { runWithTimeout } from '../../utils/concurrency.js';
import { logger } from '../../utils/logger.js';

export interface MXValidationResult {
  status: 'VALID' | 'WARNING' | 'ERROR' | 'MISSING';
  records: Array<{ exchange: string; priority: number; resolvable: boolean }>;
  findings: Finding[];
  details: string;
}

export class MXValidation {
  public static async validate(
    domain: string,
    mxAnswers: string[],
    hasARecord: boolean,
    resolverIps = ['8.8.8.8', '1.1.1.1']
  ): Promise<MXValidationResult> {
    const findings: Finding[] = [];
    const resolver = new Resolver();
    resolver.setServers(resolverIps);

    if (!mxAnswers || mxAnswers.length === 0) {
      if (hasARecord) {
        findings.push({
          severity: 'INFO',
          category: 'SECURITY_MX',
          title: 'Implicit MX Fallback (RFC 5321)',
          description:
            'No explicit MX records were found, but an A record exists. In accordance with RFC 5321, mail delivery may fall back directly to the A record address.',
          evidence: `Domain ${domain} has A record without MX.`,
          recommendation:
            'If this domain is intended to receive mail, configure explicit MX records for predictability and redundancy.',
          createdAt: new Date().toISOString()
        });

        return {
          status: 'WARNING',
          records: [],
          findings,
          details: 'No explicit MX record. Relying on implicit A record fallback.'
        };
      } else {
        findings.push({
          severity: 'INFO',
          category: 'SECURITY_MX',
          title: 'No MX Records Found',
          description: `No mail exchanger (MX) records are published for ${domain}.`,
          evidence: 'MX query returned 0 records',
          recommendation: 'If this domain will receive emails, configure appropriate mail exchanger records.',
          createdAt: new Date().toISOString()
        });

        return {
          status: 'MISSING',
          records: [],
          findings,
          details: 'Domain cannot receive email (no MX or fallback records found).'
        };
      }
    }

    const records: Array<{ exchange: string; priority: number; resolvable: boolean }> = [];
    let hasUnresolvable = false;
    let hasMalformed = false;

    for (const raw of mxAnswers) {
      const parts = raw.trim().split(/\s+/);
      const priority = parseInt(parts[0], 10);
      const rawExchange = parts.slice(1).join(' ').trim();
      const exchange = rawExchange.replace(/\.+$/, '');

      // Check for RFC 7505 Null MX record ("0 .")
      if (priority === 0 && (rawExchange === '.' || exchange === '')) {
        findings.push({
          severity: 'INFO',
          category: 'SECURITY_MX',
          title: 'RFC 7505 Null MX Record Detected',
          description:
            'This domain publishes a "Null MX" record (priority 0, target "."). In accordance with RFC 7505, this explicitly and authoritatively signals to all mail servers that this domain does not accept incoming email.',
          evidence: raw,
          recommendation:
            'No action required if this domain is not intended to receive mail. If email reception is desired, replace the Null MX with a valid mail exchange target.',
          createdAt: new Date().toISOString()
        });

        records.push({
          exchange: '.',
          priority: 0,
          resolvable: true
        });
        continue;
      }

      if (isNaN(priority) || priority < 0 || priority > 65535) {
        hasMalformed = true;
        findings.push({
          severity: 'CRITICAL',
          category: 'SECURITY_MX',
          title: 'Malformed MX Priority',
          description: `MX priority "${parts[0]}" is invalid. Priority must be an integer between 0 and 65535.`,
          evidence: raw,
          recommendation: 'Update MX record with a valid integer priority.',
          createdAt: new Date().toISOString()
        });
      }

      if (!DNSSyntaxValidation.isValidHostname(exchange)) {
        hasMalformed = true;
        findings.push({
          severity: 'CRITICAL',
          category: 'SECURITY_MX',
          title: 'Invalid MX Exchange Hostname',
          description: `The MX target hostname "${exchange}" is syntactically invalid.`,
          evidence: raw,
          recommendation: 'Ensure MX points to a valid fully qualified domain name (not an IP address).',
          createdAt: new Date().toISOString()
        });
      }

      // Passive resolution check of exchange hostname
      let resolvable = false;
      try {
        const ips = await runWithTimeout(() => resolver.resolve4(exchange), 3000);
        resolvable = ips && ips.length > 0;
      } catch (err: any) {
        try {
          const ips6 = await runWithTimeout(() => resolver.resolve6(exchange), 2000);
          resolvable = ips6 && ips6.length > 0;
        } catch {
          resolvable = false;
        }
      }

      if (!resolvable) {
        hasUnresolvable = true;
        findings.push({
          severity: 'CRITICAL',
          category: 'SECURITY_MX',
          title: 'Unresolvable MX Target',
          description: `The mail exchange target "${exchange}" does not resolve to any IPv4 or IPv6 address. Inbound emails will bounce.`,
          evidence: `MX: ${priority} ${exchange} -> Unresolvable`,
          recommendation: `Verify that ${exchange} has active A/AAAA DNS records.`,
          createdAt: new Date().toISOString()
        });
      }

      records.push({
        exchange,
        priority: isNaN(priority) ? 0 : priority,
        resolvable
      });
    }

    const status = hasMalformed || hasUnresolvable ? 'ERROR' : 'VALID';

    return {
      status,
      records,
      findings,
      details: `${records.length} MX record(s) verified. All targets resolvable: ${!hasUnresolvable}`
    };
  }
}

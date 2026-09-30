import { Resolver } from 'dns/promises';
import { Finding } from '../../shared/index.js';
import { DNSSyntaxValidation } from './dnsSyntaxValidation.js';
import { runWithTimeout } from '../../utils/concurrency.js';
import { logger } from '../../utils/logger.js';

export interface CNAMEValidationResult {
  status: 'VALID' | 'WARNING' | 'CRITICAL' | 'N/A';
  dangling: boolean;
  target?: string;
  findings: Finding[];
  details: string;
}

export class CNAMEValidation {
  public static async validate(
    domain: string,
    cnameAnswers: string[],
    resolverIps = ['8.8.8.8', '1.1.1.1']
  ): Promise<CNAMEValidationResult> {
    const findings: Finding[] = [];

    if (!cnameAnswers || cnameAnswers.length === 0) {
      return {
        status: 'N/A',
        dangling: false,
        findings: [],
        details: 'No CNAME record present on this domain/subdomain.'
      };
    }

    const rawTarget = cnameAnswers[0].trim();
    const cleanTarget = rawTarget.replace(/\.+$/, '');

    // Validate syntax
    if (!DNSSyntaxValidation.isValidHostname(cleanTarget)) {
      findings.push({
        severity: 'CRITICAL',
        category: 'SECURITY_CNAME',
        title: 'Invalid CNAME Target Syntax',
        description: `The canonical target "${cleanTarget}" is not a syntactically valid fully qualified domain name.`,
        evidence: `${domain} -> ${rawTarget}`,
        recommendation: 'Update the CNAME record to point to a valid domain name.',
        createdAt: new Date().toISOString()
      });

      return {
        status: 'CRITICAL',
        dangling: true,
        target: cleanTarget,
        findings,
        details: 'CNAME target contains invalid hostname syntax.'
      };
    }

    // Passive resolution check (safe, passive DNS lookup only - NO exploitation)
    const resolver = new Resolver();
    resolver.setServers(resolverIps);

    let targetResolves = false;
    let isNxDomain = false;

    try {
      const a: any = await runWithTimeout(() => resolver.resolve4(cleanTarget), 3000);
      targetResolves = Boolean(a && Array.isArray(a) && a.length > 0);
    } catch (err: any) {
      if (err.code === 'NXDOMAIN') {
        isNxDomain = true;
      }
      // Try AAAA
      try {
        const aaaa: any = await runWithTimeout(() => resolver.resolve6(cleanTarget), 2000);
        targetResolves = Boolean(aaaa && Array.isArray(aaaa) && aaaa.length > 0);
      } catch (err6: any) {
        if (err6.code === 'NXDOMAIN') {
          isNxDomain = true;
        }
        // Try CNAME chain
        try {
          const c: any = await runWithTimeout(() => resolver.resolveCname(cleanTarget), 2000);
          targetResolves = Boolean(c && (Array.isArray(c) ? c.length > 0 : Boolean(c)));
        } catch (errCname: any) {
          if (errCname.code === 'NXDOMAIN') {
            isNxDomain = true;
          }
        }
      }
    }

    if (!targetResolves) {
      findings.push({
        severity: 'CRITICAL',
        category: 'SECURITY_CNAME',
        title: 'Potential Dangling CNAME Detected',
        description: `The CNAME target "${cleanTarget}" does not resolve to any active IP address or canonical record${
          isNxDomain ? ' (target returned NXDOMAIN)' : ''
        }. This indicates stale infrastructure configuration and carries high takeover risk.`,
        evidence: `${domain} -> ${cleanTarget} (NXDOMAIN / Unresolved)`,
        recommendation:
          'Verify whether the target service or bucket still exists. Immediately remove or re-point the CNAME if the upstream cloud service has been decommissioned.',
        createdAt: new Date().toISOString()
      });

      return {
        status: 'CRITICAL',
        dangling: true,
        target: cleanTarget,
        findings,
        details: `CRITICAL: CNAME target "${cleanTarget}" does not resolve. Potential dangling CNAME.`
      };
    }

    return {
      status: 'VALID',
      dangling: false,
      target: cleanTarget,
      findings,
      details: `CNAME properly points to active target "${cleanTarget}".`
    };
  }
}

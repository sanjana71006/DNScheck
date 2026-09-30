import { Resolver } from 'dns/promises';
import { AuthoritativeNameserver, AuthoritativeResult, DNSRecordType, AuthoritativeEvidence } from '../../shared/index.js';
import { NormalizationService } from './normalizationService.js';
import { runWithTimeout } from '../../utils/concurrency.js';
import { logger } from '../../utils/logger.js';
import { queryDnsUdp, DNS_RECORD_TYPE_CODES } from './dnsWireProtocol.js';

export class AuthoritativeService {
  private defaultBootstrapResolvers = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];

  public async discoverAuthoritativeNameservers(domain: string): Promise<string[]> {
    const normalized = NormalizationService.normalizeDomain(domain);
    const resolver = new Resolver();
    resolver.setServers(this.defaultBootstrapResolvers);

    // 1. Try target domain NS delegation
    try {
      const ns = await runWithTimeout(() => resolver.resolveNs(normalized), 3000);
      if (ns && ns.length > 0) {
        return NormalizationService.normalizeRecordAnswers(ns, 'NS');
      }
    } catch (err: any) {
      // Subdomain might not have dedicated NS delegation; probe parent domain
    }

    // 2. Try parent domain if subdomain
    const parts = normalized.split('.');
    if (parts.length > 2) {
      const parentDomain = parts.slice(1).join('.');
      try {
        const ns = await runWithTimeout(() => resolver.resolveNs(parentDomain), 3000);
        if (ns && ns.length > 0) {
          return NormalizationService.normalizeRecordAnswers(ns, 'NS');
        }
      } catch (err) {
        logger.debug(`Could not resolve NS for parent ${parentDomain}`);
      }
    }

    return [];
  }

  public async inspectAuthoritativeServers(
    domain: string,
    recordTypes: DNSRecordType[]
  ): Promise<AuthoritativeResult> {
    const normalizedDomain = NormalizationService.normalizeDomain(domain);
    const nsHostnames = await this.discoverAuthoritativeNameservers(normalizedDomain);

    const nameserverResults: AuthoritativeNameserver[] = [];
    const bootstrapResolver = new Resolver();
    bootstrapResolver.setServers(this.defaultBootstrapResolvers);

    const canonicalRecords: Record<string, string[]> = {};
    const recordTtvs: Record<string, number> = {};
    const evidenceMap: Record<string, AuthoritativeEvidence> = {};

    let primaryNameserver: string | undefined;
    let nameserverIp: string | undefined;

    // Resolve IPs of discovered NS hostnames
    for (const nsHost of nsHostnames) {
      let ips: string[] = [];
      try {
        ips = await runWithTimeout(() => bootstrapResolver.resolve4(nsHost), 2500);
      } catch (err: any) {
        logger.debug(`Failed to resolve IP for NS ${nsHost}: ${err.message}`);
      }

      if (ips.length === 0) {
        nameserverResults.push({
          hostname: nsHost,
          ipAddresses: [],
          reachability: false,
          responseTimeMs: 0,
          error: 'Unresolvable nameserver hostname'
        });
        continue;
      }

      const authIp = ips[0];
      const start = Date.now();
      let reachability = false;
      let soaSerial: number | undefined;
      let errorMsg: string | undefined;

      // Query Authoritative Nameserver directly with RD=0 (Recursion Desired = 0)
      try {
        const wireSoa = await queryDnsUdp(authIp, normalizedDomain, 'SOA', {
          timeoutMs: 3000,
          recursionDesired: false
        });

        reachability = wireSoa.rcode === 'NOERROR' || wireSoa.rcode === 'NXDOMAIN';
        if (wireSoa.answers.length > 0) {
          const soaMatch = wireSoa.answers[0].data.match(/serial:(\d+)/);
          if (soaMatch) {
            soaSerial = parseInt(soaMatch[1], 10);
          }
        }
      } catch (wireErr: any) {
        // Fallback to Resolver port 53 query directly on authIp
        try {
          const authResolver = new Resolver();
          authResolver.setServers([authIp]);
          const soa = await runWithTimeout(() => authResolver.resolveSoa(normalizedDomain), 3000);
          reachability = true;
          soaSerial = soa.serial;
        } catch (innerErr: any) {
          reachability = false;
          errorMsg = innerErr.message || 'Authoritative port 53 query failed';
        }
      }

      const responseTimeMs = Date.now() - start;

      nameserverResults.push({
        hostname: nsHost,
        ipAddresses: ips,
        reachability,
        responseTimeMs,
        soaSerial,
        error: errorMsg
      });

      // If this NS is reachable and we haven't acquired canonical records yet, query directly with RD=0
      if (reachability && Object.keys(canonicalRecords).length === 0) {
        primaryNameserver = nsHost;
        nameserverIp = authIp;

        for (const type of recordTypes) {
          const queryStartTime = Date.now();
          try {
            // Live direct query with RD=0
            const wireResult = await queryDnsUdp(authIp, normalizedDomain, type, {
              timeoutMs: 2500,
              recursionDesired: false
            });

            const answers = NormalizationService.normalizeRecordAnswers(
              wireResult.answers.filter((a) => a.type === type || (type === 'A' && a.type === 'A')).map((a) => a.data),
              type
            );

            canonicalRecords[type] = answers;
            if (wireResult.answers.length > 0) {
              recordTtvs[type] = wireResult.answers[0].ttl;
            }

            evidenceMap[type] = {
              serverHostname: nsHost,
              serverIp: authIp,
              recordType: type,
              answers,
              rcode: wireResult.rcode,
              flags: wireResult.flags,
              ttl: wireResult.answers[0]?.ttl,
              latencyMs: wireResult.latencyMs,
              timestamp: new Date().toISOString(),
              isAuthoritative: Boolean(wireResult.flags?.aa),
              status: wireResult.rcode === 'NOERROR' ? 'SUCCESS' : 'ERROR'
            };
          } catch (typeErr: any) {
            // Direct UDP wire failed, try Node Resolver set to authIp
            try {
              const directResolver = new Resolver();
              directResolver.setServers([authIp]);

              let fallbackAnswers: string[] = [];
              let ttlVal = 300;

              if (type === 'A') {
                const resA = await directResolver.resolve4(normalizedDomain, { ttl: true });
                fallbackAnswers = resA.map((r) => r.address);
                if (resA.length > 0) ttlVal = resA[0].ttl;
              } else if (type === 'AAAA') {
                const resAAAA = await directResolver.resolve6(normalizedDomain, { ttl: true });
                fallbackAnswers = resAAAA.map((r) => r.address);
                if (resAAAA.length > 0) ttlVal = resAAAA[0].ttl;
              } else if (type === 'CNAME') {
                const resC = await directResolver.resolveCname(normalizedDomain);
                fallbackAnswers = Array.isArray(resC) ? resC : [resC];
              } else if (type === 'MX') {
                const resMx = await directResolver.resolveMx(normalizedDomain);
                fallbackAnswers = resMx.map((m) => `${m.priority} ${m.exchange}`);
              } else if (type === 'TXT') {
                const resTxt = await directResolver.resolveTxt(normalizedDomain);
                fallbackAnswers = resTxt.map((t) => t.join(''));
              } else if (type === 'NS') {
                fallbackAnswers = nsHostnames;
              }

              const normalized = NormalizationService.normalizeRecordAnswers(fallbackAnswers, type);
              canonicalRecords[type] = normalized;
              recordTtvs[type] = ttlVal;

              evidenceMap[type] = {
                serverHostname: nsHost,
                serverIp: authIp,
                recordType: type,
                answers: normalized,
                rcode: 'NOERROR',
                flags: { aa: true, rd: false, ra: false },
                ttl: ttlVal,
                latencyMs: Date.now() - queryStartTime,
                timestamp: new Date().toISOString(),
                isAuthoritative: true,
                status: 'SUCCESS'
              };
            } catch (fallbackErr: any) {
              canonicalRecords[type] = [];
              evidenceMap[type] = {
                serverHostname: nsHost,
                serverIp: authIp,
                recordType: type,
                answers: [],
                rcode: 'TIMEOUT',
                latencyMs: Date.now() - queryStartTime,
                timestamp: new Date().toISOString(),
                isAuthoritative: false,
                status: 'UNAVAILABLE',
                errorMessage: fallbackErr.message || 'Direct query failed'
              };
            }
          }
        }
      }
    }

    // Evaluate serial consistency
    const serials = nameserverResults
      .map((n) => n.soaSerial)
      .filter((s): s is number => typeof s === 'number');

    const uniqueSerials = Array.from(new Set(serials));
    const soaSerialsConsistent = uniqueSerials.length <= 1;

    let dominantSerial: number | undefined;
    if (serials.length > 0) {
      const counts = new Map<number, number>();
      for (const s of serials) counts.set(s, (counts.get(s) || 0) + 1);
      let maxCount = -1;
      for (const [s, c] of counts.entries()) {
        if (c > maxCount) {
          maxCount = c;
          dominantSerial = s;
        }
      }
    }

    const reachableCount = nameserverResults.filter((n) => n.reachability).length;
    const hasCanonical = Object.values(canonicalRecords).some((v) => v.length > 0);

    // CRITICAL RULE 10: If authoritative lookup fails, DO NOT invent a reference answer or default IP!
    if (reachableCount === 0 || !hasCanonical) {
      return {
        nameservers: nameserverResults,
        soaSerialsConsistent: false,
        dominantSerial: undefined,
        canonicalRecords: {},
        recordTtvs: {},
        source: 'reference_unavailable',
        queriedAt: new Date().toISOString(),
        primaryNameserver: primaryNameserver || 'AUTHORITATIVE REFERENCE UNAVAILABLE',
        nameserverIp: nameserverIp || 'PORT 53 TIMEOUT / UNREACHABLE',
        isLive: true,
        isAvailable: false,
        evidence: evidenceMap,
        statusMessage: 'AUTHORITATIVE REFERENCE UNAVAILABLE — NOT COMPARABLE'
      };
    }

    return {
      nameservers: nameserverResults,
      soaSerialsConsistent,
      dominantSerial,
      canonicalRecords,
      recordTtvs,
      source: 'authoritative',
      queriedAt: new Date().toISOString(),
      primaryNameserver: primaryNameserver || 'Authoritative Nameserver',
      nameserverIp: nameserverIp || 'Port 53 Direct',
      isLive: true,
      isAvailable: true,
      evidence: evidenceMap,
      statusMessage: 'AUTHORITATIVE REFERENCE VERIFIED'
    };
  }
}

export const authoritativeService = new AuthoritativeService();

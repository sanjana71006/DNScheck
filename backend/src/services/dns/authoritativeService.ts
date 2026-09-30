import { Resolver } from 'dns/promises';
import { AuthoritativeNameserver, AuthoritativeResult, DNSRecordType } from '../../shared/index.js';
import { NormalizationService } from './normalizationService.js';
import { runWithTimeout } from '../../utils/concurrency.js';
import { logger } from '../../utils/logger.js';

export class AuthoritativeService {
  private defaultResolvers = ['8.8.8.8', '1.1.1.1', '9.9.9.9'];

  public async discoverAuthoritativeNameservers(domain: string): Promise<string[]> {
    const normalized = NormalizationService.normalizeDomain(domain);
    const resolver = new Resolver();
    resolver.setServers(this.defaultResolvers);

    // Try target domain first
    try {
      const ns = await runWithTimeout(() => resolver.resolveNs(normalized), 3000);
      if (ns && ns.length > 0) {
        return NormalizationService.normalizeRecordAnswers(ns, 'NS');
      }
    } catch (err: any) {
      // Subdomain might not have dedicated NS delegation, try parent domain
    }

    // Try parent domain if subdomain
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
    const resolver = new Resolver();
    resolver.setServers(this.defaultResolvers);

    const canonicalRecords: Record<string, string[]> = {};
    const recordTtvs: Record<string, number> = {};
    let primaryNameserver: string | undefined;
    let nameserverIp: string | undefined;

    for (const nsHost of nsHostnames) {
      let ips: string[] = [];
      try {
        ips = await runWithTimeout(() => resolver.resolve4(nsHost), 2500);
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

      // Query authoritative server directly via its first IP
      const authIp = ips[0];
      const authResolver = new Resolver();
      try {
        authResolver.setServers([authIp]);
      } catch (e: any) {
        nameserverResults.push({
          hostname: nsHost,
          ipAddresses: ips,
          reachability: false,
          responseTimeMs: 0,
          error: `Invalid IP: ${e.message}`
        });
        continue;
      }

      const start = Date.now();
      let reachability = false;
      let soaSerial: number | undefined;
      let errorMsg: string | undefined;

      try {
        const soa = await runWithTimeout(() => authResolver.resolveSoa(normalizedDomain), 3000);
        reachability = true;
        soaSerial = soa.serial;
      } catch (err: any) {
        // SOA might be on zone apex if this is a subdomain
        try {
          const parts = normalizedDomain.split('.');
          const apex = parts.length > 2 ? parts.slice(1).join('.') : normalizedDomain;
          const soa = await runWithTimeout(() => authResolver.resolveSoa(apex), 3000);
          reachability = true;
          soaSerial = soa.serial;
        } catch (innerErr: any) {
          reachability = false;
          errorMsg = innerErr.message || 'Authoritative query failed';
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

      // If we don't have canonical records yet and this NS is reachable, query requested record types
      if (reachability && Object.keys(canonicalRecords).length === 0) {
        primaryNameserver = nsHost;
        nameserverIp = authIp;
        for (const type of recordTypes) {
          try {
            switch (type) {
              case 'A': {
                const a = await authResolver.resolve4(normalizedDomain, { ttl: true });
                canonicalRecords['A'] = NormalizationService.normalizeRecordAnswers(
                  a.map((r) => r.address),
                  'A'
                );
                if (a.length > 0) recordTtvs['A'] = a[0].ttl;
                break;
              }
              case 'AAAA': {
                const aaaa = await authResolver.resolve6(normalizedDomain, { ttl: true });
                canonicalRecords['AAAA'] = NormalizationService.normalizeRecordAnswers(
                  aaaa.map((r) => r.address),
                  'AAAA'
                );
                if (aaaa.length > 0) recordTtvs['AAAA'] = aaaa[0].ttl;
                break;
              }
              case 'CNAME': {
                const cname = await authResolver.resolveCname(normalizedDomain);
                canonicalRecords['CNAME'] = NormalizationService.normalizeRecordAnswers(
                  Array.isArray(cname) ? cname : [cname],
                  'CNAME'
                );
                recordTtvs['CNAME'] = 300;
                break;
              }
              case 'MX': {
                const mx = await authResolver.resolveMx(normalizedDomain);
                canonicalRecords['MX'] = NormalizationService.normalizeRecordAnswers(
                  mx.map((m) => `${m.priority} ${m.exchange}`),
                  'MX'
                );
                recordTtvs['MX'] = 300;
                break;
              }
              case 'TXT': {
                const txt = await authResolver.resolveTxt(normalizedDomain);
                canonicalRecords['TXT'] = NormalizationService.normalizeRecordAnswers(
                  txt.map((t) => t.join('')),
                  'TXT'
                );
                recordTtvs['TXT'] = 300;
                break;
              }
              case 'NS': {
                canonicalRecords['NS'] = NormalizationService.normalizeRecordAnswers(nsHostnames, 'NS');
                recordTtvs['NS'] = 300;
                break;
              }
              case 'SOA': {
                if (soaSerial) {
                  canonicalRecords['SOA'] = [`serial:${soaSerial}`];
                  recordTtvs['SOA'] = 300;
                }
                break;
              }
            }
          } catch (typeErr) {
            canonicalRecords[type] = [];
          }
        }
      }
    }

    // Fallback: If canonical records are missing/empty, query high-reliability resolvers (8.8.8.8, 1.1.1.1)
    const hasAnyCanonical = Object.values(canonicalRecords).some((v) => v.length > 0);
    if (!hasAnyCanonical) {
      const fallbackResolver = new Resolver();
      fallbackResolver.setServers(this.defaultResolvers);
      for (const type of recordTypes) {
        try {
          switch (type) {
            case 'A': {
              const a = await runWithTimeout(() => fallbackResolver.resolve4(normalizedDomain, { ttl: true }), 2500);
              if (a && a.length > 0) {
                canonicalRecords['A'] = NormalizationService.normalizeRecordAnswers(
                  a.map((r) => r.address),
                  'A'
                );
                recordTtvs['A'] = a[0].ttl;
              }
              break;
            }
            case 'AAAA': {
              const aaaa: any = await runWithTimeout(() => fallbackResolver.resolve6(normalizedDomain, { ttl: true }), 2500);
              if (aaaa && Array.isArray(aaaa) && aaaa.length > 0) {
                canonicalRecords['AAAA'] = NormalizationService.normalizeRecordAnswers(
                  aaaa.map((r: any) => r.address),
                  'AAAA'
                );
                recordTtvs['AAAA'] = aaaa[0].ttl;
              }
              break;
            }
            case 'MX': {
              const mx: any = await runWithTimeout(() => fallbackResolver.resolveMx(normalizedDomain), 2500);
              if (mx && Array.isArray(mx) && mx.length > 0) {
                canonicalRecords['MX'] = NormalizationService.normalizeRecordAnswers(
                  mx.map((m: any) => `${m.priority} ${m.exchange}`),
                  'MX'
                );
                recordTtvs['MX'] = 300;
              }
              break;
            }
            case 'TXT': {
              const txt: any = await runWithTimeout(() => fallbackResolver.resolveTxt(normalizedDomain), 2500);
              if (txt && Array.isArray(txt) && txt.length > 0) {
                canonicalRecords['TXT'] = NormalizationService.normalizeRecordAnswers(
                  txt.map((t: any) => (Array.isArray(t) ? t.join('') : String(t))),
                  'TXT'
                );
                recordTtvs['TXT'] = 300;
              }
              break;
            }
            case 'NS': {
              if (nsHostnames.length > 0) {
                canonicalRecords['NS'] = NormalizationService.normalizeRecordAnswers(nsHostnames, 'NS');
                recordTtvs['NS'] = 300;
              }
              break;
            }
            case 'CNAME': {
              const cname = await runWithTimeout(() => fallbackResolver.resolveCname(normalizedDomain), 2500);
              if (cname) {
                canonicalRecords['CNAME'] = NormalizationService.normalizeRecordAnswers(
                  Array.isArray(cname) ? cname : [cname],
                  'CNAME'
                );
                recordTtvs['CNAME'] = 300;
              }
              break;
            }
          }
        } catch (e) {
          // Record type not published for domain
        }
      }
    }

    // Evaluate serial consistency
    const serials = nameserverResults
      .map((n) => n.soaSerial)
      .filter((s): s is number => typeof s === 'number');

    const uniqueSerials = Array.from(new Set(serials));
    const soaSerialsConsistent = uniqueSerials.length <= 1;

    // Find dominant serial
    let dominantSerial: number | undefined;
    if (serials.length > 0) {
      const counts = new Map<number, number>();
      for (const s of serials) {
        counts.set(s, (counts.get(s) || 0) + 1);
      }
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
    const source = reachableCount > 0 && hasAnyCanonical ? 'authoritative' : 'consensus_fallback';

    if (!primaryNameserver && nsHostnames.length > 0) {
      primaryNameserver = nsHostnames[0];
      const matchingNs = nameserverResults.find((n) => n.hostname === primaryNameserver);
      nameserverIp = matchingNs?.ipAddresses?.[0] || '8.8.8.8';
    }

    return {
      nameservers: nameserverResults,
      soaSerialsConsistent,
      dominantSerial,
      canonicalRecords,
      recordTtvs,
      source,
      queriedAt: new Date().toISOString(),
      primaryNameserver: primaryNameserver || 'Authoritative Nameservers',
      nameserverIp: nameserverIp || 'Standard Port 53',
      isLive: true
    };
  }
}

export const authoritativeService = new AuthoritativeService();

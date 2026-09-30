import { Resolver } from 'dns/promises';
import { DNSRecordType, QueryStatus, ResolverQueryResult } from '../../shared/index.js';
import { ENV } from '../../config/env.js';
import { dnsConcurrencyLimit, runWithTimeout } from '../../utils/concurrency.js';
import { logger } from '../../utils/logger.js';

interface CacheEntry {
  answers: string[];
  ttl?: number;
  status: QueryStatus;
  responseTimeMs: number;
  error?: string;
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
    useCache = ENV.CACHE_ENABLED
  ): Promise<{
    answers: string[];
    ttl?: number;
    responseTimeMs: number;
    status: QueryStatus;
    error?: string;
  }> {
    const cacheKey = this.getCacheKey(domain, recordType, resolverIp);
    const now = Date.now();

    if (useCache && dnsCache.has(cacheKey)) {
      const entry = dnsCache.get(cacheKey)!;
      if (entry.expiresAt > now) {
        return {
          answers: [...entry.answers],
          ttl: entry.ttl,
          responseTimeMs: entry.responseTimeMs,
          status: entry.status,
          error: entry.error
        };
      } else {
        dnsCache.delete(cacheKey);
      }
    }

    return dnsConcurrencyLimit(async () => {
      const resolver = new Resolver();
      try {
        resolver.setServers([resolverIp]);
      } catch (err: any) {
        return {
          answers: [],
          responseTimeMs: 0,
          status: 'ERROR',
          error: `Invalid resolver IP ${resolverIp}: ${err.message}`
        };
      }

      const start = Date.now();
      let answers: string[] = [];
      let ttl: number | undefined;
      let status: QueryStatus = 'SUCCESS';
      let errorMsg: string | undefined;

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
                ttl = 300;
                break;
              }
              case 'MX': {
                const res: any = await resolver.resolveMx(domain);
                answers = Array.isArray(res) ? res.map((r: any) => `${r.priority} ${r.exchange}`) : [];
                ttl = 300;
                break;
              }
              case 'TXT': {
                const res: any = await resolver.resolveTxt(domain);
                answers = Array.isArray(res) ? res.map((parts: any) => (Array.isArray(parts) ? parts.join('') : String(parts))) : [];
                ttl = 300;
                break;
              }
              case 'NS': {
                const res = await resolver.resolveNs(domain);
                answers = res;
                ttl = 300;
                break;
              }
              case 'SOA': {
                const res = await resolver.resolveSoa(domain);
                answers = [
                  `${res.nsname} ${res.hostmaster} ${res.serial} ${res.refresh} ${res.retry} ${res.expire} ${res.minttl}`
                ];
                ttl = res.minttl;
                break;
              }
              default:
                throw new Error(`Unsupported record type: ${recordType}`);
            }
          },
          this.timeoutMs,
          `Resolver ${resolverIp} timed out after ${this.timeoutMs}ms`
        );
      } catch (err: any) {
        const code = err.code || '';
        if (code === 'ENOTFOUND' || code === 'NODATA' || code === 'ENODATA') {
          status = 'SUCCESS'; // Valid query, empty answers
          answers = [];
        } else if (code === 'NXDOMAIN') {
          status = 'NXDOMAIN';
          errorMsg = 'Domain does not exist (NXDOMAIN)';
        } else if (code === 'SERVFAIL') {
          status = 'SERVFAIL';
          errorMsg = 'Server failure (SERVFAIL)';
        } else if (code === 'TIMEOUT' || err.message?.includes('timed out')) {
          status = 'TIMEOUT';
          errorMsg = `DNS query timed out after ${this.timeoutMs}ms`;
        } else {
          status = 'ERROR';
          errorMsg = err.message || 'DNS query failed';
        }
      }

      const responseTimeMs = Date.now() - start;

      const result = {
        answers,
        ttl,
        responseTimeMs,
        status,
        error: errorMsg
      };

      if (useCache && status !== 'ERROR' && status !== 'TIMEOUT') {
        const cacheTtlSeconds = ttl ? Math.min(ttl, ENV.CACHE_TTL_SECONDS) : ENV.CACHE_TTL_SECONDS;
        dnsCache.set(cacheKey, {
          ...result,
          expiresAt: Date.now() + Math.max(cacheTtlSeconds, 10) * 1000
        });
      }

      return result;
    });
  }
}

export const dnsResolverService = new DNSResolverService();

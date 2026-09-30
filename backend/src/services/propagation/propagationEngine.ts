import {
  DNSRecordType,
  ResolverQueryResult,
  RecordPropagationSummary,
  AuthoritativeResult
} from '../../shared/index.js';
import { NormalizationService } from '../dns/normalizationService.js';

export class PropagationEngine {
  public static calculateRecordPropagation(
    recordType: DNSRecordType,
    canonicalAnswers: string[],
    resolverResults: ResolverQueryResult[],
    source: 'authoritative' | 'consensus_fallback'
  ): {
    summary: RecordPropagationSummary;
    evaluatedResults: ResolverQueryResult[];
  } {
    let canonical = NormalizationService.normalizeRecordAnswers(canonicalAnswers, recordType);

    // If authoritative reference is missing/empty, find consensus among resolvers
    if (canonical.length === 0 && resolverResults.length > 0) {
      const successfulGroups = new Map<string, { count: number; answers: string[] }>();
      for (const res of resolverResults) {
        if (res.status === 'SUCCESS' && res.answers.length > 0) {
          const normKey = NormalizationService.normalizeRecordAnswers(res.answers, recordType).join('::');
          const existing = successfulGroups.get(normKey);
          if (existing) {
            existing.count++;
          } else {
            successfulGroups.set(normKey, { count: 1, answers: res.answers });
          }
        }
      }

      let maxCount = 0;
      for (const group of successfulGroups.values()) {
        if (group.count > maxCount) {
          maxCount = group.count;
          canonical = NormalizationService.normalizeRecordAnswers(group.answers, recordType);
        }
      }
    }

    let matching = 0;
    let mismatching = 0;
    let failing = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    const evaluatedResults: ResolverQueryResult[] = resolverResults.map((result) => {
      const normalizedAnswers = NormalizationService.normalizeRecordAnswers(result.answers, recordType);

      if (result.responseTimeMs > 0) {
        totalLatency += result.responseTimeMs;
        latencyCount++;
      }

      if (result.status !== 'SUCCESS' && result.status !== 'MATCH') {
        failing++;
        return {
          ...result,
          status: result.status,
          normalizedAnswers,
          matchesCanonical: false,
          evidenceTag: result.evidenceTag || 'LIVE_QUERY',
          whyDifferent: {
            authoritativeAnswer: canonical,
            resolverAnswer: [],
            ttlReported: result.ttl,
            checkedAt: result.checkedAt,
            authoritativeSource: source === 'authoritative' ? 'Authoritative DNS' : 'Consensus Reference',
            possibleCauses: [
              `Resolver query returned ${result.status}`,
              result.error || 'Query failed or timed out reaching recursive resolver'
            ]
          }
        };
      }

      const isMatch = NormalizationService.areRecordSetsEqual(normalizedAnswers, canonical, recordType);

      if (isMatch) {
        matching++;
        return {
          ...result,
          status: 'MATCH' as const,
          normalizedAnswers,
          matchesCanonical: true,
          evidenceTag: result.evidenceTag || 'LIVE_QUERY'
        };
      } else {
        mismatching++;
        const possibleCauses: string[] = [];
        if (result.ttl !== undefined && result.ttl > 0) {
          possibleCauses.push(`Resolver Cache: ${result.ttl}s TTL remaining on cached response.`);
        }
        possibleCauses.push('CDN / Anycast GeoDNS: Resolvers in different regions receive localized IP pools or load balancers.');
        possibleCauses.push('Multi-Record Pool: Nameservers serve varying subsets from a dynamic record cluster.');

        return {
          ...result,
          status: 'DIFFERENT' as const,
          normalizedAnswers,
          matchesCanonical: false,
          evidenceTag: result.evidenceTag || 'LIVE_QUERY',
          whyDifferent: {
            authoritativeAnswer: canonical,
            resolverAnswer: normalizedAnswers,
            ttlReported: result.ttl,
            checkedAt: result.checkedAt,
            authoritativeSource: source === 'authoritative' ? 'Authoritative DNS' : 'Consensus Reference',
            possibleCauses
          }
        };
      }
    });

    const totalResolvers = resolverResults.length;
    const propagationPercentage = totalResolvers > 0 ? Math.round((matching / totalResolvers) * 1000) / 10 : 0;
    const availabilityPercentage =
      totalResolvers > 0 ? Math.round(((totalResolvers - failing) / totalResolvers) * 1000) / 10 : 0;
    const averageLatencyMs = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

    const summary: RecordPropagationSummary = {
      recordType,
      canonicalValue: canonical,
      totalResolvers,
      matchingResolvers: matching,
      mismatchingResolvers: mismatching,
      failingResolvers: failing,
      propagationPercentage,
      availabilityPercentage,
      averageLatencyMs
    };

    return { summary, evaluatedResults };
  }
}

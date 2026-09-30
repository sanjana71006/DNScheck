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
    source: 'authoritative' | 'reference_unavailable' | 'consensus_fallback'
  ): {
    summary: RecordPropagationSummary;
    evaluatedResults: ResolverQueryResult[];
  } {
    const canonical = NormalizationService.normalizeRecordAnswers(canonicalAnswers, recordType);
    const isAuthoritativeAvailable = source === 'authoritative' && canonical.length > 0;

    // RULE 10: If authoritative reference is unavailable, DO NOT invent a reference answer!
    if (!isAuthoritativeAvailable) {
      const evaluatedResults: ResolverQueryResult[] = resolverResults.map((result) => {
        const normalizedAnswers = NormalizationService.normalizeRecordAnswers(result.answers, recordType);
        return {
          ...result,
          status: result.status,
          normalizedAnswers,
          matchesCanonical: false,
          evidenceTag: result.evidenceTag || 'LIVE_QUERY',
          source: result.source || 'LIVE_DNS',
          whyDifferent: {
            authoritativeAnswer: [],
            resolverAnswer: normalizedAnswers,
            ttlReported: result.ttl,
            checkedAt: result.checkedAt,
            authoritativeSource: 'AUTHORITATIVE REFERENCE UNAVAILABLE',
            possibleCauses: [
              'Authoritative nameservers did not provide a verified reference set.',
              'Comparison is marked NOT COMPARABLE.'
            ]
          }
        };
      });

      const totalResolvers = resolverResults.length;
      const successfulResolvers = resolverResults.filter((r) => r.status === 'SUCCESS').length;
      const failingResolvers = totalResolvers - successfulResolvers;

      const summary: RecordPropagationSummary = {
        recordType,
        canonicalValue: [],
        totalResolvers,
        matchingResolvers: 0,
        mismatchingResolvers: 0,
        failingResolvers,
        propagationPercentage: 0,
        availabilityPercentage:
          totalResolvers > 0 ? Math.round((successfulResolvers / totalResolvers) * 1000) / 10 : 0,
        averageLatencyMs: 0,
        isComparable: false,
        statusMessage: 'AUTHORITATIVE REFERENCE UNAVAILABLE — NOT COMPARABLE'
      };

      return { summary, evaluatedResults };
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

      // Check for query failure
      if (
        result.status === 'TIMEOUT' ||
        result.status === 'SERVFAIL' ||
        result.status === 'ERROR' ||
        result.status === 'REFUSED' ||
        result.status === 'NXDOMAIN'
      ) {
        failing++;
        return {
          ...result,
          status: result.status,
          normalizedAnswers,
          matchesCanonical: false,
          evidenceTag: result.evidenceTag || 'LIVE_QUERY',
          source: 'LIVE_DNS',
          whyDifferent: {
            authoritativeAnswer: canonical,
            resolverAnswer: [],
            ttlReported: result.ttl,
            checkedAt: result.checkedAt,
            authoritativeSource: 'Authoritative Nameserver (Port 53 Direct)',
            possibleCauses: [
              `Query returned ${result.status}`,
              result.error || 'Recursive query failed to complete'
            ]
          }
        };
      }

      // Order-independent Set Comparison
      const isMatch = NormalizationService.areRecordSetsEqual(normalizedAnswers, canonical, recordType);

      if (isMatch) {
        matching++;
        return {
          ...result,
          status: 'MATCH' as const,
          normalizedAnswers,
          matchesCanonical: true,
          evidenceTag: result.evidenceTag || 'LIVE_QUERY',
          source: 'LIVE_DNS'
        };
      } else {
        mismatching++;
        const possibleCauses: string[] = [];
        if (result.ttl !== undefined && result.ttl > 0) {
          possibleCauses.push(`Resolver Cache Decay: ${result.ttl}s remaining TTL on cached response.`);
        }
        possibleCauses.push('CDN / Anycast GeoDNS: Resolvers in different regions legitimately receive distinct IP pools.');
        possibleCauses.push('Multi-Record Pool: Server pool rotation delivers alternative healthy addresses.');

        // RULE 9: Label as DIFFERENT RESPONSE, never automatically claim STALE
        return {
          ...result,
          status: 'DIFFERENT' as const,
          normalizedAnswers,
          matchesCanonical: false,
          evidenceTag: result.evidenceTag || 'LIVE_QUERY',
          source: 'LIVE_DNS',
          whyDifferent: {
            authoritativeAnswer: canonical,
            resolverAnswer: normalizedAnswers,
            ttlReported: result.ttl,
            checkedAt: result.checkedAt,
            authoritativeSource: 'Authoritative Nameserver (Port 53 Direct)',
            possibleCauses
          }
        };
      }
    });

    const totalResolvers = resolverResults.length;
    const successfulResolvers = matching + mismatching;

    // RULE 8: Propagation / Convergence = Matching / Successful resolvers
    const propagationPercentage =
      successfulResolvers > 0 ? Math.round((matching / successfulResolvers) * 1000) / 10 : 0;

    // Availability = Successful / Total Configured
    const availabilityPercentage =
      totalResolvers > 0 ? Math.round((successfulResolvers / totalResolvers) * 1000) / 10 : 0;

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
      averageLatencyMs,
      isComparable: true,
      statusMessage: `${matching}/${successfulResolvers} Vantages Converged (${propagationPercentage}%)`
    };

    return { summary, evaluatedResults };
  }
}

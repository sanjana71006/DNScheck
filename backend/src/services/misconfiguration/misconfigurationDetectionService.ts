import { Finding, AuthoritativeResult, ResolverQueryResult } from '../../shared/index.js';

export class MisconfigurationDetectionService {
  public static analyzeAuthoritativeConsistency(authResult: AuthoritativeResult): Finding[] {
    const findings: Finding[] = [];

    if (!authResult.soaSerialsConsistent) {
      const serialList = authResult.nameservers
        .map((ns) => `${ns.hostname} (serial: ${ns.soaSerial ?? 'N/A'})`)
        .join(', ');

      findings.push({
        severity: 'WARNING',
        category: 'AUTHORITATIVE',
        title: 'Authoritative SOA Serial Mismatch',
        description:
          'Authoritative nameservers report differing SOA serial numbers. This signifies zone synchronization lag between the primary and secondary nameservers.',
        evidence: serialList,
        recommendation:
          'Check zone transfer (AXFR/IXFR) replication status between primary and secondary authoritative nameservers.',
        createdAt: new Date().toISOString()
      });
    }

    // Check unreachable authoritative nameservers
    const unreachable = authResult.nameservers.filter((ns) => !ns.reachability);
    if (unreachable.length > 0) {
      findings.push({
        severity: unreachable.length === authResult.nameservers.length ? 'CRITICAL' : 'WARNING',
        category: 'AUTHORITATIVE',
        title: 'Unreachable Authoritative Nameservers',
        description: `${unreachable.length} authoritative nameserver(s) failed to respond to direct queries.`,
        evidence: unreachable.map((u) => `${u.hostname} (${u.error || 'timeout'})`).join(', '),
        recommendation:
          'Verify nameserver network reachability, firewall rules on UDP/TCP port 53, and NS delegation at the registrar.',
        createdAt: new Date().toISOString()
      });
    }

    return findings;
  }

  public static analyzePropagationConvergence(
    resolverResults: ResolverQueryResult[],
    propagationPercentage: number
  ): Finding[] {
    const findings: Finding[] = [];

    if (propagationPercentage < 100 && resolverResults.length > 0) {
      const mismatches = resolverResults.filter(
        (r) => r.status === 'MISMATCH' || (r.status === 'SUCCESS' && r.matchesCanonical === false)
      );

      const failures = resolverResults.filter((r) => r.status === 'TIMEOUT' || r.status === 'SERVFAIL');

      if (mismatches.length > 0) {
        findings.push({
          severity: propagationPercentage < 60 ? 'CRITICAL' : 'WARNING',
          category: 'PROPAGATION',
          title: 'Global DNS Propagation Incomplete',
          description: `${mismatches.length} resolver vantage point(s) are serving stale or non-converged DNS responses.`,
          evidence: mismatches
            .slice(0, 4)
            .map((m) => `${m.provider} (${m.locationLabel}): observed [${m.answers.join(', ')}]`)
            .join(' | '),
          recommendation:
            'Allow time for DNS TTL to expire at recursive resolvers, or initiate cache purging at upstream DNS providers.',
          createdAt: new Date().toISOString()
        });
      }

      if (failures.length > 0) {
        findings.push({
          severity: 'WARNING',
          category: 'AVAILABILITY',
          title: 'Resolver Vantage Query Failures',
          description: `${failures.length} resolver vantage point(s) encountered timeouts or server failures.`,
          evidence: failures.map((f) => `${f.provider} (${f.locationLabel}): ${f.status}`).join(', '),
          recommendation:
            'Review DNS resolver routing, rate-limits, and query packet drop rates.',
          createdAt: new Date().toISOString()
        });
      }
    }

    return findings;
  }

  public static analyzeTTLAbnormalities(ttl?: number): Finding[] {
    const findings: Finding[] = [];
    if (!ttl) return findings;

    if (ttl < 60) {
      findings.push({
        severity: 'INFO',
        category: 'PERFORMANCE',
        title: 'Very Low TTL (< 60s)',
        description: `TTL is configured to ${ttl} seconds. While this allows rapid updates, it increases resolver load and latency for end users.`,
        evidence: `TTL: ${ttl}s`,
        recommendation:
          'After migration or maintenance is complete, raise TTL to 300s - 3600s to optimize caching.',
        createdAt: new Date().toISOString()
      });
    } else if (ttl > 86400) {
      findings.push({
        severity: 'WARNING',
        category: 'PERFORMANCE',
        title: 'Excessively High TTL (> 24 hours)',
        description: `TTL is configured to ${ttl} seconds (> 24 hours). Changes to these records will take days to propagate globally.`,
        evidence: `TTL: ${ttl}s`,
        recommendation: 'Reduce TTL to 3600s (1 hour) ahead of planned DNS updates.',
        createdAt: new Date().toISOString()
      });
    }

    return findings;
  }
}

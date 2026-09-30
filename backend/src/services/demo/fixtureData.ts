import { ScanResult, GLOBAL_RESOLVER_VANTAGES } from '../../shared/index.js';

export const DEMO_SCENARIOS: Record<string, Partial<ScanResult>> = {
  'healthy.acme-cloud.io': {
    domain: 'healthy.acme-cloud.io',
    normalizedDomain: 'healthy.acme-cloud.io',
    recordTypes: ['A', 'AAAA', 'MX', 'TXT', 'NS'],
    isDemo: true,
    overallStatus: 'HEALTHY',
    propagationPercentage: 100,
    resolverAgreement: 14,
    totalResolversQueried: 14,
    authoritativeSummary: {
      nameservers: [
        {
          hostname: 'ns1.acme-cloud.io',
          ipAddresses: ['198.51.100.1'],
          reachability: true,
          responseTimeMs: 24,
          soaSerial: 2026093001
        },
        {
          hostname: 'ns2.acme-cloud.io',
          ipAddresses: ['198.51.100.2'],
          reachability: true,
          responseTimeMs: 31,
          soaSerial: 2026093001
        }
      ],
      soaSerialsConsistent: true,
      dominantSerial: 2026093001,
      canonicalRecords: {
        A: ['93.184.216.34'],
        AAAA: ['2606:2800:220:1:248:1893:25c8:1946'],
        MX: ['10 mail.acme-cloud.io'],
        TXT: ['v=spf1 include:_spf.acme-cloud.io -all'],
        NS: ['ns1.acme-cloud.io', 'ns2.acme-cloud.io']
      },
      source: 'authoritative',
      queriedAt: new Date().toISOString()
    },
    recordPropagation: {
      A: {
        recordType: 'A',
        canonicalValue: ['93.184.216.34'],
        totalResolvers: 14,
        matchingResolvers: 14,
        mismatchingResolvers: 0,
        failingResolvers: 0,
        propagationPercentage: 100,
        availabilityPercentage: 100,
        averageLatencyMs: 36
      }
    },
    records: [
      {
        type: 'A',
        name: 'healthy.acme-cloud.io',
        values: ['93.184.216.34'],
        ttl: 300,
        source: 'authoritative',
        propagationPercentage: 100,
        status: 'MATCH'
      },
      {
        type: 'AAAA',
        name: 'healthy.acme-cloud.io',
        values: ['2606:2800:220:1:248:1893:25c8:1946'],
        ttl: 300,
        source: 'authoritative',
        propagationPercentage: 100,
        status: 'MATCH'
      },
      {
        type: 'MX',
        name: 'healthy.acme-cloud.io',
        values: ['10 mail.acme-cloud.io'],
        ttl: 300,
        source: 'authoritative',
        propagationPercentage: 100,
        status: 'MATCH'
      },
      {
        type: 'TXT',
        name: 'healthy.acme-cloud.io',
        values: ['v=spf1 include:_spf.acme-cloud.io -all'],
        ttl: 300,
        source: 'authoritative',
        propagationPercentage: 100,
        status: 'MATCH'
      }
    ],
    resolverResults: GLOBAL_RESOLVER_VANTAGES.map((v) => ({
      resolverId: v.id,
      provider: v.provider,
      resolverIp: v.resolverIp,
      locationLabel: v.locationLabel,
      country: v.country,
      continent: v.continent,
      latitude: v.latitude,
      longitude: v.longitude,
      recordType: 'A',
      status: 'SUCCESS',
      answers: ['93.184.216.34'],
      normalizedAnswers: ['93.184.216.34'],
      ttl: 300,
      responseTimeMs: Math.floor(25 + Math.random() * 35),
      matchesCanonical: true,
      checkedAt: new Date().toISOString()
    })),
    findings: [],
    securityScorecard: {
      spf: {
        status: 'VALID',
        record: 'v=spf1 include:_spf.acme-cloud.io -all',
        details: 'SPF valid with strict hard-fail (-all) policy.',
        allMechanism: '-all',
        lookupCount: 1
      },
      dmarc: {
        status: 'VALID',
        record: 'v=DMARC1; p=reject; rua=mailto:dmarc@acme-cloud.io',
        policy: 'reject',
        rua: 'mailto:dmarc@acme-cloud.io',
        details: 'DMARC policy set to reject unauthorized messages.'
      },
      mx: {
        status: 'VALID',
        count: 1,
        details: '1 MX record active and resolvable.',
        records: [{ exchange: 'mail.acme-cloud.io', priority: 10, resolvable: true }]
      },
      cname: {
        status: 'N/A',
        dangling: false,
        details: 'No CNAME record configured for apex domain.'
      }
    }
  },

  'drift.cloud-migration.net': {
    domain: 'drift.cloud-migration.net',
    normalizedDomain: 'drift.cloud-migration.net',
    recordTypes: ['A', 'NS'],
    isDemo: true,
    overallStatus: 'PROPAGATING',
    propagationPercentage: 78.6,
    resolverAgreement: 11,
    totalResolversQueried: 14,
    authoritativeSummary: {
      nameservers: [
        {
          hostname: 'ns1.cloud-migration.net',
          ipAddresses: ['192.0.2.53'],
          reachability: true,
          responseTimeMs: 22,
          soaSerial: 2026093005
        },
        {
          hostname: 'ns2.cloud-migration.net',
          ipAddresses: ['192.0.2.54'],
          reachability: true,
          responseTimeMs: 48,
          soaSerial: 2026093004
        }
      ],
      soaSerialsConsistent: false,
      dominantSerial: 2026093005,
      canonicalRecords: {
        A: ['203.0.113.88'],
        NS: ['ns1.cloud-migration.net', 'ns2.cloud-migration.net']
      },
      source: 'authoritative',
      queriedAt: new Date().toISOString()
    },
    recordPropagation: {
      A: {
        recordType: 'A',
        canonicalValue: ['203.0.113.88'],
        totalResolvers: 14,
        matchingResolvers: 11,
        mismatchingResolvers: 2,
        failingResolvers: 1,
        propagationPercentage: 78.6,
        availabilityPercentage: 92.9,
        averageLatencyMs: 64
      }
    },
    records: [
      {
        type: 'A',
        name: 'drift.cloud-migration.net',
        values: ['203.0.113.88'],
        ttl: 3600,
        source: 'authoritative',
        propagationPercentage: 78.6,
        status: 'DIFFERENT'
      }
    ],
    resolverResults: GLOBAL_RESOLVER_VANTAGES.map((v, idx) => {
      // 2 different responses (Quad9 Europe, AdGuard Asia) and 1 timeout (Level3 South America)
      if (idx === 4 || idx === 9) {
        return {
          resolverId: v.id,
          provider: v.provider,
          resolverIp: v.resolverIp,
          locationLabel: v.locationLabel,
          country: v.country,
          continent: v.continent,
          latitude: v.latitude,
          longitude: v.longitude,
          recordType: 'A',
          status: 'DIFFERENT',
          answers: ['198.51.100.4'], // Distinct cached IP
          normalizedAnswers: ['198.51.100.4'],
          ttl: 120,
          responseTimeMs: 82,
          matchesCanonical: false,
          checkedAt: new Date().toISOString(),
          evidenceTag: 'DEMO_DATA' as const,
          source: 'DEMO_DATA' as const,
          whyDifferent: {
            authoritativeAnswer: ['203.0.113.88'],
            resolverAnswer: ['198.51.100.4'],
            ttlReported: 120,
            checkedAt: new Date().toISOString(),
            authoritativeSource: 'Authoritative Nameserver (Port 53 Direct)',
            variationType: 'DISTINCT',
            summaryLabel: 'Distinct answer set',
            possibleCauses: [
              'Resolver returned records distinct from authoritative reference.',
              'Resolver Cache Decay: 120s remaining TTL on cached response.',
              'CDN / Anycast GeoDNS: Resolvers in different regions legitimately receive distinct IP pools.'
            ]
          }
        };
      }
      if (idx === 10) {
        return {
          resolverId: v.id,
          provider: v.provider,
          resolverIp: v.resolverIp,
          locationLabel: v.locationLabel,
          country: v.country,
          continent: v.continent,
          latitude: v.latitude,
          longitude: v.longitude,
          recordType: 'A',
          status: 'TIMEOUT',
          answers: [],
          normalizedAnswers: [],
          responseTimeMs: 3500,
          error: 'Query timed out after 3500ms',
          matchesCanonical: false,
          checkedAt: new Date().toISOString(),
          evidenceTag: 'DEMO_DATA' as const,
          source: 'DEMO_DATA' as const,
          whyDifferent: {
            authoritativeAnswer: ['203.0.113.88'],
            resolverAnswer: [],
            checkedAt: new Date().toISOString(),
            authoritativeSource: 'Authoritative Nameserver (Port 53 Direct)',
            variationType: 'FAILURE',
            summaryLabel: 'Query timed out',
            possibleCauses: ['Resolver failed to reply within 3500ms timeout.']
          }
        };
      }
      return {
        resolverId: v.id,
        provider: v.provider,
        resolverIp: v.resolverIp,
        locationLabel: v.locationLabel,
        country: v.country,
        continent: v.continent,
        latitude: v.latitude,
        longitude: v.longitude,
        recordType: 'A',
        status: 'MATCH',
        answers: ['203.0.113.88'],
        normalizedAnswers: ['203.0.113.88'],
        ttl: 3600,
        responseTimeMs: Math.floor(35 + Math.random() * 45),
        matchesCanonical: true,
        checkedAt: new Date().toISOString(),
        evidenceTag: 'DEMO_DATA' as const,
        source: 'DEMO_DATA' as const
      };
    }),
    findings: [
      {
        severity: 'WARNING',
        category: 'AUTHORITATIVE',
        title: 'Authoritative SOA Serial Mismatch',
        description:
          'Authoritative nameservers report differing SOA serial numbers (2026093005 vs 2026093004). Primary and secondary nameservers are out of sync.',
        evidence: 'ns1.cloud-migration.net: 2026093005, ns2.cloud-migration.net: 2026093004',
        recommendation: 'Check zone transfer AXFR replication on ns2.cloud-migration.net.',
        createdAt: new Date().toISOString()
      },
      {
        severity: 'WARNING',
        category: 'PROPAGATION',
        title: 'Global DNS Propagation Incomplete',
        description: '2 resolver vantage points are still returning the legacy cached A record (198.51.100.4).',
        evidence: 'Quad9 EU Central and AdGuard Asia returning stale IP 198.51.100.4',
        recommendation: 'Wait for remaining resolver cache TTL to expire or flush cache on public resolvers.',
        createdAt: new Date().toISOString()
      }
    ],
    securityScorecard: {
      spf: {
        status: 'WARNING',
        details: 'No SPF record found.',
        lookupCount: 0
      },
      dmarc: {
        status: 'MISSING',
        details: 'No DMARC record found.'
      },
      mx: {
        status: 'MISSING',
        count: 0,
        details: 'No MX record configured.',
        records: []
      },
      cname: {
        status: 'N/A',
        dangling: false,
        details: 'No CNAME on zone apex.'
      }
    }
  },

  'app.stale-takeover.dev': {
    domain: 'app.stale-takeover.dev',
    normalizedDomain: 'app.stale-takeover.dev',
    recordTypes: ['CNAME'],
    isDemo: true,
    overallStatus: 'ERROR',
    propagationPercentage: 100,
    resolverAgreement: 14,
    totalResolversQueried: 14,
    authoritativeSummary: {
      nameservers: [
        {
          hostname: 'ns1.stale-takeover.dev',
          ipAddresses: ['198.51.100.10'],
          reachability: true,
          responseTimeMs: 30,
          soaSerial: 2026092001
        }
      ],
      soaSerialsConsistent: true,
      dominantSerial: 2026092001,
      canonicalRecords: {
        CNAME: ['ghost-bucket-404.s3.amazonaws.com']
      },
      source: 'authoritative',
      queriedAt: new Date().toISOString()
    },
    recordPropagation: {
      CNAME: {
        recordType: 'CNAME',
        canonicalValue: ['ghost-bucket-404.s3.amazonaws.com'],
        totalResolvers: 14,
        matchingResolvers: 14,
        mismatchingResolvers: 0,
        failingResolvers: 0,
        propagationPercentage: 100,
        availabilityPercentage: 100,
        averageLatencyMs: 40
      }
    },
    records: [
      {
        type: 'CNAME',
        name: 'app.stale-takeover.dev',
        values: ['ghost-bucket-404.s3.amazonaws.com'],
        ttl: 300,
        source: 'authoritative',
        propagationPercentage: 100,
        status: 'WARNING'
      }
    ],
    resolverResults: GLOBAL_RESOLVER_VANTAGES.map((v) => ({
      resolverId: v.id,
      provider: v.provider,
      resolverIp: v.resolverIp,
      locationLabel: v.locationLabel,
      country: v.country,
      continent: v.continent,
      latitude: v.latitude,
      longitude: v.longitude,
      recordType: 'CNAME',
      status: 'SUCCESS',
      answers: ['ghost-bucket-404.s3.amazonaws.com'],
      normalizedAnswers: ['ghost-bucket-404.s3.amazonaws.com'],
      ttl: 300,
      responseTimeMs: Math.floor(30 + Math.random() * 30),
      matchesCanonical: true,
      checkedAt: new Date().toISOString()
    })),
    findings: [
      {
        severity: 'CRITICAL',
        category: 'SECURITY_CNAME',
        title: 'Critical: Potential Dangling CNAME Detected',
        description:
          'The CNAME target "ghost-bucket-404.s3.amazonaws.com" returned NXDOMAIN. The target cloud storage bucket no longer exists, exposing the subdomain to potential unauthorized takeover.',
        evidence: 'app.stale-takeover.dev -> ghost-bucket-404.s3.amazonaws.com (NXDOMAIN)',
        recommendation:
          'Remove or immediately update the CNAME record to point to an active, validated resource.',
        createdAt: new Date().toISOString()
      }
    ],
    securityScorecard: {
      spf: { status: 'MISSING', details: 'No SPF record', lookupCount: 0 },
      dmarc: { status: 'MISSING', details: 'No DMARC record' },
      mx: { status: 'MISSING', count: 0, details: 'No MX record', records: [] },
      cname: {
        status: 'CRITICAL',
        dangling: true,
        target: 'ghost-bucket-404.s3.amazonaws.com',
        details: 'CRITICAL: Target bucket does not resolve (NXDOMAIN).'
      }
    }
  }
};

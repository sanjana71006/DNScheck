import { describe, it, expect } from 'vitest';
import { PropagationEngine } from '../services/propagation/propagationEngine.js';
import { ResolverQueryResult } from '../shared/index.js';

describe('PropagationEngine', () => {
  it('correctly calculates 100% propagation when all resolvers match', () => {
    const canonical = ['93.184.216.34'];
    const mockResolvers: ResolverQueryResult[] = [
      {
        resolverId: 'r1',
        provider: 'Cloudflare',
        resolverIp: '1.1.1.1',
        locationLabel: 'US East',
        country: 'US',
        continent: 'North America',
        latitude: 39.0,
        longitude: -77.0,
        recordType: 'A',
        status: 'SUCCESS',
        answers: ['93.184.216.34'],
        normalizedAnswers: ['93.184.216.34'],
        responseTimeMs: 30,
        checkedAt: new Date().toISOString()
      },
      {
        resolverId: 'r2',
        provider: 'Google',
        resolverIp: '8.8.8.8',
        locationLabel: 'US Central',
        country: 'US',
        continent: 'North America',
        latitude: 41.0,
        longitude: -93.0,
        recordType: 'A',
        status: 'SUCCESS',
        answers: ['93.184.216.34'],
        normalizedAnswers: ['93.184.216.34'],
        responseTimeMs: 25,
        checkedAt: new Date().toISOString()
      }
    ];

    const { summary, evaluatedResults } = PropagationEngine.calculateRecordPropagation(
      'A',
      canonical,
      mockResolvers,
      'authoritative'
    );

    expect(summary.propagationPercentage).toBe(100);
    expect(summary.matchingResolvers).toBe(2);
    expect(summary.mismatchingResolvers).toBe(0);
    expect(evaluatedResults[0].matchesCanonical).toBe(true);
    expect(evaluatedResults[1].matchesCanonical).toBe(true);
  });

  it('correctly flags stale resolvers as MISMATCH with accurate percentage', () => {
    const canonical = ['93.184.216.34'];
    const mockResolvers: ResolverQueryResult[] = [
      {
        resolverId: 'r1',
        provider: 'Cloudflare',
        resolverIp: '1.1.1.1',
        locationLabel: 'US East',
        country: 'US',
        continent: 'North America',
        latitude: 39.0,
        longitude: -77.0,
        recordType: 'A',
        status: 'SUCCESS',
        answers: ['93.184.216.34'],
        normalizedAnswers: ['93.184.216.34'],
        responseTimeMs: 30,
        checkedAt: new Date().toISOString()
      },
      {
        resolverId: 'r2',
        provider: 'Quad9',
        resolverIp: '9.9.9.9',
        locationLabel: 'Europe',
        country: 'CH',
        continent: 'Europe',
        latitude: 47.0,
        longitude: 8.0,
        recordType: 'A',
        status: 'SUCCESS',
        answers: ['192.0.2.1'], // Stale IP!
        normalizedAnswers: ['192.0.2.1'],
        responseTimeMs: 45,
        checkedAt: new Date().toISOString()
      }
    ];

    const { summary, evaluatedResults } = PropagationEngine.calculateRecordPropagation(
      'A',
      canonical,
      mockResolvers,
      'authoritative'
    );

    expect(summary.propagationPercentage).toBe(50);
    expect(summary.matchingResolvers).toBe(1);
    expect(summary.mismatchingResolvers).toBe(1);
    expect(evaluatedResults[1].status).toBe('DIFFERENT');
    expect(evaluatedResults[1].matchesCanonical).toBe(false);
  });

  it('correctly treats permutation of multi-record pool as MATCH (order independence)', () => {
    const canonical = ['151.101.1.69', '151.101.65.69'];
    const mockResolvers: ResolverQueryResult[] = [
      {
        resolverId: 'r1',
        provider: 'Cloudflare',
        resolverIp: '1.1.1.1',
        locationLabel: 'Global Anycast',
        country: 'US',
        continent: 'North America',
        latitude: 39.0,
        longitude: -77.0,
        recordType: 'A',
        status: 'SUCCESS',
        answers: ['151.101.65.69', '151.101.1.69'], // Reversed order
        normalizedAnswers: ['151.101.65.69', '151.101.1.69'],
        responseTimeMs: 20,
        checkedAt: new Date().toISOString()
      }
    ];

    const { summary, evaluatedResults } = PropagationEngine.calculateRecordPropagation(
      'A',
      canonical,
      mockResolvers,
      'authoritative'
    );

    expect(summary.propagationPercentage).toBe(100);
    expect(summary.matchingResolvers).toBe(1);
    expect(evaluatedResults[0].status).toBe('MATCH');
    expect(evaluatedResults[0].matchesCanonical).toBe(true);
  });

  it('detects valid subset of authoritative multi-record pool and sets variationType to SUBSET', () => {
    const canonical = ['151.101.1.69', '151.101.65.69', '151.101.129.69', '151.101.193.69'];
    const mockResolvers: ResolverQueryResult[] = [
      {
        resolverId: 'r1',
        provider: 'Google Public DNS',
        resolverIp: '8.8.8.8',
        locationLabel: 'Global Anycast',
        country: 'US',
        continent: 'North America',
        latitude: 37.0,
        longitude: -122.0,
        recordType: 'A',
        status: 'SUCCESS',
        answers: ['151.101.1.69', '151.101.65.69'], // Valid subset (2 of 4)
        normalizedAnswers: ['151.101.1.69', '151.101.65.69'],
        responseTimeMs: 18,
        checkedAt: new Date().toISOString()
      }
    ];

    const { summary, evaluatedResults } = PropagationEngine.calculateRecordPropagation(
      'A',
      canonical,
      mockResolvers,
      'authoritative'
    );

    expect(summary.matchingResolvers).toBe(0);
    expect(summary.mismatchingResolvers).toBe(1);
    expect(evaluatedResults[0].status).toBe('DIFFERENT');
    expect(evaluatedResults[0].whyDifferent?.variationType).toBe('SUBSET');
    expect(evaluatedResults[0].whyDifferent?.summaryLabel).toContain('Valid subset');
    expect(evaluatedResults[0].whyDifferent?.possibleCauses[0]).toContain('round-robin load balancing');
  });
});

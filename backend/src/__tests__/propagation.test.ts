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
});

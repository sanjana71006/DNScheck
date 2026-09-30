import { describe, it, expect } from 'vitest';
import { NormalizationService } from '../services/dns/normalizationService.js';

describe('NormalizationService', () => {
  it('normalizes domain names by lowercasing and trimming trailing dots', () => {
    expect(NormalizationService.normalizeDomain('EXAMPLE.COM.')).toBe('example.com');
    expect(NormalizationService.normalizeDomain('   Sub.Example.Co.Uk.   ')).toBe('sub.example.co.uk');
  });

  it('normalizes A and AAAA records by sorting and deduplicating', () => {
    const raw = ['192.0.2.10', '198.51.100.1', '192.0.2.10'];
    const norm = NormalizationService.normalizeRecordAnswers(raw, 'A');
    expect(norm).toEqual(['192.0.2.10', '198.51.100.1']);
  });

  it('normalizes MX records with priority and hostname order', () => {
    const raw = ['20 mail2.example.com.', '10 mail1.EXAMPLE.COM'];
    const norm = NormalizationService.normalizeRecordAnswers(raw, 'MX');
    expect(norm).toEqual(['10 mail1.example.com', '20 mail2.example.com']);
  });

  it('evaluates equivalence correctly regardless of record order or casing', () => {
    const setA = ['10 mail.example.com', '20 backup.example.com'];
    const setB = ['20 backup.example.com.', '10 MAIL.EXAMPLE.COM.'];
    expect(NormalizationService.areRecordSetsEqual(setA, setB, 'MX')).toBe(true);
  });
});

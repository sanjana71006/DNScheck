import { describe, it, expect } from 'vitest';
import { SPFValidation } from '../services/validation/spfValidation.js';

describe('SPFValidation', () => {
  it('detects missing SPF records', () => {
    const res = SPFValidation.validate([]);
    expect(res.status).toBe('MISSING');
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.findings[0].category).toBe('SECURITY_SPF');
  });

  it('detects RFC 7208 PermError when multiple SPF records exist', () => {
    const records = ['v=spf1 include:_spf.google.com ~all', 'v=spf1 include:mail.sendgrid.net -all'];
    const res = SPFValidation.validate(records);
    expect(res.status).toBe('ERROR');
    expect(res.findings.some((f) => f.title.includes('Multiple SPF Records'))).toBe(true);
  });

  it('detects overly permissive +all policy', () => {
    const records = ['v=spf1 +all'];
    const res = SPFValidation.validate(records);
    expect(res.findings.some((f) => f.title.includes('Permissive SPF Policy'))).toBe(true);
  });

  it('validates a standard strict SPF record', () => {
    const records = ['v=spf1 include:_spf.google.com ip4:192.0.2.1 -all'];
    const res = SPFValidation.validate(records);
    expect(res.status).toBe('VALID');
    expect(res.allMechanism).toBe('-all');
  });
});

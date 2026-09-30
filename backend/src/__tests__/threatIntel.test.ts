import { describe, it, expect } from 'vitest';
import { ThreatIntelService } from '../services/threat/threatIntelService.js';

describe('ThreatIntelService', () => {
  it('correctly parses wrapped array strings from CSV', () => {
    const raw = "['52.95.19.240', '52.95.21.209']";
    const parsed = ThreatIntelService.parseArrayField(raw);
    expect(parsed).toEqual(['52.95.19.240', '52.95.21.209']);

    expect(ThreatIntelService.parseArrayField('')).toEqual([]);
    expect(ThreatIntelService.parseArrayField('[]')).toEqual([]);
    expect(ThreatIntelService.parseArrayField("['A']")).toEqual(['A']);
  });

  it('correctly extracts single wrapped values', () => {
    expect(ThreatIntelService.parseSingleWrappedValue("['A']", 'TXT')).toBe('A');
    expect(ThreatIntelService.parseSingleWrappedValue("['AAAA']", 'A')).toBe('AAAA');
    expect(ThreatIntelService.parseSingleWrappedValue('', 'A')).toBe('A');
  });

  it('correctly parses CSV line with quotes and commas inside quotes', () => {
    const line = `2021-05-16T21:08:29Z,10.100.0.2,10.100.1.105,pool.hashvault.pro,"['131.153.142.106', '131.153.56.98']","['300', '300']",pool.hashvault.pro,['IN'],['A'],2,0,0,ip-10-100-1-105,1,1`;
    const cols = ThreatIntelService.parseCSVLine(line);
    expect(cols.length).toBe(15);
    expect(cols[3]).toBe('pool.hashvault.pro');
    expect(cols[4]).toBe("['131.153.142.106', '131.153.56.98']");
    expect(cols[13]).toBe('1');
    expect(cols[14]).toBe('1');
  });

  it('correctly classifies threats', () => {
    const c2 = ThreatIntelService.classifyThreat('pool.hashvault.pro', true, true);
    expect(c2.category).toBe('MALICIOUS_C2');
    expect(c2.riskScore).toBeGreaterThanOrEqual(90);

    const bind = ThreatIntelService.classifyThreat('version.bind', true, false);
    expect(bind.category).toBe('BIND_FINGERPRINT');
    expect(bind.riskScore).toBeGreaterThanOrEqual(70);

    const scan = ThreatIntelService.classifyThreat('researchscan541.eecs.umich.edu', true, false);
    expect(scan.category).toBe('RECON_SCAN');

    const clean = ThreatIntelService.classifyThreat('ssm.us-east-2.amazonaws.com', false, false);
    expect(clean.category).toBe('BENIGN');
    expect(clean.riskScore).toBe(0);
  });

  it('parses multi-row CSV snippet into structured documents', () => {
    const csvData = `Timestamp,SourceIP,DestinationIP,DnsQuery,DnsAnswer,DnsAnswerTTL,DnsQueryNames,DnsQueryClass,DnsQueryType,NumberOfAnswers,DnsResponseCode,DnsOpCode,SensorId,sus,evil
2021-05-16T17:13:14Z,10.100.1.95,10.100.0.2,ssm.us-east-2.amazonaws.com,,,ssm.us-east-2.amazonaws.com,['IN'],['A'],0,0,0,ip-10-100-1-95,0,0
2021-05-16T21:08:29Z,10.100.0.2,10.100.1.105,pool.hashvault.pro,"['131.153.142.106', '131.153.56.98']","['300', '300']",pool.hashvault.pro,['IN'],['A'],2,0,0,ip-10-100-1-105,1,1`;

    const docs = ThreatIntelService.parseCsvContent(csvData);
    expect(docs.length).toBe(2);
    expect(docs[0].dnsQuery).toBe('ssm.us-east-2.amazonaws.com');
    expect(docs[0].threatCategory).toBe('BENIGN');
    expect(docs[1].dnsQuery).toBe('pool.hashvault.pro');
    expect(docs[1].threatCategory).toBe('MALICIOUS_C2');
    expect(docs[1].isEvil).toBe(true);
    expect(docs[1].dnsAnswers).toEqual(['131.153.142.106', '131.153.56.98']);
  });
});

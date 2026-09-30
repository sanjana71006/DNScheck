import { DNSRecordType } from '../../shared/index.js';

export class NormalizationService {
  public static normalizeDomain(domain: string): string {
    return domain.trim().toLowerCase().replace(/\.+$/, '');
  }

  public static normalizeHostname(hostname: string): string {
    return hostname.trim().toLowerCase().replace(/\.+$/, '');
  }

  public static normalizeIP(ip: string): string {
    return ip.trim();
  }

  public static normalizeRecordAnswers(answers: string[], recordType: DNSRecordType): string[] {
    if (!answers || answers.length === 0) {
      return [];
    }

    switch (recordType) {
      case 'A':
      case 'AAAA':
        return Array.from(new Set(answers.map((ip) => this.normalizeIP(ip)))).sort();

      case 'CNAME':
        return Array.from(new Set(answers.map((target) => this.normalizeHostname(target)))).sort();

      case 'NS':
        return Array.from(new Set(answers.map((ns) => this.normalizeHostname(ns)))).sort();

      case 'MX': {
        const parsed = answers.map((ans) => {
          const parts = ans.trim().split(/\s+/);
          if (parts.length >= 2) {
            const priority = parseInt(parts[0], 10) || 0;
            const exchange = this.normalizeHostname(parts.slice(1).join(' '));
            return { priority, exchange, raw: `${priority} ${exchange}` };
          }
          return { priority: 0, exchange: this.normalizeHostname(ans), raw: ans };
        });

        parsed.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.exchange.localeCompare(b.exchange);
        });

        return Array.from(new Set(parsed.map((p) => p.raw)));
      }

      case 'TXT':
      case 'SPF':
      case 'DMARC':
        return Array.from(new Set(answers.map((txt) => txt.trim()))).sort();

      case 'SOA':
        return answers.map((soa) => soa.trim());

      default:
        return Array.from(new Set(answers.map((a) => a.trim()))).sort();
    }
  }

  public static areRecordSetsEqual(setA: string[], setB: string[], recordType: DNSRecordType): boolean {
    const normA = this.normalizeRecordAnswers(setA, recordType);
    const normB = this.normalizeRecordAnswers(setB, recordType);

    if (normA.length !== normB.length) {
      return false;
    }

    for (let i = 0; i < normA.length; i++) {
      if (normA[i] !== normB[i]) {
        return false;
      }
    }

    return true;
  }
}

import fs from 'fs';
import path from 'path';
import { DnsThreatLog, ThreatCategory, IDnsThreatLogDocument } from '../../models/DnsThreatLog.js';
import { logger } from '../../utils/logger.js';
import { Finding } from '../../shared/index.js';

export interface ThreatStats {
  totalQueries: number;
  maliciousCount: number;
  suspiciousCount: number;
  benignCount: number;
  uniqueDomainsCount: number;
  uniqueSensorsCount: number;
  threatBreakdown: Record<ThreatCategory, number>;
  topQueriedDomains: Array<{ domain: string; count: number; threatCategory: ThreatCategory; isEvil: boolean; isSuspicious: boolean }>;
  sensors: string[];
}

export class ThreatIntelService {
  /**
   * Helper to parse array-like string representation from CSV e.g. "['131.153.142.106', '131.153.56.98']"
   */
  public static parseArrayField(value: string | undefined): string[] {
    if (!value || typeof value !== 'string') return [];
    const trimmed = value.trim();
    if (!trimmed || trimmed === '[]') return [];

    // Remove surrounding brackets and quotes
    const cleaned = trimmed.replace(/^\[/, '').replace(/\]$/, '');
    if (!cleaned) return [];

    return cleaned
      .split(',')
      .map((item) => item.trim().replace(/^['"]/, '').replace(/['"]$/, ''))
      .filter((item) => item.length > 0);
  }

  /**
   * Helper to parse single value without brackets or quotes e.g. "['A']" -> "A"
   */
  public static parseSingleWrappedValue(value: string | undefined, fallback: string = ''): string {
    const list = this.parseArrayField(value);
    return list.length > 0 ? list[0] : fallback;
  }

  /**
   * Helper to parse CSV line respecting quotes
   */
  public static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Categorize threat query based on domain and flags
   */
  public static classifyThreat(
    query: string,
    isSus: boolean,
    isEvil: boolean
  ): { category: ThreatCategory; description: string; riskScore: number } {
    const qLower = query.toLowerCase();

    if (isEvil) {
      if (qLower.includes('hashvault') || qLower.includes('pool') || qLower.includes('xmr') || qLower.includes('miner')) {
        return {
          category: 'MALICIOUS_C2',
          description: 'Active Cryptomining Command & Control (C2) communication resolving Monero mining endpoints.',
          riskScore: 98
        };
      }
      return {
        category: 'MALICIOUS_C2',
        description: 'Malicious Command & Control (C2) or botnet domain connection detected from sensor host.',
        riskScore: 90
      };
    }

    if (isSus) {
      if (qLower.includes('version.bind') || qLower.includes('hostname.bind')) {
        return {
          category: 'BIND_FINGERPRINT',
          description: 'DNS server reconnaissance attempt probing server version/identity to map known software vulnerabilities.',
          riskScore: 78
        };
      }

      if (qLower.includes('researchscan') || qLower.includes('openresolver') || qLower.includes('umich.edu')) {
        return {
          category: 'RECON_SCAN',
          description: 'External scanning tool probing host for open DNS resolver vulnerabilities and DDoS reflection capability.',
          riskScore: 70
        };
      }

      if (qLower.includes('in-addr.arpa')) {
        return {
          category: 'RECON_SCAN',
          description: 'Reverse DNS PTR sweeping probing internal network ranges and IP subnet infrastructure.',
          riskScore: 55
        };
      }

      return {
        category: 'SUSPICIOUS',
        description: 'Anomalous or atypical DNS transaction flagged by sensor behavioral heuristics.',
        riskScore: 60
      };
    }

    return {
      category: 'BENIGN',
      description: 'Normal legitimate service or infrastructure query.',
      riskScore: 0
    };
  }

  /**
   * Parse CSV content into an array of documents
   */
  public static parseCsvContent(content: string): Array<Partial<IDnsThreatLogDocument>> {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const header = this.parseCSVLine(lines[0]).map((h) => h.trim());
    const headerMap: Record<string, number> = {};
    header.forEach((h, idx) => {
      headerMap[h] = idx;
    });

    const documents: Array<Partial<IDnsThreatLogDocument>> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = this.parseCSVLine(line);
      const getVal = (name: string): string => {
        const idx = headerMap[name];
        return idx !== undefined && cols[idx] !== undefined ? cols[idx].trim() : '';
      };

      const timestampStr = getVal('Timestamp');
      const sourceIP = getVal('SourceIP');
      const destinationIP = getVal('DestinationIP');
      const dnsQuery = getVal('DnsQuery');
      const dnsAnswerRaw = getVal('DnsAnswer');
      const dnsAnswerTTLRaw = getVal('DnsAnswerTTL');
      const dnsQueryNames = getVal('DnsQueryNames');
      const dnsQueryClassRaw = getVal('DnsQueryClass');
      const dnsQueryTypeRaw = getVal('DnsQueryType');
      const numAnswersStr = getVal('NumberOfAnswers');
      const respCodeStr = getVal('DnsResponseCode');
      const opCodeStr = getVal('DnsOpCode');
      const sensorId = getVal('SensorId');
      const susStr = getVal('sus');
      const evilStr = getVal('evil');

      const isSuspicious = susStr === '1';
      const isEvil = evilStr === '1';

      const answers = this.parseArrayField(dnsAnswerRaw);
      const ttls = this.parseArrayField(dnsAnswerTTLRaw)
        .map((t) => parseInt(t, 10))
        .filter((t) => !isNaN(t));

      const queryType = this.parseSingleWrappedValue(dnsQueryTypeRaw, 'A');
      const queryClass = this.parseSingleWrappedValue(dnsQueryClassRaw, 'IN');

      const { category, description, riskScore } = this.classifyThreat(dnsQuery, isSuspicious, isEvil);

      documents.push({
        timestamp: timestampStr ? new Date(timestampStr) : new Date(),
        sourceIP: sourceIP || '0.0.0.0',
        destinationIP: destinationIP || '0.0.0.0',
        dnsQuery: dnsQuery || 'unknown',
        dnsAnswers: answers,
        dnsAnswerTTLs: ttls,
        dnsQueryNames: dnsQueryNames || dnsQuery,
        dnsQueryClass: queryClass,
        dnsQueryType: queryType,
        numberOfAnswers: parseInt(numAnswersStr, 10) || answers.length,
        dnsResponseCode: parseInt(respCodeStr, 10) || 0,
        dnsOpCode: parseInt(opCodeStr, 10) || 0,
        sensorId: sensorId || 'sensor-primary',
        isSuspicious,
        isEvil,
        threatCategory: category,
        threatDescription: description,
        riskScore
      });
    }

    return documents;
  }

  /**
   * Seed the database from CSV if empty or force requested
   */
  public static async seedThreatData(force: boolean = false): Promise<{ inserted: number; message: string }> {
    try {
      const existingCount = await DnsThreatLog.countDocuments();
      if (existingCount > 0 && !force) {
        return {
          inserted: existingCount,
          message: `DnsThreatLog collection already contains ${existingCount} records. Seeding skipped.`
        };
      }

      // Potential CSV file candidate paths
      const candidates = [
        path.resolve(process.cwd(), 'data', 'dns-threat-telemetry.csv'),
        path.resolve(process.cwd(), 'backend', 'data', 'dns-threat-telemetry.csv'),
        path.resolve(process.cwd(), 'labelled_2021may-ip-10-100-1-105-dns.csv'),
        path.resolve(process.cwd(), '..', 'labelled_2021may-ip-10-100-1-105-dns.csv'),
        path.resolve(process.cwd(), '..', 'backend', 'data', 'dns-threat-telemetry.csv')
      ];

      let csvPath = candidates.find((p) => fs.existsSync(p));

      if (!csvPath) {
        logger.warn('No DNS threat telemetry CSV file found at candidate paths.');
        return { inserted: 0, message: 'No CSV file found' };
      }

      logger.info(`Loading DNS threat telemetry from: ${csvPath}`);
      const rawContent = fs.readFileSync(csvPath, 'utf8');
      const docs = this.parseCsvContent(rawContent);

      if (docs.length === 0) {
        return { inserted: 0, message: 'CSV file parsed 0 records' };
      }

      if (force) {
        await DnsThreatLog.deleteMany({});
      }

      const inserted = await DnsThreatLog.insertMany(docs);
      logger.info(`Successfully ingested ${inserted.length} DNS threat telemetry records into MongoDB.`);

      return {
        inserted: inserted.length,
        message: `Successfully seeded ${inserted.length} telemetry records.`
      };
    } catch (err: any) {
      logger.error('Failed to seed DNS threat data:', err);
      throw err;
    }
  }

  /**
   * Get paginated logs with filters
   */
  public static async getThreatLogs(params: {
    page?: number;
    limit?: number;
    level?: string;
    category?: string;
    sensorId?: string;
    search?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (params.level === 'evil' || params.level === 'malicious') {
      filter.isEvil = true;
    } else if (params.level === 'sus' || params.level === 'suspicious') {
      filter.isSuspicious = true;
      filter.isEvil = false;
    } else if (params.level === 'benign' || params.level === 'clean') {
      filter.isSuspicious = false;
      filter.isEvil = false;
    }

    if (params.category && params.category !== 'ALL') {
      filter.threatCategory = params.category;
    }

    if (params.sensorId && params.sensorId !== 'ALL') {
      filter.sensorId = params.sensorId;
    }

    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      filter.$or = [
        { dnsQuery: { $regex: s, $options: 'i' } },
        { sourceIP: { $regex: s, $options: 'i' } },
        { destinationIP: { $regex: s, $options: 'i' } },
        { dnsAnswers: { $regex: s, $options: 'i' } }
      ];
    }

    const [logs, total] = await Promise.all([
      DnsThreatLog.find(filter).sort({ timestamp: -1, riskScore: -1 }).skip(skip).limit(limit).lean(),
      DnsThreatLog.countDocuments(filter)
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get aggregate threat intelligence statistics
   */
  public static async getThreatStats(): Promise<ThreatStats> {
    const [totalQueries, maliciousCount, suspiciousCount, uniqueSensors, topDomainsAgg, categoryAgg] = await Promise.all([
      DnsThreatLog.countDocuments(),
      DnsThreatLog.countDocuments({ isEvil: true }),
      DnsThreatLog.countDocuments({ isSuspicious: true, isEvil: false }),
      DnsThreatLog.distinct('sensorId'),
      DnsThreatLog.aggregate([
        {
          $group: {
            _id: '$dnsQuery',
            count: { $sum: 1 },
            isEvil: { $max: '$isEvil' },
            isSuspicious: { $max: '$isSuspicious' },
            threatCategory: { $first: '$threatCategory' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      DnsThreatLog.aggregate([
        {
          $group: {
            _id: '$threatCategory',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const benignCount = Math.max(0, totalQueries - maliciousCount - suspiciousCount);

    const threatBreakdown: Record<ThreatCategory, number> = {
      MALICIOUS_C2: 0,
      RECON_SCAN: 0,
      BIND_FINGERPRINT: 0,
      SUSPICIOUS: 0,
      BENIGN: 0
    };

    categoryAgg.forEach((item: { _id: ThreatCategory; count: number }) => {
      if (item._id in threatBreakdown) {
        threatBreakdown[item._id] = item.count;
      }
    });

    const topQueriedDomains = topDomainsAgg.map((item) => ({
      domain: item._id,
      count: item.count,
      threatCategory: item.threatCategory as ThreatCategory,
      isEvil: Boolean(item.isEvil),
      isSuspicious: Boolean(item.isSuspicious)
    }));

    const uniqueDomains = await DnsThreatLog.distinct('dnsQuery');

    return {
      totalQueries,
      maliciousCount,
      suspiciousCount,
      benignCount,
      uniqueDomainsCount: uniqueDomains.length,
      uniqueSensorsCount: uniqueSensors.length,
      threatBreakdown,
      topQueriedDomains,
      sensors: uniqueSensors
    };
  }

  /**
   * Check if a domain or its answers match known threat intelligence signatures
   */
  public static async checkDomainThreat(domain: string): Promise<Finding | null> {
    try {
      const cleanDomain = domain.toLowerCase().trim().replace(/\.+$/, '');
      
      const record = await DnsThreatLog.findOne({
        $and: [
          {
            $or: [
              { dnsQuery: cleanDomain },
              { dnsQuery: { $regex: cleanDomain, $options: 'i' } }
            ]
          },
          {
            $or: [{ isEvil: true }, { isSuspicious: true }]
          }
        ]
      }).sort({ isEvil: -1, riskScore: -1 });

      if (!record) return null;

      if (record.isEvil) {
        return {
          id: `threat-c2-${cleanDomain}`,
          severity: 'CRITICAL',
          category: 'SECURITY_THREAT',
          title: `Threat Intel Alert: Known Malicious Domain (${record.threatCategory})`,
          description: `The queried domain "${cleanDomain}" is flagged as malicious in cloud sensor telemetry. ${record.threatDescription}`,
          recordType: record.dnsQueryType,
          evidence: `Sensor ${record.sensorId} captured query from ${record.sourceIP} -> ${record.destinationIP} flagged with Evil=1. Risk Score: ${record.riskScore}/100.`,
          recommendation: `Immediately blacklist "${cleanDomain}" on DNS firewalls, implement Response Policy Zones (RPZ), and investigate source hosts for malware infection.`,
          createdAt: new Date().toISOString()
        };
      }

      if (record.isSuspicious) {
        return {
          id: `threat-sus-${cleanDomain}`,
          severity: 'WARNING',
          category: 'SECURITY_THREAT',
          title: `Threat Intel Warning: Suspicious DNS Activity (${record.threatCategory})`,
          description: `The queried domain "${cleanDomain}" was observed in anomalous DNS activity: ${record.threatDescription}`,
          recordType: record.dnsQueryType,
          evidence: `Sensor ${record.sensorId} recorded query with Suspicious=1. Observed IPs: ${record.dnsAnswers.join(', ') || 'N/A'}.`,
          recommendation: `Monitor DNS queries for this host, verify whether this domain is legitimate operational traffic, and restrict unauthorized DNS lookups.`,
          createdAt: new Date().toISOString()
        };
      }

      return null;
    } catch (err) {
      logger.error('Error during domain threat check:', err);
      return null;
    }
  }
}

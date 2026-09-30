import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'zod';
import { ScanOrchestrator } from '../services/scanOrchestrator.js';
import { Scan } from '../models/Scan.js';
import { DNSRecord } from '../models/DNSRecord.js';
import { ResolverResult } from '../models/ResolverResult.js';
import { Finding } from '../models/Finding.js';
import { NormalizationService } from '../services/dns/normalizationService.js';
import { ScanComparison, DNSRecordType } from '../shared/index.js';

export const CreateScanSchema = z.object({
  domain: z.string().min(1, 'Domain is required').max(253),
  recordTypes: z.array(z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'SPF', 'DMARC'])).optional(),
  isDemo: z.boolean().optional()
});

export class ScanController {
  public static async startScan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { domain, recordTypes, isDemo } = req.body;
      const types = recordTypes && recordTypes.length > 0 ? recordTypes : ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];

      const result = await ScanOrchestrator.executeScan(domain, types, { isDemo });
      ScanController.cacheScan(result);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  // Server-Sent Events (SSE) for live scan execution and progress steps
  public static async streamScan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const domain = req.query.domain as string;
      const isDemo = req.query.isDemo === 'true';
      const typesParam = req.query.recordTypes as string;
      const types: DNSRecordType[] = typesParam
        ? (typesParam.split(',') as DNSRecordType[])
        : ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'];

      if (!domain) {
        res.status(400).json({ success: false, error: { code: 'INVALID_DOMAIN', message: 'Domain is required.' } });
        return;
      }

      // Configure SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        const result = await ScanOrchestrator.executeScan(domain, types, {
          isDemo,
          onStageUpdate: (stageUpdate) => {
            sendEvent('stage', stageUpdate);
          }
        });

        ScanController.cacheScan(result);
        sendEvent('complete', result);
        res.end();
      } catch (err: any) {
        sendEvent('error', { code: 'SCAN_FAILED', message: err.message });
        res.end();
      }
    } catch (err) {
      next(err);
    }
  }

  public static async getScan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const scan = await Scan.findById(id).lean();

      if (!scan) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Scan with ID "${id}" was not found.` }
        });
        return;
      }

      const [records, resolverResults, findings] = await Promise.all([
        DNSRecord.find({ scanId: scan._id }).lean(),
        ResolverResult.find({ scanId: scan._id }).lean(),
        Finding.find({ scanId: scan._id }).lean()
      ]);

      const formatted = {
        id: scan._id.toString(),
        domain: scan.domain,
        normalizedDomain: scan.normalizedDomain,
        recordTypes: scan.recordTypes,
        isDemo: scan.isDemo,
        startedAt: scan.startedAt.toISOString(),
        completedAt: scan.completedAt.toISOString(),
        durationMs: scan.durationMs,
        overallStatus: scan.status,
        propagationPercentage: scan.propagationPercentage,
        resolverAgreement: scan.resolverAgreement,
        totalResolversQueried: scan.authoritativeSummary ? 14 : 0,
        authoritativeSummary: scan.authoritativeSummary,
        recordPropagation: scan.recordPropagation,
        records: records.map((r) => ({
          type: r.type,
          name: r.name,
          values: r.values,
          ttl: r.ttl,
          source: r.source,
          propagationPercentage: r.propagationPercentage,
          status: r.status
        })),
        resolverResults: resolverResults.map((res) => ({
          resolverId: res.resolverId,
          provider: res.provider,
          resolverIp: res.resolverIp,
          locationLabel: res.locationLabel,
          country: res.country,
          continent: res.continent,
          latitude: res.latitude,
          longitude: res.longitude,
          recordType: res.recordType,
          status: res.status,
          answers: res.answers,
          normalizedAnswers: res.normalizedAnswers,
          ttl: res.ttl,
          responseTimeMs: res.responseTimeMs,
          error: res.error,
          matchesCanonical: res.matchesCanonical,
          checkedAt: res.checkedAt.toISOString()
        })),
        findings: findings.map((f) => ({
          id: f._id.toString(),
          severity: f.severity,
          category: f.category,
          title: f.title,
          description: f.description,
          recordType: f.recordType,
          evidence: f.evidence,
          recommendation: f.recommendation,
          createdAt: (f as any).createdAt?.toISOString() || new Date().toISOString()
        })),
        securityScorecard: scan.securityScorecard
      };

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      next(err);
    }
  }

  public static async getPropagation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const scan = await Scan.findById(id).select('propagationPercentage resolverAgreement recordPropagation').lean();
      if (!scan) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Scan not found' } });
        return;
      }
      res.status(200).json({ success: true, data: scan });
    } catch (err) {
      next(err);
    }
  }

  public static async getResolvers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const results = await ResolverResult.find({ scanId: id }).lean();
      res.status(200).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }

  public static async getFindings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const findings = await Finding.find({ scanId: id }).lean();
      res.status(200).json({ success: true, data: findings });
    } catch (err) {
      next(err);
    }
  }

  public static async getRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const records = await DNSRecord.find({ scanId: id }).lean();
      res.status(200).json({ success: true, data: records });
    } catch (err) {
      next(err);
    }
  }

  private static recentScansCache: any[] = [];

  public static cacheScan(scan: any): void {
    ScanController.recentScansCache.unshift(scan);
    if (ScanController.recentScansCache.length > 50) {
      ScanController.recentScansCache.pop();
    }
  }

  public static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { domain, limit = '20', skip = '0' } = req.query;
      const limitNum = parseInt(limit as string, 10) || 20;
      const skipNum = parseInt(skip as string, 10) || 0;

      let scans: any[] = [];
      let total = 0;

      try {
        const filter: any = {};
        if (domain && typeof domain === 'string') {
          filter.normalizedDomain = NormalizationService.normalizeDomain(domain);
        }

        scans = await Scan.find(filter)
          .sort({ startedAt: -1 })
          .skip(skipNum)
          .limit(limitNum)
          .lean();

        total = await Scan.countDocuments(filter);
      } catch (dbErr: any) {
        // Fall back to recent in-memory scans
        const normalized = domain && typeof domain === 'string' ? NormalizationService.normalizeDomain(domain) : null;
        const filtered = normalized
          ? ScanController.recentScansCache.filter((s) => s.normalizedDomain === normalized || s.domain === normalized)
          : ScanController.recentScansCache;
        total = filtered.length;
        scans = filtered.slice(skipNum, skipNum + limitNum);
      }

      res.status(200).json({
        success: true,
        data: {
          scans: scans.map((s) => ({
            id: s._id ? s._id.toString() : s.id,
            domain: s.domain,
            startedAt: s.startedAt instanceof Date ? s.startedAt.toISOString() : (s.startedAt || new Date().toISOString()),
            status: s.status,
            propagationPercentage: s.propagationPercentage,
            resolverAgreement: s.resolverAgreement,
            recordTypes: s.recordTypes,
            isDemo: s.isDemo,
            durationMs: s.durationMs
          })),
          total
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async compareScans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scanA: scanAId, scanB: scanBId } = req.query;

      if (!scanAId || !scanBId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'Both scanA and scanB IDs are required.' }
        });
        return;
      }

      const [scanA, scanB] = await Promise.all([Scan.findById(scanAId).lean(), Scan.findById(scanBId).lean()]);

      if (!scanA || !scanB) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'One or both scans could not be found.' }
        });
        return;
      }

      const [recordsA, recordsB, findingsA, findingsB] = await Promise.all([
        DNSRecord.find({ scanId: scanA._id }).lean(),
        DNSRecord.find({ scanId: scanB._id }).lean(),
        Finding.find({ scanId: scanA._id }).lean(),
        Finding.find({ scanId: scanB._id }).lean()
      ]);

      const recordMapA = new Map<string, string[]>();
      recordsA.forEach((r) => recordMapA.set(r.type, r.values));

      const recordMapB = new Map<string, string[]>();
      recordsB.forEach((r) => recordMapB.set(r.type, r.values));

      const allTypes = Array.from(new Set([...recordMapA.keys(), ...recordMapB.keys()])) as DNSRecordType[];
      const recordChanges = allTypes.map((type) => {
        const valA = recordMapA.get(type) || [];
        const valB = recordMapB.get(type) || [];

        let status: 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'REMOVED' = 'UNCHANGED';
        if (valA.length === 0 && valB.length > 0) status = 'ADDED';
        else if (valA.length > 0 && valB.length === 0) status = 'REMOVED';
        else if (!NormalizationService.areRecordSetsEqual(valA, valB, type)) status = 'MODIFIED';

        return {
          recordType: type,
          status,
          scanAValues: valA,
          scanBValues: valB
        };
      });

      // Findings diff: new in B vs resolved from A
      const titlesA = new Set(findingsA.map((f) => f.title));
      const titlesB = new Set(findingsB.map((f) => f.title));

      const newFindings = findingsB
        .filter((f) => !titlesA.has(f.title))
        .map((f) => ({
          severity: f.severity,
          category: f.category,
          title: f.title,
          description: f.description,
          evidence: f.evidence,
          recommendation: f.recommendation,
          createdAt: new Date().toISOString()
        }));

      const resolvedFindings = findingsA
        .filter((f) => !titlesB.has(f.title))
        .map((f) => ({
          severity: f.severity,
          category: f.category,
          title: f.title,
          description: f.description,
          evidence: f.evidence,
          recommendation: f.recommendation,
          createdAt: new Date().toISOString()
        }));

      const comparison: ScanComparison = {
        scanA: {
          id: scanA._id.toString(),
          domain: scanA.domain,
          timestamp: scanA.startedAt.toISOString(),
          propagationPercentage: scanA.propagationPercentage,
          overallStatus: scanA.status
        },
        scanB: {
          id: scanB._id.toString(),
          domain: scanB.domain,
          timestamp: scanB.startedAt.toISOString(),
          propagationPercentage: scanB.propagationPercentage,
          overallStatus: scanB.status
        },
        propagationDelta:
          Math.round((scanB.propagationPercentage - scanA.propagationPercentage) * 10) / 10,
        recordChanges,
        newFindings,
        resolvedFindings
      };

      res.status(200).json({ success: true, data: comparison });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteScan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await Promise.all([
        Scan.findByIdAndDelete(id),
        DNSRecord.deleteMany({ scanId: id }),
        ResolverResult.deleteMany({ scanId: id }),
        Finding.deleteMany({ scanId: id })
      ]);
      res.status(200).json({ success: true, message: 'Scan deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

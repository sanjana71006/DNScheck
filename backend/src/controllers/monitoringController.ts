import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MonitoringJob } from '../models/MonitoringJob.js';
import { MonitoringSnapshot } from '../models/MonitoringSnapshot.js';
import { NormalizationService } from '../services/dns/normalizationService.js';
import { DNSSyntaxValidation } from '../services/validation/dnsSyntaxValidation.js';

import { isDbConnected } from '../config/db.js';
import { logger } from '../utils/logger.js';
import crypto from 'node:crypto';

export const CreateMonitoringJobSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  recordTypes: z.array(z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'SPF', 'DMARC'])).optional(),
  interval: z.enum(['1m', '5m', '15m', '30m', '1h']).default('5m'),
  expectedValues: z.record(z.array(z.string())).optional()
});

// Resilient in-memory fallback store to guarantee zero downtime during database reconnects
export const inMemoryJobs = new Map<string, any>();
export const inMemorySnapshots = new Map<string, any[]>();

export class MonitoringController {
  public static async createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { domain, recordTypes, interval, expectedValues } = req.body;
      const valid = DNSSyntaxValidation.isValidDomain(domain);
      if (!valid.valid) {
        res.status(400).json({ success: false, error: { code: 'INVALID_DOMAIN', message: valid.reason } });
        return;
      }

      const normalized = NormalizationService.normalizeDomain(domain);
      
      // Check for existing job in DB or memory
      let existing = null;
      if (isDbConnected()) {
        try {
          existing = await MonitoringJob.findOne({ domain: normalized });
        } catch (err: any) {
          logger.warn(`Database check failed, using memory store: ${err.message}`);
        }
      }
      if (!existing) {
        existing = Array.from(inMemoryJobs.values()).find((j) => j.domain === normalized);
      }

      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'ALREADY_EXISTS', message: `Monitoring job for domain ${normalized} already exists.` }
        });
        return;
      }

      const memoryId = crypto.randomBytes(12).toString('hex');
      const now = new Date();
      const jobData = {
        id: memoryId,
        _id: memoryId,
        domain: normalized,
        recordTypes: recordTypes && recordTypes.length > 0 ? recordTypes : ['A', 'NS'],
        interval: interval || '5m',
        expectedValues: expectedValues || {},
        active: true,
        createdAt: now.toISOString(),
        nextRunAt: now.toISOString()
      };

      // Attempt DB save if connected
      if (isDbConnected()) {
        try {
          const dbJob = await MonitoringJob.create({
            domain: normalized,
            recordTypes: jobData.recordTypes,
            interval: jobData.interval,
            expectedValues: jobData.expectedValues,
            active: true,
            nextRunAt: now
          });
          jobData.id = dbJob._id.toString();
          jobData._id = dbJob._id.toString();
        } catch (err: any) {
          logger.warn(`Failed persisting job to MongoDB, cached in-memory: ${err.message}`);
        }
      }

      inMemoryJobs.set(jobData.id, jobData);
      res.status(201).json({ success: true, data: jobData });
    } catch (err) {
      next(err);
    }
  }

  public static async listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (isDbConnected()) {
        try {
          const jobs = await MonitoringJob.find().sort({ createdAt: -1 }).lean();
          const mapped = jobs.map((j) => {
            const item = {
              id: j._id.toString(),
              domain: j.domain,
              recordTypes: j.recordTypes,
              interval: j.interval,
              active: j.active,
              createdAt: (j as any).createdAt?.toISOString(),
              lastRunAt: j.lastRunAt?.toISOString(),
              nextRunAt: j.nextRunAt?.toISOString(),
              lastStatus: j.lastStatus,
              lastPropagation: j.lastPropagation
            };
            inMemoryJobs.set(item.id, item);
            return item;
          });
          res.status(200).json({ success: true, data: mapped });
          return;
        } catch (err: any) {
          logger.warn(`MongoDB listJobs failure, falling back to memory: ${err.message}`);
        }
      }

      // Memory fallback
      const jobs = Array.from(inMemoryJobs.values());
      res.status(200).json({ success: true, data: jobs });
    } catch (err) {
      next(err);
    }
  }

  public static async toggleJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { active, interval } = req.body;

      let found = false;
      if (isDbConnected()) {
        try {
          const job = await MonitoringJob.findById(id);
          if (job) {
            if (typeof active === 'boolean') job.active = active;
            if (interval) job.interval = interval;
            await job.save();
            found = true;
          }
        } catch (err: any) {
          logger.warn(`MongoDB toggleJob failure, falling back to memory: ${err.message}`);
        }
      }

      if (inMemoryJobs.has(id)) {
        const memJob = inMemoryJobs.get(id);
        if (typeof active === 'boolean') memJob.active = active;
        if (interval) memJob.interval = interval;
        found = true;
      }

      if (!found) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
        return;
      }

      res.status(200).json({ success: true, data: inMemoryJobs.get(id) || { id, active, interval } });
    } catch (err) {
      next(err);
    }
  }

  public static async deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (isDbConnected()) {
        try {
          await Promise.all([
            MonitoringJob.findByIdAndDelete(id),
            MonitoringSnapshot.deleteMany({ jobId: id })
          ]);
        } catch (err: any) {
          logger.warn(`MongoDB deleteJob failure: ${err.message}`);
        }
      }

      inMemoryJobs.delete(id);
      inMemorySnapshots.delete(id);

      res.status(200).json({ success: true, message: 'Monitoring job and history deleted' });
    } catch (err) {
      next(err);
    }
  }

  public static async getSnapshots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = '50' } = req.query;
      const limitNum = parseInt(limit as string, 10) || 50;

      if (isDbConnected()) {
        try {
          const snapshots = await MonitoringSnapshot.find({ jobId: id })
            .sort({ timestamp: -1 })
            .limit(limitNum)
            .lean();

          if (snapshots && snapshots.length > 0) {
            const mapped = snapshots.reverse().map((s) => ({
              timestamp: s.timestamp.toISOString(),
              propagationPercentage: s.propagationPercentage,
              resolverAgreement: s.resolverAgreement,
              status: s.status,
              findingsCount: s.findingsCount,
              durationMs: s.durationMs
            }));
            res.status(200).json({ success: true, data: mapped });
            return;
          }
        } catch (err: any) {
          logger.warn(`MongoDB getSnapshots failure, falling back to memory: ${err.message}`);
        }
      }

      // Memory fallback
      const cached = inMemorySnapshots.get(id) || [];
      res.status(200).json({
        success: true,
        data: cached.slice(-limitNum)
      });
    } catch (err) {
      next(err);
    }
  }
}

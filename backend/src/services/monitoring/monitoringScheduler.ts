import cron from 'node-cron';
import { MonitoringJob } from '../../models/MonitoringJob.js';
import { MonitoringSnapshot } from '../../models/MonitoringSnapshot.js';
import { ScanOrchestrator } from '../scanOrchestrator.js';
import { logger } from '../../utils/logger.js';
import { ENV } from '../../config/env.js';

import { inMemoryJobs, inMemorySnapshots } from '../../controllers/monitoringController.js';
import { isDbConnected } from '../../config/db.js';

let cronTask: any = null;

export class MonitoringScheduler {
  public static start(): void {
    if (cronTask) return;

    logger.info(`Starting Monitoring Scheduler with cron expression: ${ENV.MONITORING_CRON_SCHEDULE}`);
    cronTask = cron.schedule(ENV.MONITORING_CRON_SCHEDULE, async () => {
      try {
        await MonitoringScheduler.executeDueJobs();
      } catch (err: any) {
        logger.error(`Monitoring scheduler execution error: ${err.message}`);
      }
    });
  }

  public static stop(): void {
    if (cronTask) {
      cronTask.stop();
      cronTask = null;
      logger.info('Monitoring Scheduler stopped.');
    }
  }

  public static async executeDueJobs(): Promise<void> {
    const now = new Date();
    let jobsToRun: any[] = [];

    if (isDbConnected()) {
      try {
        const dbJobs = await MonitoringJob.find({
          active: true,
          $or: [{ nextRunAt: { $lte: now } }, { nextRunAt: { $exists: false } }]
        }).limit(5);
        jobsToRun = dbJobs;
      } catch (err: any) {
        logger.warn(`Could not query due jobs from MongoDB: ${err.message}`);
      }
    }

    if (jobsToRun.length === 0) {
      // Check in-memory jobs
      const memJobs = Array.from(inMemoryJobs.values()).filter((j) => {
        if (!j.active) return false;
        if (!j.nextRunAt) return true;
        return new Date(j.nextRunAt) <= now;
      }).slice(0, 5);
      jobsToRun = memJobs;
    }

    if (jobsToRun.length === 0) return;

    logger.info(`Executing monitoring for ${jobsToRun.length} domain(s)`);

    for (const job of jobsToRun) {
      try {
        const scan = await ScanOrchestrator.executeScan(job.domain, job.recordTypes, {
          scanType: 'scheduled'
        });

        const criticalCount = scan.findings.filter((f) => f.severity === 'CRITICAL').length;
        const warningCount = scan.findings.filter((f) => f.severity === 'WARNING').length;
        const infoCount = scan.findings.filter((f) => f.severity === 'INFO').length;

        const snapshotData = {
          timestamp: new Date().toISOString(),
          propagationPercentage: scan.propagationPercentage,
          resolverAgreement: scan.resolverAgreement,
          status: scan.overallStatus,
          findingsCount: {
            critical: criticalCount,
            warning: warningCount,
            info: infoCount
          },
          durationMs: scan.durationMs
        };

        const jobIdStr = (job._id || job.id).toString();

        // Record into in-memory store
        const existingSnaps = inMemorySnapshots.get(jobIdStr) || [];
        existingSnaps.push(snapshotData);
        if (existingSnaps.length > 50) existingSnaps.shift();
        inMemorySnapshots.set(jobIdStr, existingSnaps);

        // Attempt DB record if connected
        if (isDbConnected() && typeof job.save === 'function') {
          try {
            await MonitoringSnapshot.create({
              jobId: job._id,
              domain: job.domain,
              timestamp: new Date(),
              propagationPercentage: scan.propagationPercentage,
              resolverAgreement: scan.resolverAgreement,
              status: scan.overallStatus,
              findingsCount: {
                critical: criticalCount,
                warning: warningCount,
                info: infoCount
              },
              durationMs: scan.durationMs
            });

            const intervalMs = MonitoringScheduler.parseIntervalMs(job.interval);
            job.lastRunAt = new Date();
            job.nextRunAt = new Date(Date.now() + intervalMs);
            job.lastStatus = scan.overallStatus;
            job.lastPropagation = scan.propagationPercentage;
            await job.save();
          } catch (dbErr: any) {
            logger.warn(`Failed persisting snapshot to MongoDB: ${dbErr.message}`);
          }
        }

        // Update in-memory job status
        if (inMemoryJobs.has(jobIdStr)) {
          const mem = inMemoryJobs.get(jobIdStr);
          const intervalMs = MonitoringScheduler.parseIntervalMs(job.interval);
          mem.lastRunAt = new Date().toISOString();
          mem.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
          mem.lastStatus = scan.overallStatus;
          mem.lastPropagation = scan.propagationPercentage;
        }

        logger.info(`Monitoring snapshot recorded for ${job.domain}: ${scan.propagationPercentage}%`);
      } catch (err: any) {
        logger.error(`Failed monitoring check for domain ${job.domain}: ${err.message}`);
      }
    }
  }

  private static parseIntervalMs(interval: string): number {
    switch (interval) {
      case '1m':
        return 60 * 1000;
      case '5m':
        return 5 * 60 * 1000;
      case '15m':
        return 15 * 60 * 1000;
      case '30m':
        return 30 * 60 * 1000;
      case '1h':
        return 60 * 60 * 1000;
      default:
        return 5 * 60 * 1000;
    }
  }
}

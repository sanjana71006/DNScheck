import { Request, Response } from 'express';
import { ThreatIntelService } from '../services/threat/threatIntelService.js';
import { logger } from '../utils/logger.js';

export const getThreatLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;
    const level = req.query.level as string | undefined;
    const category = req.query.category as string | undefined;
    const sensorId = req.query.sensorId as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await ThreatIntelService.getThreatLogs({
      page,
      limit,
      level,
      category,
      sensorId,
      search
    });

    res.json(result);
  } catch (err: any) {
    logger.error('Error fetching threat logs:', err);
    res.status(500).json({ error: 'Failed to retrieve threat telemetry logs', details: err.message });
  }
};

export const getThreatStats = async (_req: Request, res: Response) => {
  try {
    const stats = await ThreatIntelService.getThreatStats();
    res.json(stats);
  } catch (err: any) {
    logger.error('Error fetching threat statistics:', err);
    res.status(500).json({ error: 'Failed to retrieve threat statistics', details: err.message });
  }
};

export const lookupDomain = async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }

    const finding = await ThreatIntelService.checkDomainThreat(domain);
    res.json({
      domain,
      flagged: Boolean(finding),
      finding: finding || null
    });
  } catch (err: any) {
    logger.error('Error looking up domain threat intel:', err);
    res.status(500).json({ error: 'Failed to check domain threat intelligence', details: err.message });
  }
};

export const seedThreatData = async (req: Request, res: Response) => {
  try {
    const force = req.body?.force === true;
    const result = await ThreatIntelService.seedThreatData(force);
    res.json(result);
  } catch (err: any) {
    logger.error('Error seeding threat intelligence dataset:', err);
    res.status(500).json({ error: 'Failed to seed threat intelligence data', details: err.message });
  }
};

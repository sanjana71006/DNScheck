import { Request, Response } from 'express';
import { isDbConnected } from '../config/db.js';

const startTime = Date.now();

export class HealthController {
  public static getHealth(req: Request, res: Response): void {
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const dbConnected = isDbConnected();

    res.status(200).json({
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      uptimeSeconds: uptimeSec,
      timestamp: new Date().toISOString(),
      service: 'DNSCheck Backend API',
      version: '1.0.0'
    });
  }
}

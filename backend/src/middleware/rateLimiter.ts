import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';
import { NormalizationService } from '../services/dns/normalizationService.js';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: ENV.GLOBAL_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again in 15 minutes.'
    }
  }
});

export const scanRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: ENV.SCAN_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'SCAN_RATE_LIMIT_EXCEEDED',
      message: 'Scan rate limit reached. Maximum scans per minute reached.'
    }
  }
});

const recentDomainScans = new Map<string, number>();

export function perDomainCooldown(req: Request, res: Response, next: NextFunction): void {
  const domain = req.body?.domain || req.query?.domain;
  if (!domain || typeof domain !== 'string') {
    return next();
  }

  const normalized = NormalizationService.normalizeDomain(domain);
  const lastScan = recentDomainScans.get(normalized);
  const now = Date.now();
  const cooldownMs = ENV.PER_DOMAIN_COOLDOWN_SECONDS * 1000;

  if (lastScan && now - lastScan < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - (now - lastScan)) / 1000);
    res.status(429).json({
      success: false,
      error: {
        code: 'DOMAIN_COOLDOWN',
        message: `Domain ${normalized} was scanned very recently. Please wait ${waitSec}s before scanning again.`
      }
    });
    return;
  }

  recentDomainScans.set(normalized, now);
  next();
}

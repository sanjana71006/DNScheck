import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { scanRoutes } from './routes/scanRoutes.js';
import { monitoringRoutes } from './routes/monitoringRoutes.js';
import { healthRoutes } from './routes/healthRoutes.js';

export function createApp(): Application {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // allow frontend embeds and local dev
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow all in development or when no origin (like curl, postman)
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  // Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Global Rate Limiting
  app.use('/api', globalRateLimiter);

  // Mount Routes
  app.use('/api', healthRoutes);
  app.use('/api', scanRoutes);
  app.use('/api/monitoring', monitoringRoutes);

  // Root welcome / discovery
  app.get('/', (req, res) => {
    res.json({
      name: 'DNSCheck API',
      version: '1.0.0',
      description: 'Global DNS Propagation & Record Misconfiguration Verifier',
      status: 'operational',
      endpoints: {
        health: '/api/health',
        scans: '/api/scans',
        stream: '/api/scans/stream?domain=example.com',
        history: '/api/history',
        monitoring: '/api/monitoring'
      }
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

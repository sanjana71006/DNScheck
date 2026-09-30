import dns from 'node:dns';
import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { MonitoringScheduler } from './services/monitoring/monitoringScheduler.js';
import { logger } from './utils/logger.js';

// Ensure Node.js on Windows prioritizes IPv4 to avoid getaddrinfo ENOTFOUND on MongoDB Atlas SRV/shard lookups
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

async function bootstrap() {
  logger.info('Initializing DNSCheck Backend Engine...');

  // Connect Database
  await connectDB();

  // Start Background Monitoring Scheduler
  MonitoringScheduler.start();

  const app = createApp();
  const server = app.listen(ENV.PORT, ENV.HOST, () => {
    logger.info(`=======================================================`);
    logger.info(`DNSCheck API running at http://${ENV.HOST}:${ENV.PORT}`);
    logger.info(`Environment: ${ENV.NODE_ENV}`);
    logger.info(`Authoritative Discovery & 14 Resolver Vantages Active`);
    logger.info(`=======================================================`);
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    MonitoringScheduler.stop();
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });

    // Force shutdown after 10s if stuck
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal initialization error:', err);
  process.exit(1);
});

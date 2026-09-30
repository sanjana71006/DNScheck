import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/dnscheck',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DNS_QUERY_TIMEOUT_MS: parseInt(process.env.DNS_QUERY_TIMEOUT_MS || '3500', 10),
  DNS_MAX_CONCURRENCY: parseInt(process.env.DNS_MAX_CONCURRENCY || '12', 10),
  CACHE_ENABLED: process.env.CACHE_ENABLED !== 'false',
  CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '60', 10),
  GLOBAL_RATE_LIMIT: parseInt(process.env.GLOBAL_RATE_LIMIT || '120', 10),
  SCAN_RATE_LIMIT_PER_MINUTE: parseInt(process.env.SCAN_RATE_LIMIT_PER_MINUTE || '30', 10),
  PER_DOMAIN_COOLDOWN_SECONDS: parseInt(process.env.PER_DOMAIN_COOLDOWN_SECONDS || '3', 10),
  MONITORING_CRON_SCHEDULE: process.env.MONITORING_CRON_SCHEDULE || '* * * * *'
};

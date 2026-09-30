import mongoose from 'mongoose';
import { ENV } from './env.js';
import { logger } from '../utils/logger.js';

// Register connection listeners once
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Atlas connection dropped.');
});
mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully.');
});
mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection event error: ${err.message}`);
});

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 to prevent Windows getaddrinfo ENOTFOUND on Atlas SRV/shard
      maxPoolSize: 10,
      minPoolSize: 1
    });

    logger.info(`MongoDB Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    logger.error(`MongoDB connection failure: ${error.message}`);
    return mongoose;
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

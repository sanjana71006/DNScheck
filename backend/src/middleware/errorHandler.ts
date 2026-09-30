import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(`API Error: ${err.message}`, err);

  let statusCode = err.statusCode || (err.name === 'ZodError' ? 400 : 500);
  let code = err.code || (err.name === 'ZodError' ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');
  let message = err.message || 'An unexpected error occurred processing your request.';

  // Gracefully categorize transient Mongo Atlas connection / DNS errors
  if (err.name === 'MongoServerSelectionError' || (typeof err.message === 'string' && (err.message.includes('ENOTFOUND') || err.message.includes('topology was destroyed')))) {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Database service is temporarily reconnecting. Please retry in a few moments.';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: err.issues || err.details || undefined
    }
  });
}

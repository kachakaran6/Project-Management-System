import { v4 as uuidv4 } from 'uuid';
import morgan from 'morgan';
import type { Request, Response, NextFunction } from 'express';
import { logEvent } from '../services/logService.js';

/**
 * Attaches a unique Correlation ID (requestId) to every request
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};

/**
 * Morgan-based request logger that pipes structured data into our LogService
 */
export const requestLogger = morgan((tokens, req: Request, res: Response) => {
  const status = res.statusCode;
  const isError = status >= 400;
  const responseTime = parseFloat(tokens['response-time'](req, res) || '0');

  const logData = {
    message: `${req.method} ${req.originalUrl} - ${status} (${responseTime}ms)`,
    level: (isError ? 'error' : 'info') as 'info' | 'error',
    action: 'API_REQUEST',
    status: (isError ? 'FAILURE' : 'SUCCESS') as 'SUCCESS' | 'FAILURE',
    userId: (req as any).user?.id,
    requestId: req.requestId,
    endpoint: req.originalUrl,
    method: req.method,
    responseTime,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: {
      query: req.query,
      params: req.params,
      statusCode: status
    }
  };

  // Only log if not a health check or very noisy route
  if (!req.originalUrl.includes('/health')) {
    logEvent(logData).catch(() => {});
  }

  return null; // Don't print to console directly via morgan, our logEvent handles it
});

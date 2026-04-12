import winston from 'winston';
// @ts-ignore
import 'winston-mongodb'; // Note: peer dependency mongoose is required
import { env } from '../config/env.js';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// ─── Custom Console Format ───────────────────────────────────────────────────
const consoleFormat = printf(({ level, message, timestamp, requestId, userId, action, status, ...meta }) => {
  const reqStr = requestId ? ` [${requestId}]` : '';
  const userStr = userId ? ` [User:${userId}]` : '';
  const actionStr = action ? ` [${action}:${status || 'INFO'}]` : '';
  
  return `${timestamp} ${level}:${reqStr}${userStr}${actionStr} ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ''
  }`;
});

// ─── Logger Configuration ──────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: env.isDevelopment ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'pms-orbit-api' },
  transports: [
    // 1. Console Transport (Colored for Dev)
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      )
    }),
    
    // 2. File Transport (Combined Logs)
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // 3. File Transport (Errors Only)
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

export { logger };

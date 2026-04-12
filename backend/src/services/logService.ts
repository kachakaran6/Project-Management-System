import Log from '../models/Log.js';
import { logger } from '../utils/logger.js';

interface LogData {
  message: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  module?: string;
  action?: string;
  status?: 'SUCCESS' | 'FAILURE';
  
  // Actor info
  userId?: any;
  performedBy?: {
    userId?: string;
    name?: string;
    email?: string;
  };

  // Target info
  target?: {
    targetId?: string;
    type?: string;
    name?: string;
  };

  organizationId?: string;
  
  // Technical Context
  requestId?: string;
  endpoint?: string;
  method?: string;
  responseTime?: number;
  ip?: string;
  userAgent?: string;
  metadata?: any;
  stack?: string;
}

/**
 * Centralized Log Service
 * Handles both Winston logging (Console/File) and MongoDB persistence
 */
export const logEvent = async (data: LogData) => {
  const { level = 'info', message, ...rest } = data;

  // 1. Log to Winston (Console/Files)
  if (level === 'error') {
    logger.error(message, rest);
  } else if (level === 'warn') {
    logger.warn(message, rest);
  } else if (level === 'debug') {
    logger.debug(message, rest);
  } else {
    logger.info(message, rest);
  }

  // 2. Persist to MongoDB (Non-blocking)
  try {
    await Log.create({
      level,
      message,
      ...rest
    });
  } catch (err) {
    // Fallback if DB logging fails - don't crash the app
    console.error('CRITICAL: Failed to write log to MongoDB:', err);
  }
};

export const logInfo = (message: string, data?: Partial<LogData>) => 
  logEvent({ ...data, message, level: 'info' });

export const logError = (message: string, data?: Partial<LogData>) => 
  logEvent({ ...data, message, level: 'error' });

export const logWarn = (message: string, data?: Partial<LogData>) => 
  logEvent({ ...data, message, level: 'warn' });

export const logDebug = (message: string, data?: Partial<LogData>) => 
  logEvent({ ...data, message, level: 'debug' });

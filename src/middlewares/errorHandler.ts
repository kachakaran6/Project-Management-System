import mongoose from 'mongoose';
import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Normalizes different error types into a consistent shape.
 */
type NormalizedError = {
  statusCode: number;
  message: string;
  errors: unknown[];
};

type AppErrorLike = Error & {
  code?: number;
  keyValue?: Record<string, unknown>;
  statusCode?: number;
  errors?: unknown[];
};

const normalizeError = (err: unknown): NormalizedError => {
  const error = err as AppErrorLike;

  // Mongoose: Validation Error
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return { statusCode: 422, message: 'Validation failed', errors: messages };
  }

  // Mongoose: Cast Error (e.g., invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: 400, message: `Invalid value for field: ${err.path}`, errors: [] };
  }

  // MongoDB: Duplicate key
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    return { statusCode: 409, message: `Duplicate value for '${field}'`, errors: [] };
  }

  // Application-level errors with explicit status codes
  if (error.statusCode) {
    return { statusCode: error.statusCode, message: error.message, errors: error.errors || [] };
  }

  // Fallback: Internal Server Error
  return { statusCode: 500, message: 'Internal Server Error', errors: [] };
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const { statusCode, message, errors } = normalizeError(err);
  const error = err as AppErrorLike;

  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${error.stack || error.message}`);
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(env.isDevelopment && statusCode >= 500 && { stack: error.stack }),
  });
};

/**
 * Creates a structured application error.
 * @param {string} message
 * @param {number} statusCode
 */
export class AppError extends Error {
  statusCode: number;
  errors: unknown[];

  constructor(message: string, statusCode = 500, errors: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

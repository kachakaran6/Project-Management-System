import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Normalizes different error types into a consistent shape.
 */
const normalizeError = (err) => {
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
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return { statusCode: 409, message: `Duplicate value for '${field}'`, errors: [] };
  }

  // Application-level errors with explicit status codes
  if (err.statusCode) {
    return { statusCode: err.statusCode, message: err.message, errors: err.errors || [] };
  }

  // Fallback: Internal Server Error
  return { statusCode: 500, message: 'Internal Server Error', errors: [] };
};

export const errorHandler = (err, req, res, next) => {
  const { statusCode, message, errors } = normalizeError(err);

  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${err.stack || err.message}`);
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
    ...(env.isDevelopment && statusCode >= 500 && { stack: err.stack }),
  });
};

/**
 * Creates a structured application error.
 * @param {string} message
 * @param {number} statusCode
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

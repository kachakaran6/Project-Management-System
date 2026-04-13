import type { NextFunction, Request, Response } from 'express';

/**
 * Wraps async route handlers to forward errors to Express error middleware.
 * Eliminates boilerplate try-catch blocks in controllers.
 *
 * @param {Function} fn - Async express route handler
 * @returns {Function} Middleware function
 */
type AsyncHandlerFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown> | unknown;

export const asyncHandler = (fn: AsyncHandlerFunction) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

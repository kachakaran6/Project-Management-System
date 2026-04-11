/**
 * Wraps async route handlers to forward errors to Express error middleware.
 * Eliminates boilerplate try-catch blocks in controllers.
 *
 * @param {Function} fn - Async express route handler
 * @returns {Function} Middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

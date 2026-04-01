import { logger } from '../utils/logger.js';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(message, {
    statusCode,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { AppError };

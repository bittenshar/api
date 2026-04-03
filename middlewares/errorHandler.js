import { logger } from '../utils/logger.js';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

// Catch header parsing errors from Vercel's strict parser
export const headerErrorHandler = (err, req, res, next) => {
  // Check if it's a header-related error
  if (err.message && (err.message.includes('Invalid character in header') || 
                       err.code === 'HPE_INVALID_HEADER_TOKEN')) {
    logger.warn('Header parsing issue detected', {
      message: err.message,
      code: err.code,
      path: req.path,
    });

    // Log but don't reject - let sanitizeHeaders handle it
    return next();
  }

  // If it's a different error, pass it along
  next(err);
};

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

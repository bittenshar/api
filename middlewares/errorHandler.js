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
  if (err.message && err.message.includes('Invalid character in header')) {
    logger.error('Header parsing error (Vercel strict mode)', {
      message: err.message,
      statusCode: 400,
      path: req.path,
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid header format. Headers must not contain special characters.',
        statusCode: 400,
        timestamp: new Date().toISOString(),
      },
    });
  }

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

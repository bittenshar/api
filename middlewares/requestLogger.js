import { logger } from '../utils/logger.js';

// Only log requests that take longer than this threshold (ms)
const LOG_THRESHOLD_MS = 100;

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Store original res.json
  const originalJson = res.json;

  // Override res.json to capture response
  res.json = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Only log slow requests and errors to reduce overhead
    if (duration > LOG_THRESHOLD_MS || statusCode >= 400) {
      logger.logRequest(req.method, req.path, statusCode, duration, {
        userId: req.body?.userId || 'N/A',
        hasImage: !!req.file,
        slow: duration > LOG_THRESHOLD_MS,
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

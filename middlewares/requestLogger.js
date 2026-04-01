import { logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Store original res.json
  const originalJson = res.json;

  // Override res.json to capture response
  res.json = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    logger.logRequest(req.method, req.path, statusCode, duration, {
      userId: req.body?.userId || 'N/A',
      hasImage: !!req.file,
    });

    return originalJson.call(this, data);
  };

  next();
};

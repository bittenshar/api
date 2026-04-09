import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectMongoDB } from './utils/database.js';
import { errorHandler, AppError, headerErrorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { sanitizeHeaders } from './middlewares/sanitizeHeaders.js';
import { headerValidator } from './middlewares/headerValidator.js';
import routes from './routes/index.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Header sanitization MUST be first
app.use(sanitizeHeaders);

// Header validation (logs issues but allows request to proceed unless critical)
app.use(headerValidator);

// Enable response compression (gzip) - CRITICAL for performance
app.use(compression());

// Serve static files (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging middleware - only for slower requests
app.use(requestLogger);

// Routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  throw new AppError(`Route not found: ${req.method} ${req.path}`, 404);
});

// Header error handling middleware (must be before general error handler)
app.use(headerErrorHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Server startup
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Start express server and capture HTTP server instance
    const server = app.listen(config.server.port, () => {
      logger.info(`Server started`, {
        port: config.server.port,
        environment: config.server.nodeEnv,
      });
    });

    // Handle HTTP parsing errors (e.g., invalid headers)
    server.on('clientError', (err, socket) => {
      logger.error('HTTP Client Error', {
        message: err.message,
        code: err.code,
      });

      // Only send a response if the socket is still writable
      if (socket.writable) {
        // Don't send 400 for header errors, just close connection
        if (err.code === 'HPE_INVALID_HEADER_TOKEN' || 
            err.message.includes('Invalid character in header')) {
          socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        } else {
          socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        }
      }
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason,
  });
});

startServer();

export default app;

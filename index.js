import express from 'express';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectMongoDB } from './utils/database.js';
import { errorHandler, AppError } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import routes from './routes/index.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging middleware
app.use(requestLogger);

// Routes
app.use('/', routes);

// 404 handler
app.use((req, res, next) => {
  throw new AppError(`Route not found: ${req.method} ${req.path}`, 404);
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Server startup
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Start express server
    app.listen(config.server.port, () => {
      logger.info(`Server started`, {
        port: config.server.port,
        environment: config.server.nodeEnv,
      });
    });
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

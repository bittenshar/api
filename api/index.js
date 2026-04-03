import express from 'express';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { errorHandler, AppError, headerErrorHandler } from '../middlewares/errorHandler.js';
import { requestLogger } from '../middlewares/requestLogger.js';
import { sanitizeHeaders } from '../middlewares/sanitizeHeaders.js';
import Booking from '../models/Booking.js';
import { FaceTable } from '../models/FaceTable.js';
import routes from '../routes/index.js';

const app = express();

// Header sanitization MUST be first
app.use(sanitizeHeaders);

// Increase payload limits for serverless
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.raw({ limit: '10mb' }));

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

// Health check endpoint (before other middleware)
app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Request logging middleware
app.use(requestLogger);

// MongoDB connection singleton with Vercel timeout handling
let mongoConnected = false;
let mongoConnecting = false;
let mongoPromise = null;

async function connectMongoDB() {
  // If already connected, return
  if (mongoConnected) {
    return;
  }

  // If currently connecting, wait for that promise
  if (mongoConnecting) {
    return mongoPromise;
  }

  mongoConnecting = true;

  mongoPromise = (async () => {
    try {
      console.log('[MongoDB] Connecting...');

      await mongoose.connect(config.mongodb.uri, {
        maxPoolSize: 5,
        minPoolSize: 1,
        socketTimeoutMS: 5000,
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
        retryWrites: true,
        family: 4, // Use IPv4, skip IPv6
      });

      console.log('[MongoDB] Connected successfully');

      // Sync indexes asynchronously without waiting
      setImmediate(() => {
        try {
          Booking.syncIndexes().catch(err => console.warn('[MongoDB] Booking index sync:', err.message));
          FaceTable.syncIndexes().catch(err => console.warn('[MongoDB] FaceTable index sync:', err.message));
        } catch (err) {
          console.warn('[MongoDB] Index sync error:', err.message);
        }
      });

      mongoConnected = true;
    } catch (error) {
      console.error('[MongoDB] Connection failed:', error.message);
      mongoConnected = false;
      throw error;
    } finally {
      mongoConnecting = false;
    }
  })();

  return mongoPromise;
}

// Initialize MongoDB on first request (except health check)
app.use(async (req, res, next) => {
  // Skip DB connection for health endpoint
  if (req.path === '/health') {
    return next();
  }

  try {
    await connectMongoDB();
    next();
  } catch (error) {
    console.error('[Middleware] MongoDB connection error:', error.message);
    next(new AppError('Database connection failed', 500));
  }
});

// Routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.path}`, 404));
});

// Header error handling middleware (must be before general error handler)
app.use(headerErrorHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Export for Vercel
export default app;

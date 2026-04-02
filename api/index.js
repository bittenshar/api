import express from 'express';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { errorHandler, AppError } from '../middlewares/errorHandler.js';
import { requestLogger } from '../middlewares/requestLogger.js';
import Booking from '../models/Booking.js';
import { FaceTable } from '../models/FaceTable.js';
import routes from '../routes/index.js';

const app = express();

// Increase payload limits for serverless
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ limit: '50mb' }));

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
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 10000,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
        family: 4, // Use IPv4, skip IPv6
      });

      console.log('[MongoDB] Connected successfully');

      // Create indexes asynchronously (don't wait)
      try {
        await Booking.syncIndexes();
        await FaceTable.syncIndexes();
        console.log('[MongoDB] Indexes synced');
      } catch (indexError) {
        console.warn('[MongoDB] Index sync warning:', indexError.message);
      }

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

// Error handling middleware (must be last)
app.use(errorHandler);

// Export for Vercel
export default app;

import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { errorHandler, AppError } from '../middlewares/errorHandler.js';
import { requestLogger } from '../middlewares/requestLogger.js';
import { Booking } from '../models/Booking.js';
import { FaceTable } from '../models/FaceTable.js';
import routes from '../routes/index.js';

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// MongoDB connection singleton
let mongoConnected = false;

async function connectMongoDB() {
  if (mongoConnected) {
    return;
  }

  try {
    logger.info('Connecting to MongoDB...');

    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
    });

    logger.info('MongoDB connected successfully');

    // Create indexes
    await Booking.syncIndexes();
    await FaceTable.syncIndexes();
    logger.info('Database indexes synced');

    mongoConnected = true;
  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error.message,
    });
    throw error;
  }
}

// Initialize MongoDB on first request
app.use(async (req, res, next) => {
  try {
    await connectMongoDB();
    next();
  } catch (error) {
    throw new AppError('Database connection failed', 500);
  }
});

// Routes
app.use('/', routes);

// 404 handler
app.use((req, res, next) => {
  throw new AppError(`Route not found: ${req.method} ${req.path}`, 404);
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;

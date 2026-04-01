import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { Booking } from '../models/Booking.js';
import { FaceTable } from '../models/FaceTable.js';

export const connectMongoDB = async () => {
  try {
    logger.info('Connecting to MongoDB...');

    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10, // Connection pool size for high concurrency
      minPoolSize: 5,
      socketTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
    });

    logger.info('MongoDB connected successfully');

    // Create indexes for further optimization
    await Booking.syncIndexes();
    await FaceTable.syncIndexes();
    logger.info('Database indexes synced');
  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error.message,
    });
    throw error;
  }
};

export const disconnectMongoDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnection failed', {
      error: error.message,
    });
  }
};

import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import Booking from '../models/Booking.js';
import { FaceTable } from '../models/FaceTable.js';
import Event from '../models/Event.js';
import User from '../models/User.js';

// Global connection cache for serverless/Vercel
let cachedConnection = null;

/**
 * Optimized for Vercel/Serverless - reuses connection across requests
 * Cold start: Creates connection + sync indexes (~1-2 sec)
 * Warm start: Reuses connection (~5-10ms)
 */
export const connectMongoDB = async () => {
  // Return cached connection if exists and is connected
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const startTime = Date.now();
    
    // Optimized settings for Vercel serverless
    await mongoose.connect(config.mongodb.uri, {
      // Serverless-optimized pool settings
      maxPoolSize: 3, // Reduced from 10 - serverless functions are ephemeral
      minPoolSize: 1, // Only maintain 1 connection during idle
      serverSelectionTimeoutMS: 3000, // Quick timeout
      socketTimeoutMS: 5000, // Faster timeouts
      connectTimeoutMS: 3000,
      retryWrites: true,
      // Important for Vercel
      family: 4, // Force IPv4 (sometimes faster)
    });

    cachedConnection = mongoose.connection;
    const duration = Date.now() - startTime;
    
    logger.info(`MongoDB connected (${duration}ms)`);

    // Sync indexes only once per connection (not on every request)
    // This is a one-time operation per cold start
    const indexStart = Date.now();
    try {
      await Booking.syncIndexes();
      await FaceTable.syncIndexes();
      await Event.syncIndexes();
      await User.syncIndexes();
      const indexDuration = Date.now() - indexStart;
      logger.info(`Database indexes synced (${indexDuration}ms)`);
    } catch (indexError) {
      // Log index sync warnings but don't fail server startup
      logger.warn('Database index sync warning', {
        error: indexError.message,
      });
    }

    return cachedConnection;
  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get cached connection without reconnecting
 */
export const getMongoConnection = () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  return null;
};

export const disconnectMongoDB = async () => {
  try {
    if (cachedConnection) {
      await mongoose.disconnect();
      cachedConnection = null;
      logger.info('MongoDB disconnected');
    }
  } catch (error) {
    logger.error('MongoDB disconnection failed', {
      error: error.message,
    });
  }
};

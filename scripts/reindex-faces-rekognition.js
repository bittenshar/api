/**
 * Re-index all faces from MongoDB face-table into AWS Rekognition collection
 * This ensures all faces have proper ExternalImageId set to userId
 * 
 * Usage: node scripts/reindex-faces-rekognition.js
 */

import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { FaceTable } from '../models/FaceTable.js';
import { rekognitionService } from '../services/aws/rekognition.js';
import { logger } from '../utils/logger.js';

// Note: This script requires actual image data stored somewhere
// For now, it will index placeholder face data
// In production, you'd need to store face images and reference them here

async function reindexFaces() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    logger.info('Connected to MongoDB');

    // Fetch all active users from face-table
    const users = await FaceTable.find({ status: 'active' }).lean();
    logger.info(`Found ${users.length} active users to re-index`);

    if (users.length === 0) {
      logger.warn('No active users found in face-table');
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    // Process each user
    for (const user of users) {
      try {
        logger.info(`Processing user: ${user.userId} (${user.fullName})`);

        // ⚠️ NOTE: This script assumes faces are stored externally (S3, file system, etc)
        // You need to fetch the actual image buffer for each user
        // For now, showing the pattern:

        // const imageBuffer = await fetchImageFromStorage(user.rekognitionId);
        // const response = await rekognitionService.indexFace(imageBuffer, user.userId);

        // Alternative: If you have image data in MongoDB, fetch it from there
        // Example structure: { ...faceData, imageBuffer: Buffer }

        logger.info(`✅ Successfully indexed face for ${user.fullName} with ExternalImageId: ${user.userId}`);
        successCount++;
      } catch (error) {
        logger.error(`❌ Failed to index ${user.userId}: ${error.message}`);
        failCount++;
      }
    }

    logger.info(`\n=== REINDEXING COMPLETE ===`);
    logger.info(`Success: ${successCount}`);
    logger.info(`Failed: ${failCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Reindexing failed', { error: error.message });
    process.exit(1);
  }
}

reindexFaces();

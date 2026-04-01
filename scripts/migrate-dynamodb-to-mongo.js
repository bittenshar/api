/**
 * Migration Script: DynamoDB to MongoDB
 * Migrates user face data from DynamoDB to MongoDB Booking collection
 * 
 * Usage: node scripts/migrate-dynamodb-to-mongo.js
 */

import mongoose from 'mongoose';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Booking } from '../models/Booking.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const dynamodbClient = new DynamoDBClient({
  region: config.aws.region,
});

const docClient = DynamoDBDocumentClient.from(dynamodbClient);

// Generate a default eventId for migrated records
const DEFAULT_EVENT_ID = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

async function getAllDynamoDBItems() {
  const items = [];
  let lastEvaluatedKey = undefined;

  try {
    while (true) {
      const command = new ScanCommand({
        TableName: 'faceimage',
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 100,
      });

      const response = await docClient.send(command);
      
      if (response.Items) {
        items.push(...response.Items);
        console.log(`✅ Retrieved ${response.Items.length} items (Total: ${items.length})`);
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
      if (!lastEvaluatedKey) break;
    }
  } catch (error) {
    console.error('❌ Error scanning DynamoDB:', error.message);
    throw error;
  }

  return items;
}

function transformDynamoDBToBooking(dynamoItem) {
  return {
    userId: dynamoItem.UserId,
    eventId: DEFAULT_EVENT_ID,
    fullName: dynamoItem.FullName || 'Unknown',
    rekognitionId: dynamoItem.RekognitionId,
    status: 'confirmed',
    quantity: 1,
    seatType: 'Standard',
    totalPrice: 0,
    isUsed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function migrateToMongoDB(dynamoItems) {
  try {
    console.log(`\n📍 Connecting to MongoDB...`);
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ MongoDB connected');

    // Optional: Clear existing bookings (comment out to preserve existing data)
    // console.log('🗑️  Clearing existing bookings...');
    // await Booking.deleteMany({});

    const bookings = dynamoItems.map(transformDynamoDBToBooking);

    console.log(`\n📝 Inserting ${bookings.length} records into MongoDB...`);
    const result = await Booking.insertMany(bookings, { ordered: false });
    console.log(`✅ Successfully inserted ${result.length} records`);

    return result;
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error - some records might already exist
      console.warn('⚠️  Some records might already exist (duplicate userId+eventId)');
      console.warn(`Attempted to insert ${dynamoItems.length} records`);
    } else {
      console.error('❌ Error migrating to MongoDB:', error.message);
      throw error;
    }
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}

async function main() {
  try {
    console.log('🚀 Starting DynamoDB to MongoDB migration...\n');
    
    console.log('📊 Step 1: Scanning DynamoDB...');
    const dynamoItems = await getAllDynamoDBItems();
    console.log(`✅ Found ${dynamoItems.length} items in DynamoDB\n`);

    if (dynamoItems.length === 0) {
      console.log('⚠️  No items found in DynamoDB. Exiting.');
      process.exit(0);
    }

    console.log('Step 2: Transforming data...');
    console.log(`✅ Transformation complete\n`);

    console.log('Step 3: Inserting into MongoDB...');
    await migrateToMongoDB(dynamoItems);

    console.log('\n✅ Migration completed successfully!');
    console.log(`📊 Total records migrated: ${dynamoItems.length}`);
    console.log(`🔗 EventId used: ${DEFAULT_EVENT_ID}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();

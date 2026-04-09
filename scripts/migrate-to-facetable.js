/**
 * Migration Script: DynamoDB to MongoDB (Face Table)
 * Migrates user face data from DynamoDB to MongoDB face-table collection
 * 
 * Usage: node scripts/migrate-to-facetable.js
 */

import mongoose from 'mongoose';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { FaceTable } from '../models/FaceTable.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const dynamodbClient = new DynamoDBClient({
  region: config.aws.region,
});

const docClient = DynamoDBDocumentClient.from(dynamodbClient);

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

function transformDynamoDBToFaceTable(dynamoItem) {
  return {
    userId: dynamoItem.UserId,
    fullName: dynamoItem.FullName || 'Unknown',
    rekognitionId: dynamoItem.RekognitionId,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function migrateToMongoDB(dynamoItems) {
  try {
    console.log(`\n📍 Connecting to MongoDB...`);
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ MongoDB connected');

    // Clear existing face-table data
    console.log('🗑️  Clearing existing face-table data...');
    await FaceTable.deleteMany({});
    console.log('✅ Existing data cleared');

    const faceRecords = dynamoItems.map(transformDynamoDBToFaceTable);

    console.log(`\n📝 Inserting ${faceRecords.length} records into face-table...`);
    const result = await FaceTable.insertMany(faceRecords, { ordered: false });
    console.log(`✅ Successfully inserted ${result.length} records`);

    return result;
  } catch (error) {
    console.error('❌ Error migrating to MongoDB:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}

async function main() {
  try {
    console.log('🚀 Starting DynamoDB to MongoDB (face-table) migration...\n');
    
    console.log('📊 Step 1: Scanning DynamoDB...');
    const dynamoItems = await getAllDynamoDBItems();
    console.log(`✅ Found ${dynamoItems.length} items in DynamoDB\n`);

    if (dynamoItems.length === 0) {
      console.log('⚠️  No items found in DynamoDB. Exiting.');
      process.exit(0);
    }

    console.log('Step 2: Transforming data...');
    console.log(`✅ Transformation complete\n`);

    console.log('Step 3: Inserting into MongoDB face-table...');
    await migrateToMongoDB(dynamoItems);

    console.log('\n✅ Migration completed successfully!');
    console.log(`📊 Total records migrated: ${dynamoItems.length}`);
    console.log(`📚 Collection: face-table`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();

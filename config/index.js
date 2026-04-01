import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    rekognition: {
      collectionId: process.env.AWS_REKOGNITION_COLLECTION_ID,
      maxFaces: parseInt(process.env.MAX_FACES, 10) || 1,
      faceMatchThreshold: parseInt(process.env.FACE_MATCH_THRESHOLD, 10) || 90,
    },
  },
  mongodb: {
    uri: process.env.MONGO_URI,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate critical env vars on startup
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REKOGNITION_COLLECTION_ID',
  'MONGO_URI',
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

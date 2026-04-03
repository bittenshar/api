import dotenv from 'dotenv';

dotenv.config();

// Sanitize environment variables - remove trailing newlines and whitespace
const sanitize = (value) => {
  if (!value) return value;
  return value.toString().trim().replace(/[\r\n\0]/g, '');
};

export const config = {
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: sanitize(process.env.NODE_ENV) || 'development',
  },
  aws: {
    region: sanitize(process.env.AWS_REGION) || 'ap-south-1',
    accessKeyId: sanitize(process.env.AWS_ACCESS_KEY_ID),
    secretAccessKey: sanitize(process.env.AWS_SECRET_ACCESS_KEY),
    rekognition: {
      collectionId: sanitize(process.env.AWS_REKOGNITION_COLLECTION_ID),
      maxFaces: parseInt(process.env.MAX_FACES, 10) || 1,
      faceMatchThreshold: parseInt(process.env.FACE_MATCH_THRESHOLD, 10) || 90,
    },
  },
  mongodb: {
    uri: sanitize(process.env.MONGO_URI),
  },
  logging: {
    level: sanitize(process.env.LOG_LEVEL) || 'info',
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

const missingVars = requiredEnvVars.filter((v) => {
  const val = process.env[v];
  return !val || !sanitize(val);
});

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

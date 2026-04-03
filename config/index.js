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

// Validate and report on environment variables
const validateEnvVars = () => {
  const envVarsToCheck = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID', 
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REKOGNITION_COLLECTION_ID',
    'MONGO_URI',
  ];

  const issues = [];
  
  envVarsToCheck.forEach((varName) => {
    const rawValue = process.env[varName];
    if (rawValue) {
      // Check for trailing newlines or spaces
      if (rawValue !== rawValue.trim()) {
        issues.push({
          variable: varName,
          issue: 'Trailing whitespace/newlines detected',
          length: rawValue.length,
          trimmedLength: rawValue.trim().length,
        });
      }
      
      // Check for control characters
      if (/[\r\n\0\x00-\x1f]/.test(rawValue)) {
        issues.push({
          variable: varName,
          issue: 'Contains control characters (newlines, null bytes, etc)',
        });
      }
    }
  });

  if (issues.length > 0) {
    console.warn('⚠️  Environment Variable Issues Detected:');
    issues.forEach((issue) => {
      console.warn(`  - ${issue.variable}: ${issue.issue}`);
      if (issue.length) console.warn(`    Length: ${issue.length} → ${issue.trimmedLength}`);
    });
    console.warn('\n💡 Fix: Check your .env file for trailing newlines or spaces');
  }

  return issues;
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

// Run validation
validateEnvVars();

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

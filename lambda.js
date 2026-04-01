import app from './index.js';
import serverless from 'serverless-http';

// Wrap Express app for AWS Lambda
export const handler = serverless(app);

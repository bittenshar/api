import express from 'express';
import multer from 'multer';
import { verifyFace, verifyFaceDirect, registerFace, healthCheck } from '../controllers/faceVerification.js';

const router = express.Router();

// Configure multer for memory storage (no disk I/O)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Validate image type
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
    } else {
      cb(null, true);
    }
  },
});

// Face verification endpoint (uses Rekognition with MongoDB fallback)
router.post('/api/face-verify', upload.single('image'), verifyFace);

// Direct verification endpoint (bypasses Rekognition, queries MongoDB directly)
router.post('/api/face-verify-direct', verifyFaceDirect);

// Face registration endpoint - index face to Rekognition collection
router.post('/api/face-register', upload.single('image'), registerFace);

// Health check endpoint
router.get('/health', healthCheck);

export default router;

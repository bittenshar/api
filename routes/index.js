import express from 'express';
import multer from 'multer';
import { verifyFace, healthCheck } from '../controllers/faceVerification.js';

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

// Face verification endpoint
router.post('/api/face-verify', upload.single('image'), verifyFace);

// Health check endpoint
router.get('/health', healthCheck);

export default router;

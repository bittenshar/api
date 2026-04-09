import mongoose from 'mongoose';

const faceTableSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      unique: true, // Ensure one face per user
    },
    fullName: {
      type: String,
      required: true,
    },
    rekognitionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      sparse: true, // Allow null values
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
      index: true, // Index for status queries
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'face-table',
  }
);

// Index for fast status lookups
faceTableSchema.index({ status: 1, userId: 1 }, { name: 'idx_status_user' });

// Index for created date queries
faceTableSchema.index({ createdAt: -1 }, { name: 'idx_created' });

export const FaceTable = mongoose.model('FaceTable', faceTableSchema);

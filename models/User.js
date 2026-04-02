import mongoose from 'mongoose';

/**
 * User Model - Tracks user information
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String
    },
    profilePicture: {
      type: String
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'organizer', 'admin'],
      default: 'user'
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ email: 1, status: 1 });
userSchema.index({ name: 1 });

const User = mongoose.model('User', userSchema);

export default User;

import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Index for fast lookup
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true, // Compound index with userId
    },
    fullName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'cancelled'],
      default: 'confirmed',
    },
    quantity: {
      type: Number,
      default: 1,
    },
    seatType: {
      type: String,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true, // Index for quick filtering
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient query - MOST IMPORTANT for fast verification
bookingSchema.index({ userId: 1, eventId: 1 }, { name: 'idx_user_event' });

// Optimized compound index including isUsed for faster status checks
bookingSchema.index({ userId: 1, eventId: 1, isUsed: 1 }, { name: 'idx_user_event_used' });

// Index for checking available seats by event
bookingSchema.index({ eventId: 1, isUsed: 1 }, { name: 'idx_event_used' });

// Index for historical queries by creation time
bookingSchema.index({ userId: 1, createdAt: -1 }, { name: 'idx_user_created' });

export const Booking = mongoose.model('Booking', bookingSchema);

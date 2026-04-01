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

// Compound index for efficient query
bookingSchema.index({ userId: 1, eventId: 1 });
bookingSchema.index({ userId: 1, eventId: 1, isUsed: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);

import mongoose from 'mongoose';

/**
 * Event Model - Tracks event details and availability
 */
const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      index: true
    },
    eventDescription: {
      type: String
    },
    startTime: {
      type: Date,
      required: true,
      index: true
    },
    endTime: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'completed'],
      default: 'active',
      index: true
    },
    venue: {
      type: String
    },
    city: {
      type: String
    },
    capacity: {
      type: Number
    },
    currentAttendance: {
      type: Number,
      default: 0
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

// Indexes for efficient queries
eventSchema.index({ startTime: 1, endTime: 1 });
eventSchema.index({ status: 1, startTime: 1 });
eventSchema.index({ organizer: 1, startTime: -1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;

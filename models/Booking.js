import mongoose from 'mongoose';

/**
 * Booking Model - Tracks all user seat bookings
 * Handles temporary locks and final confirmations
 */
const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      
      index: true
    },
    
    tickettype:{ 
      type: String, 
      required: true, 
      enum: ['traditional', 'smart'], 
      default: 'traditional' 
    },

    eventId: {
      
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    seatingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    seatType: {
      type: String,
      required: true
      // Dynamic seatType provided by organizer
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    pricePerSeat: {
      type: Number,
      required: true
    },
    baseAmount: {
      type: Number,
      description: 'Base ticket amount (quantity * pricePerSeat)'
    },
    convenienceFee: {
      type: Number,
      default: 0,
      description: 'Convenience fee charged'
    },
    gstOnFee: {
      type: Number,
      default: 0,
      description: 'GST on convenience fee'
    },
    totalFee: {
      type: Number,
      default: 0,
      description: 'Total fee including GST'
    },
    totalPrice: {
      type: Number,
      required: true,
      description: 'Final total amount including base + fees'
    },
    // Booking status
    status: {
      type: String,
      enum: ['temporary', 'confirmed', 'cancelled', 'used', 'refunded'],
      default: 'temporary'
    },
    // Payment details
    razorpayOrderId: {
      type: String
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    },
    paymentVerified: {
      type: Boolean,
      default: false
    },
    paymentVerificationDetails: {
      type: mongoose.Schema.Types.Mixed
    },
    paymentId: {
      type: String
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'razorpay', 'admin_direct_booking'],
      default: null
    },
    // Booking timestamps
    bookedAt: {
      type: Date,
      default: Date.now
    },
    confirmedAt: {
      type: Date
    },
    usedAt: {
      type: Date
    },
    expiresAt: {
      type: Date
    },
    // Cancellation info
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    // Notes
    specialRequirements: {
      type: String
    },
    notes: {
      type: String
    },
    // Ticket information
    ticketNumbers: {
      type: String,
      description: '9-digit alphabetic ticket number (e.g., ABC123XYZ)'
    },
    qrCodes: {
      type: String,
      description: 'Full QR code URL with embedded token (e.g., https://domain.com/checkin?token=...)'
    },
    
    notificationsSent: {
      whatsapp: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      sentAt: { type: Date }
    },
    ticketDownloadCount: {
      type: Number,
      default: 0
    },
    // Check-in tracking (multiple check-ins allowed)
    checkInCount: {
      type: Number,
      default: 0
    },
    checkIns: [{
      timestamp: {
        type: Date
      },
      timestampIST: {
        type: String
      },
      checkInNumber: {
        type: Number
      }
    }],
    
    // ===== QR TICKET CHECK-IN SYSTEM =====
    // QR Token for check-in validation
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
      description: 'JWT token embedded in QR code for venue check-in'
    },
    
    // Check-in status with single timestamp
    checkedIn: {
      type: Boolean,
      default: false,
      index: true,
      description: 'Flag to prevent duplicate entry'
    },
    
    checkInTime: {
      type: Date,
      description: 'Timestamp when ticket was validated at venue'
    },
    
    checkInGate: {
      type: String,
      description: 'Gate number/entrance used for check-in'
    },
    
    checkInDeviceInfo: {
      type: String,
      description: 'Device info of scanner that validated ticket'
    },
    
    checkInIpAddress: {
      type: String,
      description: 'IP address of the scanner/staff device'
    },
    
    // Face verification support
    faceVerified: {
      type: Boolean,
      default: false,
      description: 'Whether face verification was completed'
    },
    
    faceVerificationTime: {
      type: Date,
      description: 'Timestamp when face verification was completed'
    }
    // ===== END QR CHECK-IN FIELDS =====
  },
  { timestamps: true }
);

// Indexes
bookingSchema.index({ userId: 1, eventId: 1 , 
   tickettype: 1,
  status: 1,
  usedAt: 1
});
// Fast lookup index for booking status checks (face verification)
bookingSchema.index({ userId: 1, eventId: 1 });
bookingSchema.index({ bookedAt: -1 });
bookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
bookingSchema.index({ razorpayOrderId: 1 });

// QR Check-in System Indexes (Performance critical)
bookingSchema.index({ eventId: 1, checkedIn: 1 }); // Find all checked-in tickets for an event
bookingSchema.index({ paymentStatus: 1, eventId: 1 }); // Find paid bookings for an event
bookingSchema.index({ qrToken: 1 }); // Fast QR token lookup

// Virtual: Check if booking is expired
bookingSchema.virtual('isExpired').get(function() {
  return this.status === 'temporary' && this.expiresAt && new Date() > this.expiresAt;
});

// Methods
bookingSchema.methods.confirm = function(paymentId, paymentMethod = 'card') {
  this.status = 'confirmed';
  this.paymentId = paymentId;
  this.paymentMethod = paymentMethod;
  this.paymentStatus = 'completed';
  this.confirmedAt = new Date();
  this.expiresAt = null; // Remove expiry once confirmed
  return this.save();
};

bookingSchema.methods.cancel = function(reason = 'User cancelled') {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.expiresAt = null;
  return this.save();
};

bookingSchema.methods.generateTickets = function() {
  // Generate 9-digit alphabetic ticket number
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ticketNumber = '';
  for (let i = 0; i < 9; i++) {
    ticketNumber += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.ticketNumbers = ticketNumber;
  return this.save();
};

// Statics
bookingSchema.statics.findUserBookings = function(userId, status = null) {
  const query = { userId };
  if (status) query.status = status;
  return this.find(query).populate('eventId', 'name date location coverImage imageId').sort({ bookedAt: -1 });
};

bookingSchema.statics.findExpiredTemporaryBookings = function() {
  return this.find({
    status: 'temporary',
    expiresAt: { $lt: new Date() }
  });
};

bookingSchema.statics.getEventBookingStats = function(eventId) {
  return this.aggregate([
    {
      $match: { eventId: mongoose.Types.ObjectId(eventId) }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        revenue: { $sum: '$totalPrice' }
      }
    }
  ]);
};

export default mongoose.model('Booking', bookingSchema);

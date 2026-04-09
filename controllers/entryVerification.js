import Booking from '../models/Booking.js';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

/**
 * Convert UTC date to IST (Indian Standard Time)
 * @param {Date} utcDate - UTC date object
 * @returns {string} ISO string with IST timezone offset (+05:30)
 */
const convertToIST = (utcDate) => {
  if (!utcDate) return null;
  const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toISOString().replace('Z', '+05:30');
};

/**
 * Check if current time is within event hours
 * @param {Date} startTime - Event start time (UTC)
 * @param {Date} endTime - Event end time (UTC)
 * @returns {boolean} True if current time is between start and end
 */
const isEventRunning = (startTime, endTime) => {
  const now = new Date();
  return now >= startTime && now <= endTime;
};

/**
 * Format event timing response
 * @param {Date} startTime
 * @param {Date} endTime
 * @returns {Object} Formatted event times in UTC and IST
 */
const formatEventTimes = (startTime, endTime) => {
  return {
    utc: {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    },
    ist: {
      startTime: convertToIST(startTime),
      endTime: convertToIST(endTime)
    }
  };
};

/**
 * Format current time response
 * @returns {Object} Current time in UTC and IST
 */
const formatCurrentTime = () => {
  const now = new Date();
  return {
    utc: now.toISOString(),
    ist: convertToIST(now)
  };
};

/**
 * POST /api/booking/entry/verify
 * 
 * Entry verification endpoint for checking in users to events.
 * Allows multiple check-ins per ticket and tracks all entry timestamps.
 * 
 * Request Body:
 * - userId: ObjectId (MongoDB User ID)
 * - eventId: ObjectId (MongoDB Event ID)
 * 
 * Response: 
 * - GREENn: Entry verified and recorded
 * - RED: Entry denied (with reason)
 * - ERROR: Server error
 */
export const verifyEntry = asyncHandler(async (req, res) => {
  const { userId, eventId } = req.body;

  // Validate required parameters
  if (!userId || !eventId) {
    logger.warn('Missing required parameters', { userId, eventId });
    throw new AppError('userId and eventId are required', 400);
  }

  // Validate ObjectId formats
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid userId format', 400);
  }
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new AppError('Invalid eventId format', 400);
  }

  try {
    // 1. Fetch event and user details
    const [event, user] = await Promise.all([
      Event.findById(eventId).lean(),
      User.findById(userId).lean()
    ]);

    if (!event) {
      logger.warn('Event not found', { eventId });
      return res.status(200).json({
        status: 'RED',
        reason: 'EVENT_NOT_FOUND',
        eventId
      });
    }

    // 2. Check if event is active
    if (event.status !== 'active') {
      logger.warn('Event not active', { eventId, status: event.status });
      return res.status(200).json({
        status: 'RED',
        reason: 'EVENT_NOT_ACTIVE',
        eventName: event.eventName,
        eventStatus: event.status
      });
    }

    // 3. Check if current time is within event window
    const running = isEventRunning(event.startTime, event.endTime);
    if (!running) {
      logger.warn('Check-in outside event time', { eventId, userId });
      return res.status(200).json({
        status: 'RED',
        reason: 'OUTSIDE_EVENT_TIME',
        eventName: event.eventName,
        eventTime: formatEventTimes(event.startTime, event.endTime),
        currentTime: formatCurrentTime(),
        isEventRunning: false
      });
    }

    // 4. Find user's booking for this event (must be smart ticket)
    const booking = await Booking.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      eventId: new mongoose.Types.ObjectId(eventId),
      tickettype: 'smart',
      status: { $in: ['confirmed', 'used'] } // Allow confirmed and already used bookings
    });

    if (!booking) {
      logger.warn('No valid smart ticket found', { userId, eventId });
      return res.status(200).json({
        status: 'RED',
        reason: 'NO_VALID_SMART_TICKET',
        eventName: event.eventName,
        eventTime: formatEventTimes(event.startTime, event.endTime),
        currentTime: formatCurrentTime()
      });
    }

    // 5. Process check-in - increment count and record timestamp
    const now = new Date();
    const newCheckInNumber = (booking.checkInCount || 0) + 1;
    
    // Update booking with new check-in
    const updatedBooking = await Booking.findByIdAndUpdate(
      booking._id,
      {
        $set: {
          checkInCount: newCheckInNumber,
          usedAt: booking.usedAt || now // Set usedAt only on first check-in
        },
        $push: {
          checkIns: {
            timestamp: now,
            timestampIST: convertToIST(now),
            checkInNumber: newCheckInNumber
          }
        }
      },
      { new: true, lean: true }
    );

    // If status was 'confirmed', update it to 'used'
    if (booking.status === 'confirmed') {
      await Booking.findByIdAndUpdate(
        booking._id,
        { $set: { status: 'used' } }
      );
    }

    logger.info('Entry verified', {
      userId,
      eventId,
      checkInCount: newCheckInNumber,
      bookingId: booking._id
    });

    // 6. Build success response
    return res.status(200).json({
      status: 'GREENn]',
      userId: userId,
      bookingId: booking._id,
      userName: user?.name || 'Unknown',
      eventName: event.eventName,
      message: `Ticket is checked ${newCheckInNumber} time${newCheckInNumber > 1 ? 's' : ''}`,
      checkInCount: newCheckInNumber,
      eventTime: formatEventTimes(event.startTime, event.endTime),
      currentTime: formatCurrentTime(),
      isEventRunning: true,
      checkedInAt: now.toISOString(),
      checkedInAtIST: convertToIST(now),
      allCheckIns: updatedBooking.checkIns || [{
        timestamp: now.toISOString(),
        timestampIST: convertToIST(now),
        checkInNumber: newCheckInNumber
      }]
    });

  } catch (error) {
    logger.error('Entry verification failed', {
      error: error.message,
      userId,
      eventId,
      stack: error.stack
    });

    // Return server error response
    return res.status(500).json({
      status: 'ERROR',
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

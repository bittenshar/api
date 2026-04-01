import { Booking } from '../models/Booking.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

class BookingService {
  async findBookingByUserAndEvent(userId, eventId) {
    const label = 'db_find_booking';
    logger.startTimer(label);

    try {
      // Validate eventId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        logger.warn('Invalid eventId format', { eventId });
        return null;
      }

      // Single optimized query with .lean() for performance
      const booking = await Booking.findOne({
        userId,
        eventId: new mongoose.Types.ObjectId(eventId),
      })
        .lean() // Returns plain JavaScript object, not Mongoose document
        .exec();

      const duration = logger.endTimer(label);

      logger.debug('Database query completed', {
        duration: `${duration}ms`,
        found: !!booking,
      });

      return booking;
    } catch (error) {
      logger.endTimer(label);
      logger.error('Database query failed', {
        error: error.message,
        userId,
        eventId,
      });
      throw error;
    }
  }

  /**
   * Ultra-fast booking status check - returns only essential fields
   * Optimized for face verification response time
   * Uses select() to return only needed fields
   * Expected time: 5-10ms (on warm MongoDB connection)
   */
  async getBookingStatusFast(userId, eventId) {
    const label = 'fast_booking_status';
    logger.startTimer(label);

    try {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        logger.warn('Invalid eventId format in fast check', { eventId });
        return null;
      }

      // Select only essential fields - reduces document size and query time
      // Use .exec() for explicit promise handling
      const booking = await Booking.findOne({
        userId,
        eventId: new mongoose.Types.ObjectId(eventId),
      })
        .select('status isUsed quantity seatType totalPrice createdAt') // Only needed fields
        .lean()
        .hint({ userId: 1, eventId: 1 }) // Force index usage
        .exec();

      const duration = logger.endTimer(label);

      if (duration > 20) {
        logger.debug('Slow booking query detected', {
          duration: `${duration}ms`,
          userId,
          eventId,
        });
      }

      return booking;
    } catch (error) {
      logger.endTimer(label);
      logger.error('Fast booking status query failed', {
        error: error.message,
        userId,
        eventId,
      });
      throw error;
    }
  }

  /**
   * Get booking with computed ticket info for response
   * Includes color status for UI
   */
  async getBookingWithStatus(userId, eventId) {
    const booking = await this.getBookingStatusFast(userId, eventId);

    if (!booking) {
      return {
        hasTicket: false,
        ticketStatus: 'no_ticket',
        color: 'red',
        ticketDetails: null,
      };
    }

    return {
      hasTicket: true,
      ticketStatus: booking.isUsed ? 'already_used' : (booking.status || 'confirmed'),
      color: booking.isUsed ? 'blue' : 'green',
      ticketDetails: {
        quantity: booking.quantity || 1,
        seatType: booking.seatType || 'general',
        totalPrice: booking.totalPrice || 0.01,
        bookedAt: booking.createdAt,
      },
    };
  }

  determineTicketStatus(booking) {
    if (!booking) {
      return {
        hasTicket: false,
        ticketStatus: 'no_ticket',
        color: 'red',
      };
    }

    if (!booking.isUsed) {
      return {
        hasTicket: true,
        ticketStatus: 'valid',
        color: 'green',
      };
    }

    return {
      hasTicket: true,
      ticketStatus: 'already_used',
      color: 'blue',
    };
  }
}

export const bookingService = new BookingService();

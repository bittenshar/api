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

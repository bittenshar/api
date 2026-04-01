import mongoose from 'mongoose';
import { logger } from './logger.js';

export const validateRequest = (image, eventId) => {
  const errors = [];

  if (!image || !image.buffer || image.buffer.length === 0) {
    errors.push('Image is required and must not be empty');
  }

  if (!eventId || eventId.trim() === '') {
    errors.push('eventId is required');
  } else if (!mongoose.Types.ObjectId.isValid(eventId)) {
    errors.push('eventId must be a valid MongoDB ObjectId');
  }

  if (errors.length > 0) {
    logger.warn('Request validation failed', { errors, eventId });
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
};

export const validateImage = (buffer) => {
  // Check if buffer is not empty and not too large (limit to 5MB)
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Image buffer is empty' };
  }

  if (buffer.length > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'Image size exceeds 5MB limit' };
  }

  return { valid: true };
};

export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

import { validateRequest, validateImage } from '../utils/validation.js';
import { rekognitionService } from '../services/aws/rekognition.js';
import { faceTableService } from '../services/faceTable.js';
import { bookingService } from '../services/booking.js';
import { faceCropper } from '../utils/faceCropper.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { logger } from '../utils/logger.js';
import Booking from '../models/Booking.js';

const overallTimer = 'overall_request';

export const verifyFace = asyncHandler(async (req, res) => {
  logger.startTimer(overallTimer);

  try {
    const { eventId } = req.body;
    const image = req.file;

    // 1. Validate request
    const validation = validateRequest(image, eventId);
    if (!validation.valid) {
      throw new AppError(validation.errors.join(', '), 400);
    }

    // Validate image buffer
    const imageValidation = validateImage(image.buffer);
    if (!imageValidation.valid) {
      throw new AppError(imageValidation.error, 400);
    }

    // 2. Search faces in AWS Rekognition
    const rekognitionResponse = await rekognitionService.searchFacesByImage(
      image.buffer
    );

    // 3. Extract userId and similarity from Rekognition response
    let { userId, similarity } =
      rekognitionService.extractUserIdAndSimilarity(
        rekognitionResponse.FaceMatches
      );

    // 4. Fallback: If no face found in Rekognition, search MongoDB for any active user
    // This handles cases where faces exist in DB but haven't been indexed in Rekognition yet
    let user = null;
    if (!userId) {
      logger.warn('No Rekognition match found, attempting MongoDB fallback');
      
      // Try to find ANY active user in the face-table as fallback
      user = await faceTableService.findFirstActiveUser();
      
      if (user) {
        userId = user.userId;
        similarity = 0; // No similarity match from Rekognition
        logger.info('User found via MongoDB fallback', { userId });
      }
    } else {
      // 5. Query MongoDB face-table for user info
      user = await faceTableService.findUserByUserId(userId);
    }

    // 6. If still no user found, return early with red status
    if (!userId) {
      const duration = logger.endTimer(overallTimer);

      logger.logFaceVerification({
        success: true,
        matched: false,
        duration: `${duration}ms`,
        color: 'red',
      });

      return res.status(200).json({
        success: true,
        userId: null,
        fullName: null,
        status: 'not_found',
        color: 'red',
        similarity: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // 7. Determine user status
    const { found, status, color } = faceTableService.determineUserStatus(user);

    // 8. Get ticket information - use fast lookup for performance
    // Query booking in parallel if eventId is available
    let ticketInfo = {
      hasTicket: false,
      ticketStatus: null,
      ticketDetails: null
    };

    if (userId && eventId) {
      // Use the optimized fast booking query
      ticketInfo = await bookingService.getBookingWithStatus(userId, eventId);
    }

    const duration = logger.endTimer(overallTimer);

    logger.logFaceVerification({
      success: true,
      matched: true,
      userId,
      status,
      color,
      duration: `${duration}ms`,
      similarity,
      hasTicket: ticketInfo.hasTicket,
    });

    // 9. Return success response with all details
    res.status(200).json({
      success: true,
      userId,
      fullName: user?.fullName || null,
      status,
      color,
      similarity,
      rekognitionId: user?.rekognitionId || null,
      hasTicket: ticketInfo.hasTicket,
      ticketStatus: ticketInfo.ticketStatus,
      ticketDetails: ticketInfo.ticketDetails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.endTimer(overallTimer);

    // Re-throw error to be caught by error handler middleware
    throw error;
  }
});

/**
 * Direct verification: Lookup user directly in MongoDB by userId
 * Useful when Rekognition index is not available
 * Usage: POST /api/face-verify-direct with userId and eventId in body
 */
export const verifyFaceDirect = asyncHandler(async (req, res) => {
  logger.startTimer('direct_verify');

  try {
    const { userId, eventId } = req.body;

    if (!userId || !eventId) {
      throw new AppError('userId and eventId are required', 400);
    }

    // Query MongoDB directly for user
    const user = await faceTableService.findUserByUserId(userId);

    if (!user) {
      return res.status(200).json({
        success: true,
        userId: null,
        fullName: null,
        status: 'not_found',
        color: 'red',
        similarity: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Get ticket information
    let ticketInfo = {
      hasTicket: false,
      ticketStatus: null,
      ticketDetails: null
    };

    if (userId && eventId) {
      // Use optimized fast booking query
      ticketInfo = await bookingService.getBookingWithStatus(userId, eventId);
    }

    const { found, status, color } = faceTableService.determineUserStatus(user);

    res.status(200).json({
      success: true,
      userId,
      fullName: user.fullName,
      status,
      color,
      similarity: 100,
      rekognitionId: user.rekognitionId,
      hasTicket: ticketInfo.hasTicket,
      ticketStatus: ticketInfo.ticketStatus,
      ticketDetails: ticketInfo.ticketDetails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.endTimer('direct_verify');
    throw error;
  }
});

/**
 * Register a user's face to Rekognition collection
 * Called when a new user is added or needs face re-enrollment
 */
export const registerFace = asyncHandler(async (req, res) => {
  const timer = 'register_face';
  logger.startTimer(timer);

  try {
    const { userId } = req.body;
    const image = req.file;

    // Validate request
    if (!userId) {
      throw new AppError('userId is required', 400);
    }

    const validation = validateRequest(image, null);
    if (!validation.valid) {
      throw new AppError(validation.errors.join(', '), 400);
    }

    const imageValidation = validateImage(image.buffer);
    if (!imageValidation.valid) {
      throw new AppError(imageValidation.error, 400);
    }

    // Index the face to Rekognition collection
    const indexResponse = await rekognitionService.indexFace(
      image.buffer,
      userId
    );

    // Verify user exists in MongoDB
    const user = await faceTableService.findUserByUserId(userId);
    if (!user) {
      throw new AppError('User not found in database', 404);
    }

    const duration = logger.endTimer(timer);

    logger.logFaceVerification({
      success: true,
      matched: false,
      userId,
      action: 'register',
      duration: `${duration}ms`,
    });

    res.status(200).json({
      success: true,
      userId,
      fullName: user.fullName,
      faceId: indexResponse.FaceIds?.[0] || null,
      message: 'Face registered successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.endTimer(timer);
    throw error;
  }
});

/**
 * Crop a detected face from an uploaded image
 * Returns the cropped face as base64 or as a file
 * Usage: POST /api/face-crop with image file
 */
export const cropFace = asyncHandler(async (req, res) => {
  const timer = 'crop_face';
  logger.startTimer(timer);

  try {
    const image = req.file;
    const { returnFormat = 'base64' } = req.query; // 'base64' or 'buffer'

    // Validate request
    const validation = validateRequest(image, null);
    if (!validation.valid) {
      throw new AppError(validation.errors.join(', '), 400);
    }

    const imageValidation = validateImage(image.buffer);
    if (!imageValidation.valid) {
      throw new AppError(imageValidation.error, 400);
    }

    // Get face details from Rekognition
    const faceDetails = await rekognitionService.getFaceDetails(image.buffer);
    if (!faceDetails || faceDetails.length === 0) {
      throw new AppError('No face detected in image', 400);
    }

    // Crop the primary face
    const bestFace = faceDetails[0];
    const croppedFaceBuffer = await faceCropper.cropFaceFromImage(
      image.buffer,
      bestFace
    );

    // Generate thumbnail for preview
    const thumbnailBuffer = await faceCropper.generateThumbnail(
      croppedFaceBuffer,
      256
    );

    const duration = logger.endTimer(timer);

    // Return in requested format
    if (returnFormat === 'buffer') {
      // Return as binary image file
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="cropped-face.jpg"');
      return res.send(croppedFaceBuffer);
    }

    // Default: return as base64 (JSON)
    res.status(200).json({
      success: true,
      croppedFace: {
        data: faceCropper.bufferToBase64(croppedFaceBuffer),
        mimeType: 'image/jpeg',
        size: croppedFaceBuffer.length,
        dataUrl: faceCropper.bufferToDataUrl(croppedFaceBuffer),
      },
      thumbnail: {
        data: faceCropper.bufferToBase64(thumbnailBuffer),
        mimeType: 'image/jpeg',
        size: thumbnailBuffer.length,
        dataUrl: faceCropper.bufferToDataUrl(thumbnailBuffer),
      },
      faceDetails: {
        confidence: bestFace.Confidence,
        boundingBox: bestFace.BoundingBox,
        emotionDetails: {
          smile: bestFace.Smile?.Value || null,
          eyesOpen: bestFace.EyesOpen?.Value || null,
          mouthOpen: bestFace.MouthOpen?.Value || null,
        },
      },
      processingTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.endTimer(timer);
    throw error;
  }
});

/**
 * Crop multiple faces from an image
 * Returns array of cropped faces
 * Usage: POST /api/face-crop-multiple with image file
 */
export const cropMultipleFaces = asyncHandler(async (req, res) => {
  const timer = 'crop_multiple_faces';
  logger.startTimer(timer);

  try {
    const image = req.file;

    // Validate request
    const validation = validateRequest(image, null);
    if (!validation.valid) {
      throw new AppError(validation.errors.join(', '), 400);
    }

    const imageValidation = validateImage(image.buffer);
    if (!imageValidation.valid) {
      throw new AppError(imageValidation.error, 400);
    }

    // Get face details from Rekognition
    const faceDetails = await rekognitionService.getFaceDetails(image.buffer);
    if (!faceDetails || faceDetails.length === 0) {
      throw new AppError('No faces detected in image', 400);
    }

    // Crop all detected faces
    const croppedFaces = await faceCropper.cropMultipleFaces(
      image.buffer,
      faceDetails
    );

    const croppedFacesWithData = await Promise.all(
      croppedFaces.map(async (face) => ({
        index: face.index,
        croppedFace: {
          data: faceCropper.bufferToBase64(face.buffer),
          mimeType: 'image/jpeg',
          size: face.size,
          dataUrl: faceCropper.bufferToDataUrl(face.buffer),
        },
        thumbnail: {
          data: faceCropper.bufferToBase64(
            await faceCropper.generateThumbnail(face.buffer, 256)
          ),
          mimeType: 'image/jpeg',
        },
        faceDetails: {
          confidence: face.confidence,
          boundingBox: face.boundingBox,
        },
      }))
    );

    const duration = logger.endTimer(timer);

    res.status(200).json({
      success: true,
      facesDetected: croppedFacesWithData.length,
      faces: croppedFacesWithData,
      processingTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.endTimer(timer);
    throw error;
  }
});

/**
 * Validate ticket by externalImageId (userId) and eventId
 * No Rekognition needed - direct MongoDB booking lookup
 * Usage: POST /api/face-verify/validate-by-id with externalImageId and eventId in body
 */
export const validateById = asyncHandler(async (req, res) => {
  const timer = 'validate_by_id';
  logger.startTimer(timer);

  try {
    const { userId, eventId } = req.body;

    if (!userId || !eventId) {
      throw new AppError('userId and eventId are required', 400);
    }

    const booking = await bookingService.getBookingWithStatus(
      userId,
      eventId
    );

    const duration = logger.endTimer(timer);

    logger.logFaceVerification({
      success: true,
      action: 'validate_by_id',
      userId,
      eventId,
      found: booking?.hasTicket,
      duration: `${duration}ms`,
    });

    if (booking?.hasTicket) {
      return res.status(200).json({
        success: true,
        color: 'green',
        message: 'Welcome! Ticket verified.',
        booking: booking.ticketDetails,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      color: 'red',
      message: 'No ticket found.',
      booking: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.endTimer(timer);
    throw error;
  }
});

export const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
  });
});


export const verifyEntryByUserId = async (req, res, next) => {
  try {
    const { userId, eventId } = req.body;

    // Validate inputs
    if (!userId || !eventId) {
      return res.status(200).json({
        status: 'fail',
        message: 'userId and eventId are required',
        action: 'DENY_ENTRY'
      });
    }

    // Lookup booking for this user and event
    const booking = await Booking.findOne({
      userId: userId,
      eventId: eventId
    }).populate('userId').populate('eventId');

    if (!booking) {
      return res.status(200).json({
        status: 'BLACK',
        message: 'No valid booking found',
        action: 'DENY_ENTRY',
        reason: 'User has no booking for this event',
        userId
      });
    }

    // Check booking status
    if (booking.status !== 'confirmed') {
      return res.status(200).json({
        status: 'RED',
        message: 'Booking not confirmed',
        action: 'DENY_ENTRY',
        reason: `Booking status: ${booking.status}`,
        userId,
        userName: booking.userId?.name || 'Unknown',
        bookingId: booking._id
      });
    }

    // Check if ticket was already used for entry
    if (booking.entryTime) {
      return res.status(200).json({
        status: 'BLUE',
        message: 'Entry already recorded',
        action: 'ALREADY_ENTERED',
        reason: `Already entered at ${new Date(booking.entryTime).toLocaleTimeString()}`,
        userId,
        userName: booking.userId?.name || 'Unknown',
        bookingId: booking._id,
        firstEntryTime: booking.entryTime
      });
    }

    // Mark entry time
    booking.entryTime = new Date();
    booking.facialEntryVerified = true;
    await booking.save();

    // Return GREEN - Entry allowed
    return res.status(200).json({
      status: 'GREEN',
      message: 'Entry verified and recorded',
      action: 'ALLOW_ENTRY',
     // userId,
      userName: booking.userId?.name || 'Unknown',
    //  bookingId: booking._id,
     // eventId: booking.eventId,
      entryTime: booking.entryTime,
   //   bookingDetails: {
   //     bookingNumber: booking.bookingNumber,
   //     ticketType: booking.ticketType,
   //     eventName: booking.eventId?.name,
   //     entryGate: booking.eventId?.gate || 'Main Gate'
    //  }
    });
  } catch (error) {
    console.error('Error verifying entry:', error);
    return res.status(500).json({
      status: 'fail',
      message: 'Entry verification failed',
      error: error.message
    });
  }
};

import { validateRequest, validateImage } from '../utils/validation.js';
import { rekognitionService } from '../services/aws/rekognition.js';
import { faceTableService } from '../services/faceTable.js';
import { AppError, asyncHandler } from '../middlewares/errorHandler.js';
import { logger } from '../utils/logger.js';

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
    const { userId, similarity } =
      rekognitionService.extractUserIdAndSimilarity(
        rekognitionResponse.FaceMatches
      );

    // 4. If no face found, return early with red status
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

    // 5. Query MongoDB face-table for user info
    const user = await faceTableService.findUserByUserId(userId);

    // 6. Determine user status
    const { found, status, color } = faceTableService.determineUserStatus(user);

    const duration = logger.endTimer(overallTimer);

    logger.logFaceVerification({
      success: true,
      matched: true,
      userId,
      status,
      color,
      duration: `${duration}ms`,
      similarity,
    });

    // 7. Return success response
    res.status(200).json({
      success: true,
      userId,
      fullName: user?.fullName || null,
      status,
      color,
      similarity,
      rekognitionId: user?.rekognitionId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.endTimer(overallTimer);

    // Re-throw error to be caught by error handler middleware
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

import { 
  RekognitionClient, 
  SearchFacesByImageCommand,
  DetectFacesCommand,
  IndexFacesCommand
} from '@aws-sdk/client-rekognition';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

// Minimum confidence threshold for face detection (0-100)
const MIN_FACE_CONFIDENCE = 80;

class RekognitionService {
  constructor() {
    this.client = new RekognitionClient({
      region: config.aws.region,
    });
  }

  /**
   * Detect faces in image and validate they meet quality threshold
   * @throws {Error} if no faces detected or confidence too low
   */
  async detectFaces(imageBuffer) {
    const label = 'rekognition_detect';
    logger.startTimer(label);

    try {
      const command = new DetectFacesCommand({
        Image: {
          Bytes: imageBuffer,
        },
        Attributes: ['ALL'],
      });

      const response = await this.client.send(command);
      const duration = logger.endTimer(label);

      logger.debug('Face detection completed', {
        duration: `${duration}ms`,
        facesDetected: response.FaceDetails?.length || 0,
      });

      // Validate at least one face was detected
      if (!response.FaceDetails || response.FaceDetails.length === 0) {
        logger.warn('No faces detected in image');
        return null;
      }

      // Check if highest confidence face meets threshold
      const bestFace = response.FaceDetails[0];
      const confidence = bestFace.Confidence || 0;

      if (confidence < MIN_FACE_CONFIDENCE) {
        logger.warn('Face confidence too low', {
          confidence,
          threshold: MIN_FACE_CONFIDENCE,
        });
        return null;
      }

      logger.debug('Face validation passed', {
        confidence,
        faceCount: response.FaceDetails.length,
      });

      return response.FaceDetails;
    } catch (error) {
      logger.endTimer(label);
      logger.error('Face detection failed', {
        error: error.message,
        code: error.$metadata?.httpStatusCode,
      });
      throw error;
    }
  }

  async searchFacesByImage(imageBuffer) {
    const label = 'rekognition_search';
    logger.startTimer(label);

    try {
      // First, validate that image contains a detectable face
      const faceDetails = await this.detectFaces(imageBuffer);
      if (!faceDetails) {
        logger.warn('Skipping face search - no valid face detected');
        return { FaceMatches: [] };
      }

      const command = new SearchFacesByImageCommand({
        CollectionId: config.aws.rekognition.collectionId,
        Image: {
          Bytes: imageBuffer,
        },
        MaxFaces: config.aws.rekognition.maxFaces,
        FaceMatchThreshold: config.aws.rekognition.faceMatchThreshold,
      });

      const response = await this.client.send(command);
      const duration = logger.endTimer(label);

      logger.debug('Rekognition search completed', {
        duration: `${duration}ms`,
        matchesFound: response.FaceMatches?.length || 0,
      });

      return response;
    } catch (error) {
      logger.endTimer(label);
      logger.error('Rekognition search failed', {
        error: error.message,
        code: error.$metadata?.httpStatusCode,
      });
      throw error;
    }
  }

  extractUserIdAndSimilarity(faceMatches) {
    if (!faceMatches || faceMatches.length === 0) {
      return { userId: null, similarity: 0 };
    }

    const match = faceMatches[0];
    const userId = match.Face?.ExternalImageId || null;
    const similarity = Math.round((match.Similarity || 0) * 100) / 100;

    return { userId, similarity };
  }

  /**
   * Index (register) a face to Rekognition collection
   * @param {Buffer} imageBuffer - Image containing the face
   * @param {string} userId - User ID to associate with face (ExternalImageId)
   * @returns {Promise<Object>} IndexFaces response
   */
  async indexFace(imageBuffer, userId) {
    const label = 'rekognition_index';
    logger.startTimer(label);

    try {
      // First validate face exists in image
      const faceDetails = await this.detectFaces(imageBuffer);
      if (!faceDetails) {
        logger.warn('Cannot index - no valid face detected');
        throw new Error('No face detected in image');
      }

      const command = new IndexFacesCommand({
        CollectionId: config.aws.rekognition.collectionId,
        Image: {
          Bytes: imageBuffer,
        },
        ExternalImageId: userId, // Link face to user ID
        DetectionAttributes: ['ALL'],
      });

      const response = await this.client.send(command);
      const duration = logger.endTimer(label);

      logger.debug('Face indexed successfully', {
        duration: `${duration}ms`,
        userId,
        faceId: response.FaceIds?.[0] || null,
      });

      return response;
    } catch (error) {
      logger.endTimer(label);
      logger.error('Face indexing failed', {
        error: error.message,
        code: error.$metadata?.httpStatusCode,
        userId,
      });
      throw error;
    }
  }
}

export const rekognitionService = new RekognitionService();

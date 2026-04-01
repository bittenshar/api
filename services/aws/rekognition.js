import { RekognitionClient, SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

class RekognitionService {
  constructor() {
    this.isMockMode = process.env.MOCK_AWS === 'true' || process.env.NODE_ENV === 'development';
    
    if (!this.isMockMode) {
      this.client = new RekognitionClient({
        region: config.aws.region,
      });
    }
  }

  async searchFacesByImage(imageBuffer) {
    const label = 'rekognition_search';
    logger.startTimer(label);

    try {
      if (this.isMockMode) {
        // Mock mode: return dummy matching face data with real user from face-table
        const duration = logger.endTimer(label);
        logger.debug('Rekognition search completed (MOCK MODE)', {
          duration: `${duration}ms`,
          matchesFound: 1,
        });

        return {
          FaceMatches: [
            {
              Similarity: 98.5,
              Face: {
                // Return actual user ID from face-table
                ExternalImageId: '69a5571471e8d2ba3fcecd17',
              },
            },
          ],
        };
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
}

export const rekognitionService = new RekognitionService();

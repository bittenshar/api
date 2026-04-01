import { FaceTable } from '../models/FaceTable.js';
import { logger } from '../utils/logger.js';

class FaceTableService {
  async findUserByUserId(userId) {
    const label = 'db_find_user';
    logger.startTimer(label);

    try {
      const user = await FaceTable.findOne({ userId }).lean();
      const duration = logger.endTimer(label);

      if (user) {
        logger.debug('User found in face-table', {
          userId,
          fullName: user.fullName,
          duration: `${duration}ms`,
        });
      } else {
        logger.debug('User not found in face-table', {
          userId,
          duration: `${duration}ms`,
        });
      }

      return user;
    } catch (error) {
      logger.endTimer(label);
      logger.error('Face-table query failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  async findUserByRekognitionId(rekognitionId) {
    const label = 'db_find_by_rekognition_id';
    logger.startTimer(label);

    try {
      const user = await FaceTable.findOne({ rekognitionId }).lean();
      const duration = logger.endTimer(label);

      logger.debug('Rekognition ID lookup', {
        found: !!user,
        duration: `${duration}ms`,
      });

      return user;
    } catch (error) {
      logger.endTimer(label);
      logger.error('Rekognition ID lookup failed', {
        error: error.message,
      });
      throw error;
    }
  }

  determineUserStatus(user) {
    if (!user) {
      return {
        found: false,
        status: 'not_found',
        color: 'red',
      };
    }

    return {
      found: true,
      status: user.status || 'active',
      color: user.status === 'active' ? 'green' : 'red',
    };
  }
}

export const faceTableService = new FaceTableService();

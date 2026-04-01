import sharp from 'sharp';
import { logger } from '../logger.js';

/**
 * Face cropping utility
 * Extracts and crops detected faces from images
 */
class FaceCropper {
  /**
   * Crop face from image using bounding box coordinates
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {Object} faceDetail - Face details from Rekognition DetectFaces
   * @returns {Promise<Buffer>} Cropped face image buffer
   */
  async cropFaceFromImage(imageBuffer, faceDetail) {
    const label = 'crop_face';
    logger.startTimer(label);

    try {
      if (!faceDetail || !faceDetail.BoundingBox) {
        throw new Error('No bounding box provided for face');
      }

      // Get image metadata to calculate pixel coordinates
      const metadata = await sharp(imageBuffer).metadata();
      const { BoundingBox } = faceDetail;

      // Convert normalized coordinates (0-1) to pixel coordinates
      const left = Math.round(BoundingBox.Left * metadata.width);
      const top = Math.round(BoundingBox.Top * metadata.height);
      const width = Math.round(BoundingBox.Width * metadata.width);
      const height = Math.round(BoundingBox.Height * metadata.height);

      // Add padding around face (10% of face dimensions)
      const paddingX = Math.round(width * 0.1);
      const paddingY = Math.round(height * 0.1);

      const croppedLeft = Math.max(0, left - paddingX);
      const croppedTop = Math.max(0, top - paddingY);
      const croppedWidth = Math.min(width + paddingX * 2, metadata.width - croppedLeft);
      const croppedHeight = Math.min(height + paddingY * 2, metadata.height - croppedTop);

      // Crop and compress the face region
      const croppedBuffer = await sharp(imageBuffer)
        .extract({
          left: croppedLeft,
          top: croppedTop,
          width: croppedWidth,
          height: croppedHeight,
        })
        .jpeg({ quality: 95, progressive: true }) // High quality, progressive loading
        .toBuffer();

      const duration = logger.endTimer(label);

      logger.debug('Face cropped successfully', {
        duration: `${duration}ms`,
        originalSize: imageBuffer.length,
        croppedSize: croppedBuffer.length,
        compression: `${Math.round((1 - croppedBuffer.length / imageBuffer.length) * 100)}%`,
        boundingBox: {
          left: croppedLeft,
          top: croppedTop,
          width: croppedWidth,
          height: croppedHeight,
        },
      });

      return croppedBuffer;
    } catch (error) {
      logger.endTimer(label);
      logger.error('Face cropping failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Crop multiple faces from image
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {Array} faceDetails - Array of face details from Rekognition
   * @returns {Promise<Array>} Array of {buffer, boundingBox, confidence}
   */
  async cropMultipleFaces(imageBuffer, faceDetails) {
    const label = 'crop_multiple_faces';
    logger.startTimer(label);

    try {
      if (!faceDetails || faceDetails.length === 0) {
        return [];
      }

      const croppedFaces = await Promise.all(
        faceDetails.map(async (face, index) => {
          try {
            const buffer = await this.cropFaceFromImage(imageBuffer, face);
            return {
              index,
              buffer,
              boundingBox: face.BoundingBox,
              confidence: face.Confidence,
              size: buffer.length,
            };
          } catch (error) {
            logger.warn(`Failed to crop face ${index}`, { error: error.message });
            return null;
          }
        })
      );

      const duration = logger.endTimer(label);
      const successCount = croppedFaces.filter(f => f !== null).length;

      logger.debug('Multiple faces cropped', {
        duration: `${duration}ms`,
        requestedCount: faceDetails.length,
        successCount,
      });

      return croppedFaces.filter(f => f !== null);
    } catch (error) {
      logger.endTimer(label);
      logger.error('Multiple face cropping failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Resize face image to thumbnail (for storage/display)
   * @param {Buffer} croppedFaceBuffer - Cropped face buffer
   * @param {number} size - Thumbnail size (width x height square)
   * @returns {Promise<Buffer>} Thumbnail buffer
   */
  async generateThumbnail(croppedFaceBuffer, size = 256) {
    const label = 'generate_thumbnail';
    logger.startTimer(label);

    try {
      const thumbnail = await sharp(croppedFaceBuffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const duration = logger.endTimer(label);

      logger.debug('Thumbnail generated', {
        duration: `${duration}ms`,
        originalSize: croppedFaceBuffer.length,
        thumbnailSize: thumbnail.length,
        size: `${size}x${size}`,
        compression: `${Math.round((1 - thumbnail.length / croppedFaceBuffer.length) * 100)}%`,
      });

      return thumbnail;
    } catch (error) {
      logger.endTimer(label);
      logger.error('Thumbnail generation failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Convert image buffer to Base64 data URL (for API responses)
   * @param {Buffer} buffer - Image buffer
   * @param {string} mimeType - MIME type (default: image/jpeg)
   * @returns {string} Data URL
   */
  bufferToDataUrl(buffer, mimeType = 'image/jpeg') {
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Convert image buffer to Base64 string (for storage)
   * @param {Buffer} buffer - Image buffer
   * @returns {string} Base64 string
   */
  bufferToBase64(buffer) {
    return buffer.toString('base64');
  }

  /**
   * Convert Base64 string back to buffer
   * @param {string} base64String - Base64 encoded string
   * @returns {Buffer} Image buffer
   */
  base64ToBuffer(base64String) {
    return Buffer.from(base64String, 'base64');
  }
}

export const faceCropper = new FaceCropper();

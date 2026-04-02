/**
 * Client-side Face Cropping Utility
 * Uses Canvas API to crop face from image before sending to API
 * No dependencies needed - pure JavaScript
 */

class ClientFaceCropper {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Crop face from image using bounding box
   * @param {HTMLImageElement|HTMLCanvasElement|Blob|File} imageSource - Image to crop
   * @param {Object} boundingBox - Bounding box from Rekognition API
   *   { Width: 0.45, Height: 0.55, Left: 0.25, Top: 0.1 }
   * @param {number} padding - Padding percentage (10 = 10% padding)
   * @returns {Promise<Blob>} Cropped face image as JPEG Blob
   */
  async cropFaceFromBoundingBox(imageSource, boundingBox, padding = 10) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          const imgWidth = img.width;
          const imgHeight = img.height;

          // Convert normalized coordinates to pixel coordinates
          let left = Math.round(boundingBox.Left * imgWidth);
          let top = Math.round(boundingBox.Top * imgHeight);
          let width = Math.round(boundingBox.Width * imgWidth);
          let height = Math.round(boundingBox.Height * imgHeight);

          // Add padding
          const paddingX = Math.round((width * padding) / 100);
          const paddingY = Math.round((height * padding) / 100);

          left = Math.max(0, left - paddingX);
          top = Math.max(0, top - paddingY);
          width = Math.min(width + paddingX * 2, imgWidth - left);
          height = Math.min(height + paddingY * 2, imgHeight - top);

          // Set canvas size to cropped region
          this.canvas.width = width;
          this.canvas.height = height;

          // Draw cropped region
          this.ctx.drawImage(img, left, top, width, height, 0, 0, width, height);

          // Convert to JPEG Blob
          this.canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            0.95 // 95% quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));

        // Handle different input types
        if (imageSource instanceof Blob || imageSource instanceof File) {
          img.src = URL.createObjectURL(imageSource);
        } else if (imageSource instanceof HTMLImageElement) {
          img.src = imageSource.src;
        } else if (imageSource instanceof HTMLCanvasElement) {
          img.src = imageSource.toDataURL();
        } else {
          reject(new Error('Unsupported image source type'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Crop an image using manual coordinates
   * @param {HTMLImageElement|Blob|File} imageSource - Image to crop
   * @param {Object} coords - Pixel coordinates {left, top, width, height}
   * @returns {Promise<Blob>} Cropped image as JPEG Blob
   */
  async cropImageByCoordinates(imageSource, coords) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          const { left, top, width, height } = coords;

          // Validate coordinates
          if (left < 0 || top < 0 || width <= 0 || height <= 0) {
            reject(new Error('Invalid crop coordinates'));
            return;
          }

          this.canvas.width = width;
          this.canvas.height = height;

          this.ctx.drawImage(img, left, top, width, height, 0, 0, width, height);

          this.canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            0.95
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));

        if (imageSource instanceof Blob || imageSource instanceof File) {
          img.src = URL.createObjectURL(imageSource);
        } else if (imageSource instanceof HTMLImageElement) {
          img.src = imageSource.src;
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Resize image to fit within max dimensions
   * @param {Blob|File} imageBlob - Image blob
   * @param {number} maxWidth - Maximum width
   * @param {number} maxHeight - Maximum height
   * @returns {Promise<Blob>} Resized image blob
   */
  async resizeImage(imageBlob, maxWidth = 1200, maxHeight = 1200) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          this.canvas.width = width;
          this.canvas.height = height;
          this.ctx.drawImage(img, 0, 0, width, height);

          this.canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            0.95
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(imageBlob);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert blob to File object
   * @param {Blob} blob - Image blob
   * @param {string} filename - File name
   * @returns {File} File object
   */
  blobToFile(blob, filename = 'cropped-face.jpg') {
    return new File([blob], filename, { type: 'image/jpeg' });
  }

  /**
   * Convert blob to base64 data URL
   * @param {Blob} blob - Image blob
   * @returns {Promise<string>} Data URL
   */
  async blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Draw bounding box on canvas for preview
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} boundingBox - Bounding box {Width, Height, Left, Top}
   * @param {string} color - Rectangle color (default: 'red')
   * @param {number} lineWidth - Line width (default: 2)
   */
  drawBoundingBox(canvas, boundingBox, color = 'red', lineWidth = 2) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const left = Math.round(boundingBox.Left * width);
    const top = Math.round(boundingBox.Top * height);
    const boxWidth = Math.round(boundingBox.Width * width);
    const boxHeight = Math.round(boundingBox.Height * height);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(left, top, boxWidth, boxHeight);
  }

  /**
   * Compress image blob for faster upload
   * @param {Blob} blob - Image blob
   * @param {number} quality - Quality 0-1
   * @returns {Promise<Blob>} Compressed blob
   */
  async compressImage(blob, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);

        this.canvas.toBlob(
          (compressedBlob) => resolve(compressedBlob),
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Compress image to target size (200-400 KB) with max 640px width
   * @param {Blob} blob - Image blob
   * @param {number} targetMinSize - Minimum target size in bytes (default 200KB)
   * @param {number} targetMaxSize - Maximum target size in bytes (default 400KB)
   * @param {number} maxWidth - Maximum width in pixels (default 640px)
   * @returns {Promise<Blob>} Compressed blob meeting size constraints
   */
  async compressToTargetSize(
    blob,
    targetMinSize = 200 * 1024,
    targetMaxSize = 400 * 1024,
    maxWidth = 640
  ) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          let { width, height } = img;

          // Step 1: Resize to max 640px width
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          this.canvas.width = width;
          this.canvas.height = height;
          this.ctx.drawImage(img, 0, 0, width, height);

          // Step 2: Find optimal quality to fit 200-400 KB
          let quality = 0.9;
          let compressedBlob;
          const maxAttempts = 10;
          let attempt = 0;

          do {
            compressedBlob = await new Promise((blobResolve) => {
              this.canvas.toBlob(
                (blob) => blobResolve(blob),
                'image/jpeg',
                quality
              );
            });

            if (
              compressedBlob.size >= targetMinSize &&
              compressedBlob.size <= targetMaxSize
            ) {
              // Perfect fit!
              resolve(compressedBlob);
              return;
            }

            if (compressedBlob.size > targetMaxSize) {
              // Too large, reduce quality
              quality -= 0.1;
            } else if (
              compressedBlob.size < targetMinSize &&
              quality < 0.95
            ) {
              // Too small, increase quality slightly
              quality += 0.05;
            } else {
              // Close enough
              resolve(compressedBlob);
              return;
            }

            attempt++;
          } while (attempt < maxAttempts && quality > 0.1 && quality < 0.95);

          // Return best attempt
          resolve(compressedBlob);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  }
}

// Export for use
export const clientFaceCropper = new ClientFaceCropper();

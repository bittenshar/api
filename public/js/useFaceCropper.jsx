import React, { useState, useRef } from 'react';
import { clientFaceCropper } from './clientFaceCropper';

/**
 * React Hook for Face Cropping
 * Usage: const { croppedFace, status, crop } = useFaceCropper();
 */
export const useFaceCropper = () => {
  const [croppedFace, setCroppedFace] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [faceDetails, setFaceDetails] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [error, setError] = useState(null);

  const handleImageUpload = async (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      setStatus('error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      setStatus('error');
      return;
    }

    try {
      setStatus('loading');
      setOriginalImage(file);

      // Step 1: Detect and crop face using API
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/face-crop', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Face detection failed');
      }

      const data = await response.json();

      // Convert base64 to blob
      const base64String = data.croppedFace.data;
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      setCroppedFace({
        blob,
        dataUrl: data.croppedFace.dataUrl,
        size: blob.size,
        thumbnail: data.thumbnail.dataUrl,
      });

      setFaceDetails(data.faceDetails);
      setStatus('success');
      setError(null);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const reset = () => {
    setCroppedFace(null);
    setOriginalImage(null);
    setFaceDetails(null);
    setStatus('idle');
    setError(null);
  };

  return {
    croppedFace,
    originalImage,
    faceDetails,
    status,
    error,
    handleImageUpload,
    reset,
  };
};

/**
 * React Component for Face Cropping
 * Usage: <FaceCropper onCropSuccess={handleCrop} />
 */
export const FaceCropper = ({ onCropSuccess, apiUrl = '/api/face-crop' }) => {
  const fileInputRef = useRef(null);
  const {
    croppedFace,
    originalImage,
    faceDetails,
    status,
    error,
    handleImageUpload,
    reset,
  } = useFaceCropper();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length) {
      handleImageUpload(e.target.files[0]);
    }
  };

  return (
    <div className="face-cropper">
      {!croppedFace ? (
        // Upload Section
        <div
          className="upload-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="upload-content">
            <div className="upload-icon">📸</div>
            <h2>Upload Photo</h2>
            <p>Drag and drop or click to select image</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Processing...' : 'Choose Image'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      ) : (
        // Preview Section
        <div className="preview-section">
          <div className="preview-grid">
            <div className="preview-item">
              <h3>Cropped Face</h3>
              <img src={croppedFace.dataUrl} alt="Cropped face" />
            </div>
            <div className="preview-item">
              <h3>Thumbnail</h3>
              <img src={croppedFace.thumbnail} alt="Thumbnail" />
            </div>
          </div>

          {faceDetails && (
            <div className="face-info">
              <p>
                <strong>Confidence:</strong> {Math.round(faceDetails.confidence)}%
              </p>
              <p>
                <strong>Size:</strong> {formatBytes(croppedFace.size)}
              </p>
            </div>
          )}

          <div className="actions">
            <button
              className="btn-primary"
              onClick={() => onCropSuccess?.(croppedFace)}
            >
              Use Cropped Face
            </button>
            <button className="btn-secondary" onClick={reset}>
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default FaceCropper;

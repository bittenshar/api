# Face Cropping Feature Documentation

## Overview

The face cropping feature uses AWS Rekognition to detect face bounding boxes and **sharp** image processing library to extract and crop faces from uploaded images.

## Features

### ✅ Single Face Cropping
- Detects primary face in image
- Crops face with 10% padding
- Returns high-quality JPEG (95% quality)
- Generates thumbnail for preview
- Returns bounding box and confidence

### ✅ Multiple Face Cropping
- Detects all faces in image
- Crops each face individually
- Parallel processing for speed
- Returns array of cropped faces
- Includes confidence and position data

### ✅ Flexible Output Formats
- **Base64**: Embed directly in JSON responses
- **Data URL**: Use in HTML img tags
- **Buffer**: Download as JPEG file
- **Thumbnail**: 256x256 pixel preview

## API Endpoints

### 1. POST `/api/face-crop` - Single Face Crop

**Purpose**: Extract and crop the primary detected face

**Request:**
```bash
curl -X POST http://localhost:3000/api/face-crop \
  -F "image=@photo.jpg"
```

**Response (200 OK):**
```json
{
  "success": true,
  "croppedFace": {
    "data": "base64_string_here...",
    "mimeType": "image/jpeg",
    "size": 15234,
    "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
  },
  "thumbnail": {
    "data": "base64_string_here...",
    "mimeType": "image/jpeg",
    "size": 4521,
    "dataUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
  },
  "faceDetails": {
    "confidence": 99.8,
    "boundingBox": {
      "Width": 0.45,
      "Height": 0.55,
      "Left": 0.25,
      "Top": 0.1
    },
    "emotionDetails": {
      "smile": true,
      "eyesOpen": true,
      "mouthOpen": false
    }
  },
  "processingTime": "125ms",
  "timestamp": "2024-04-02T12:34:56.789Z"
}
```

**Query Parameters:**
- `returnFormat` (optional): `base64` (default) or `buffer`
  - `base64`: Returns JSON with base64 encoded image
  - `buffer`: Returns raw JPEG file download

**Error Responses:**
```json
// No face detected (400)
{
  "success": false,
  "error": "No face detected in image",
  "timestamp": "..."
}

// Invalid image (400)
{
  "success": false,
  "error": "Invalid image format",
  "timestamp": "..."
}
```

### 2. POST `/api/face-crop-multiple` - Multiple Faces Crop

**Purpose**: Extract and crop all detected faces from image

**Request:**
```bash
curl -X POST http://localhost:3000/api/face-crop-multiple \
  -F "image=@group_photo.jpg"
```

**Response (200 OK):**
```json
{
  "success": true,
  "facesDetected": 2,
  "faces": [
    {
      "index": 0,
      "croppedFace": {
        "data": "base64_string_here...",
        "mimeType": "image/jpeg",
        "size": 18420,
        "dataUrl": "data:image/jpeg;base64,..."
      },
      "thumbnail": {
        "data": "base64_string_here...",
        "mimeType": "image/jpeg"
      },
      "faceDetails": {
        "confidence": 99.2,
        "boundingBox": {
          "Width": 0.40,
          "Height": 0.50,
          "Left": 0.15,
          "Top": 0.05
        }
      }
    },
    {
      "index": 1,
      "croppedFace": {
        "data": "base64_string_here...",
        "mimeType": "image/jpeg",
        "size": 16850,
        "dataUrl": "data:image/jpeg;base64,..."
      },
      "thumbnail": {
        "data": "base64_string_here...",
        "mimeType": "image/jpeg"
      },
      "faceDetails": {
        "confidence": 98.5,
        "boundingBox": {
          "Width": 0.38,
          "Height": 0.48,
          "Left": 0.52,
          "Top": 0.08
        }
      }
    }
  ],
  "processingTime": "245ms",
  "timestamp": "2024-04-02T12:34:56.789Z"
}
```

## Usage Examples

### JavaScript - Display Cropped Face in HTML

```javascript
// Fetch cropped face
const response = await fetch('/api/face-crop', {
  method: 'POST',
  body: formData // FormData with image file
});

const data = await response.json();

// Display in img tag
const img = document.createElement('img');
img.src = data.croppedFace.dataUrl;
document.body.appendChild(img);

// Display thumbnail
const thumb = document.createElement('img');
thumb.src = data.thumbnail.dataUrl;
document.body.appendChild(thumb);
```

### JavaScript - Download Cropped Face as File

```javascript
const response = await fetch('/api/face-crop?returnFormat=buffer', {
  method: 'POST',
  body: formData
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'cropped-face.jpg';
a.click();
```

### Node.js - Process Multiple Faces

```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('image', fs.createReadStream('group_photo.jpg'));

const response = await fetch('http://localhost:3000/api/face-crop-multiple', {
  method: 'POST',
  body: form
});

const data = await response.json();

// Process each cropped face
data.faces.forEach((face, idx) => {
  console.log(`Face ${idx}: Confidence = ${face.faceDetails.confidence}%`);
  
  // Save to file
  const buffer = Buffer.from(face.croppedFace.data, 'base64');
  fs.writeFileSync(`face_${idx}.jpg`, buffer);
});
```

### Python - Save Cropped Faces

```python
import requests
import base64
from pathlib import Path

# Upload image and get cropped faces
with open('group_photo.jpg', 'rb') as f:
    response = requests.post(
        'http://localhost:3000/api/face-crop-multiple',
        files={'image': f}
    )

data = response.json()

# Save each cropped face
for face in data['faces']:
    idx = face['index']
    base64_data = face['croppedFace']['data']
    
    # Decode and save
    image_bytes = base64.b64decode(base64_data)
    Path(f'face_{idx}.jpg').write_bytes(image_bytes)
    
    print(f"Saved face_{idx}.jpg - Confidence: {face['faceDetails']['confidence']}%")
```

## Performance Metrics

### Timing Breakdown

**Single Face Crop:**
```
AWS Rekognition detection:     ~80-100ms
Image cropping with sharp:     ~30-40ms
Thumbnail generation:          ~20-25ms
Response building:             ~5-10ms
─────────────────────────────
TOTAL:                         ~135-175ms
```

**Multiple Faces (2 faces):**
```
AWS Rekognition detection:     ~80-100ms
Crop face 1:                   ~30-40ms
Crop face 2:                   ~30-40ms
Generate thumbnail 1:          ~20-25ms
Generate thumbnail 2:          ~20-25ms
Response building:             ~5-10ms
─────────────────────────────
TOTAL:                         ~185-240ms
```

### File Size Reduction

```
Original image:     2.5 MB
Cropped face:       150-250 KB
Thumbnail (256x256): 30-50 KB
─────
Total response with base64: ~40-75 KB (gzipped: ~8-15 KB)
```

## Bounding Box Format

Rekognition returns normalized coordinates (0-1 scale):

```json
"boundingBox": {
  "Width": 0.45,      // Face width as % of image width
  "Height": 0.55,     // Face height as % of image height
  "Left": 0.25,       // Left edge as % from image left
  "Top": 0.1          // Top edge as % from image top
}
```

**To convert to pixel coordinates:**
```javascript
const imageWidth = 1920;
const imageHeight = 1080;
const bb = { Width: 0.45, Height: 0.55, Left: 0.25, Top: 0.1 };

const pixels = {
  left: Math.round(bb.Left * imageWidth),      // 480
  top: Math.round(bb.Top * imageHeight),       // 108
  width: Math.round(bb.Width * imageWidth),    // 864
  height: Math.round(bb.Height * imageHeight)  // 594
};
```

## Face Details

Each cropped face includes metadata from Rekognition:

```json
"faceDetails": {
  "confidence": 99.8,     // Detection confidence (0-100)
  "boundingBox": {...},   // Position and size
  "emotionDetails": {
    "smile": true,        // Face is smiling
    "eyesOpen": true,     // Eyes are open
    "mouthOpen": false    // Mouth is closed
  }
}
```

## Use Cases

### 1. **Profile Picture Extraction**
```javascript
// User uploads photo
// Extract face automatically
// Store as profile picture
// Display thumbnail in UI
```

### 2. **Group Photo Processing**
```javascript
// Upload group photo
// Crop all faces
// Identify individuals
// Create individual profiles
```

### 3. **ID Verification**
```javascript
// Capture face from document
// Crop automatically
// Compare with reference photo
// Verify identity
```

### 4. **Event Check-in**
```javascript
// Attendee uploads photo at event
// Face cropped automatically
// Matched with registered face
// Check-in confirmed
```

### 5. **Face Collection**
```javascript
// Store cropped faces in database
// Build face recognition dataset
// Improved accuracy over time
// Better Rekognition index
```

## Storage Integration

### MongoDB - Store Cropped Face

```javascript
// Store in MongoDB as base64
db.users.updateOne(
  { userId: "69b1b66bca13f3e8d88925d3" },
  {
    $set: {
      croppedFace: data.croppedFace.data,
      thumbnail: data.thumbnail.data,
      faceMetadata: data.faceDetails,
      croppedAt: new Date()
    }
  }
);
```

### S3 - Store Cropped Face

```javascript
// Upload to AWS S3
const s3 = new AWS.S3();
const buffer = Buffer.from(data.croppedFace.data, 'base64');

await s3.putObject({
  Bucket: 'face-images',
  Key: `cropped/${userId}/face.jpg`,
  Body: buffer,
  ContentType: 'image/jpeg'
}).promise();
```

## Error Handling

### No Face Detected
```json
{
  "success": false,
  "error": "No face detected in image",
  "statusCode": 400
}
```

**Solutions:**
- Ensure face is clearly visible
- Good lighting - avoid backlit images
- Face fills 20-80% of image
- Straight-on angle works best

### Invalid Image Format
```json
{
  "success": false,
  "error": "Invalid image format",
  "statusCode": 400
}
```

**Supported formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- TIFF (.tif, .tiff)

### Face Confidence Too Low
- Rekognition detected face, but confidence < 80%
- Solutions:
  - Better lighting
  - Clearer face visibility
  - Remove partial faces
  - Use higher resolution image

## Configuration

### Confidence Threshold
**File**: `services/aws/rekognition.js`
```javascript
const MIN_FACE_CONFIDENCE = 80; // Adjust 0-100
```

Lower for more faces, higher for quality only.

### Thumbnail Size
**File**: `utils/faceCropper.js`
```javascript
async generateThumbnail(croppedFaceBuffer, size = 256) {
  // Change 256 to desired size
}
```

### Default Quality
**File**: `utils/faceCropper.js`
```javascript
.jpeg({ quality: 95, progressive: true })
```

Adjust quality 1-100 (lower = smaller file).

## Troubleshooting

### "No face detected even though image has face"
1. Check image quality - blurry/low resolution causes issues
2. Check lighting - very dark or bright causes issues
3. Check angle - straight-on works best
4. Try different image format

### "Response is too large"
1. Don't request base64 for large responses
2. Use `returnFormat=buffer` to download file
3. Reduce thumbnail size
4. Request fewer faces

### "Slow processing"
1. Rekognition API latency - add 80-100ms baseline
2. Image size - smaller images are faster
3. Number of faces - more faces = slower

### Sharp not working on Vercel
1. Sharp needs native build tools
2. Vercel handles this automatically
3. If issues, use serverless image service instead

## Limits & Quotas

- **Max image size**: 5 MB
- **Max faces per image**: No limit (Rekognition scans all)
- **Max image dimensions**: 5000x5000 pixels (recommended)
- **Supported formats**: JPEG, PNG, GIF, WebP, TIFF
- **Min face size**: 40x40 pixels
- **Max concurrent requests**: Depends on Vercel plan

## Performance Tips

1. **Compress images before upload**
   ```javascript
   // Use sharp to compress first
   const compressed = await sharp(imageBuffer)
     .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
     .toBuffer();
   ```

2. **Cache cropped faces**
   ```javascript
   // Store in Redis for fast retrieval
   redis.setex(`face:${userId}`, 3600, base64Data);
   ```

3. **Use thumbnails in UI**
   ```javascript
   // Display thumbnail instead of full crop
   // 256x256 is perfect for profile pictures
   ```

4. **Batch process multiple images**
   ```javascript
   // Process sequentially to avoid rate limits
   for (const image of images) {
     await processFace(image);
   }
   ```

## Future Enhancements

- [ ] Face alignment (rotate to frontal)
- [ ] Enhance resolution (super-resolution)
- [ ] Background removal
- [ ] Face beautification (optional)
- [ ] Batch download as ZIP
- [ ] Direct S3 upload option
- [ ] WebP output format
- [ ] Progressive image loading

## Quick Test

```bash
# Start server
npm start

# Test single face crop
curl -X POST http://localhost:3000/api/face-crop \
  -F "image=@test_photo.jpg" \
  | jq '.thumbnail.dataUrl' \
  | head -c 50

# Test multiple faces
curl -X POST http://localhost:3000/api/face-crop-multiple \
  -F "image=@group_photo.jpg" \
  | jq '.facesDetected'
```

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Rekognition documentation
3. Check sharp documentation
4. Open GitHub issue with:
   - Image used
   - Exact error
   - Expected vs actual result

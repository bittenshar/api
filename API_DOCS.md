# Face Verification API Documentation

## Overview

High-performance microservice for real-time face verification using AWS Rekognition and MongoDB. Designed for deployment on AWS Lambda or EC2 with sub-2-second response times.

**Base URL:** `https://your-api-endpoint`

---

## Endpoints

### 1. POST /api/face-verify

Verify a face image against AWS Rekognition collection and check booking status.

**Authentication:** None (public endpoint)

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | file | Yes | Image file (JPG, PNG, WebP) max 5MB |
| eventId | string | Yes | MongoDB ObjectId of the event |

**Example Request:**
```bash
curl -X POST https://api.example.com/api/face-verify \
  -F "image=@user-face.jpg" \
  -F "eventId=507f1f77bcf86cd799439011"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "userId": "user-67890",
  "fullName": "John Doe",
  "hasTicket": true,
  "ticketStatus": "valid",
  "color": "green",
  "similarity": 98.5,
  "timestamp": "2024-04-01T10:30:45.123Z"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Request success status |
| userId | string \| null | Extracted user ID from Rekognition (ExternalImageId) |
| fullName | string \| null | User's full name from booking |
| hasTicket | boolean | Whether user has a valid booking |
| ticketStatus | string | Status: `valid`, `already_used`, `no_ticket`, `no_match` |
| color | string | Visual indicator: `green` (valid), `blue` (used), `red` (invalid/no match) |
| similarity | number | Face match confidence (0-100) |
| timestamp | string | ISO 8601 timestamp |

**Ticket Status Codes:**
- `valid` - Booking exists and not used (color: green)
- `already_used` - Booking exists but already used (color: blue)
- `no_ticket` - No booking found (color: red)
- `no_match` - No face match in Rekognition (color: red)

**Error Responses:**

**400 Bad Request - Missing/Invalid Image:**
```json
{
  "success": false,
  "error": {
    "message": "Image is required and must not be empty",
    "statusCode": 400,
    "timestamp": "2024-04-01T10:30:45.123Z"
  }
}
```

**400 Bad Request - Invalid EventId:**
```json
{
  "success": false,
  "error": {
    "message": "eventId must be a valid MongoDB ObjectId",
    "statusCode": 400,
    "timestamp": "2024-04-01T10:30:45.123Z"
  }
}
```

**400 Bad Request - Image Too Large:**
```json
{
  "success": false,
  "error": {
    "message": "Image size exceeds 5MB limit",
    "statusCode": 400,
    "timestamp": "2024-04-01T10:30:45.123Z"
  }
}
```

**400 Bad Request - Invalid Image Type:**
```json
{
  "success": false,
  "error": {
    "message": "Only image files are allowed",
    "statusCode": 400,
    "timestamp": "2024-04-01T10:30:45.123Z"
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "message": "Error searching faces in Rekognition",
    "statusCode": 500,
    "timestamp": "2024-04-01T10:30:45.123Z"
  }
}
```

---

### 2. GET /health

Health check endpoint for monitoring and load balancer integration.

**Authentication:** None

**Example Request:**
```bash
curl https://api.example.com/health
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Service is healthy",
  "timestamp": "2024-04-01T10:30:45.123Z"
}
```

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success - request processed successfully |
| 400 | Bad Request - validation error |
| 500 | Internal Server Error - server error |

---

## Performance Metrics

Included in response logs (not in API response):

```
{
  "duration": "850ms",        // Total end-to-end time
  "rekognitionTime": "800ms", // AWS Rekognition search time
  "dbQueryTime": "50ms"       // MongoDB query time
}
```

---

## Use Cases

### Case 1: Successful Verification (Green)
```json
{
  "userId": "user-123",
  "hasTicket": true,
  "ticketStatus": "valid",
  "color": "green",
  "similarity": 98.5
}
```
→ User has valid ticket, can proceed

### Case 2: Already Used (Blue)
```json
{
  "userId": "user-456",
  "hasTicket": true,
  "ticketStatus": "already_used",
  "color": "blue",
  "similarity": 97.2
}
```
→ User already checked in, flag as duplicate entry

### Case 3: No Ticket (Red)
```json
{
  "userId": "user-789",
  "hasTicket": false,
  "ticketStatus": "no_ticket",
  "color": "red",
  "similarity": 0
}
```
→ No booking found, deny entry

### Case 4: Face Not Found (Red)
```json
{
  "userId": null,
  "fullName": null,
  "hasTicket": false,
  "ticketStatus": "no_match",
  "color": "red",
  "similarity": 0
}
```
→ Face not in Rekognition collection, deny entry

---

## Rate Limiting

No built-in rate limiting. Implement at:
- API Gateway level
- Load balancer level
- Application level (add middleware)

Example middleware:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

---

## Best Practices

### 1. Image Upload
- Use multipart/form-data encoding
- Compress images before upload (JPEG recommended)
- Max file size: 5MB
- Supported formats: JPG, PNG, WebP

### 2. Error Handling
- Always check `success` field first
- Log `timestamp` for debugging
- Implement retry logic for 5xx errors
- Use exponential backoff for retries

### 3. Performance
- Batch requests if possible (use concurrency limits)
- Cache EventId-to-BookingId mappings if appropriate
- Monitor response times for SLA violations
- Use connection pooling on client side

### 4. Security
- Validate image format on client side
- Use HTTPS in production
- Implement API key authentication (optional)
- Log all access attempts
- Implement request signing (optional)

Example: Add API Key Middleware
```javascript
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use(validateApiKey);
```

---

## Integration Examples

### JavaScript/Node.js
```javascript
import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

async function verifyFace(imagePath, eventId) {
  const formData = new FormData();
  formData.append('image', fs.createReadStream(imagePath));
  formData.append('eventId', eventId);

  try {
    const response = await axios.post(
      'https://api.example.com/api/face-verify',
      formData,
      { headers: formData.getHeaders() }
    );
    
    console.log(response.data);
    
    if (response.data.color === 'green') {
      console.log('✅ Access granted');
    } else {
      console.log('❌ Access denied');
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

verifyFace('./face.jpg', '507f1f77bcf86cd799439011');
```

### Python
```python
import requests

def verify_face(image_path, event_id):
    with open(image_path, 'rb') as f:
        files = {'image': f, 'eventId': (None, event_id)}
        
        response = requests.post(
            'https://api.example.com/api/face-verify',
            files=files
        )
    
    data = response.json()
    print(data)
    
    if data['color'] == 'green':
        print('✅ Access granted')
    else:
        print('❌ Access denied')

verify_face('face.jpg', '507f1f77bcf86cd799439011')
```

### cURL
```bash
curl -X POST https://api.example.com/api/face-verify \
  -F "image=@face.jpg" \
  -F "eventId=507f1f77bcf86cd799439011" \
  -H "Content-Type: multipart/form-data"
```

---

## Troubleshooting

### Issue: "Image is required and must not be empty"
- Ensure image file is included in request
- Check file size > 0 bytes
- Verify field name is exactly "image"

### Issue: "eventId must be a valid MongoDB ObjectId"
- EventId must be 24-character hex string
- Format: `507f1f77bcf86cd799439011`
- Check for typos

### Issue: "Image size exceeds 5MB limit"
- Compress image before upload
- Use JPG format instead of PNG if possible
- Check actual file size

### Issue: Slow response (>2s)
- Check MongoDB connection pool size
- Verify Rekognition collection is indexed
- Monitor AWS region latency
- Check network latency

### Issue: Face not matching
- Ensure face is in Rekognition collection
- Check image quality
- Verify proper lighting
- Check ExternalImageId matches userId

### Issue: Always returns "no_ticket"
- Verify booking exists in MongoDB
- Check userId from Rekognition matches database
- Verify eventId is correct
- Check booking isn't expired/cancelled

---

## Monitoring & Alerts

Key metrics to monitor:

1. **Response Time**
   - Alert if > 2 seconds
   - Track p95, p99 percentiles

2. **Error Rate**
   - Alert if > 5%
   - Monitor by error type

3. **Success Rate**
   - Track face match rate
   - Track booking found rate

4. **Throughput**
   - Requests per second
   - Concurrent requests

Monitor via:
- CloudWatch (Lambda)
- Application Performance Monitoring (PM2)
- Custom dashboards
- Log aggregation (ELK, Datadog)

---

## SLA & Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Response Time (avg) | < 1.5s | > 1.5s | > 2s |
| Response Time (p95) | < 2s | > 2s | > 2.5s |
| Success Rate | > 99% | < 99% | < 95% |
| Error Rate | < 1% | > 1% | > 5% |
| Availability | > 99.9% | > 99.5% | < 99.5% |

---

## API Timeline Evolution

**v1.0** (Current)
- Face verification via Rekognition
- Booking status check
- Health endpoint
- MongoDB integration

**v2.0** (Planned)
- Batch verification endpoint
- Caching layer (Redis)
- Advanced analytics
- Webhook notifications
- Rate limiting

---

## Support

For API issues:
1. Check error response message
2. Review logs for timing details
3. Verify environment configuration
4. Test health endpoint
5. Contact support team

---

## Version

**API Version:** 1.0.0
**Last Updated:** 2024-04-01

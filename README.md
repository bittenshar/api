# Face Verification Microservice

A high-performance Node.js backend for real-time face verification using AWS Rekognition. Optimized for speed with a target response time of 1-2 seconds.

## Features

✅ **High Performance**
- Memory-based image storage (no disk I/O)
- Optimized MongoDB queries with indexes
- Single database call per request
- Execution time logging for each step
- Stateless architecture (Lambda-ready)

✅ **AWS Rekognition Integration**
- SearchFacesByImage with configurable threshold
- ExternalImageId as userId extraction
- Similarity score tracking

✅ **MongoDB Integration**
- Mongoose with lean queries
- Compound indexes for fast lookups
- Connection pooling for concurrency

✅ **Production Ready**
- Error handling middleware
- Request logging with timing
- Environment configuration
- Health check endpoint
- Graceful shutdown

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **AWS**: AWS SDK v3 (Rekognition)
- **Image Upload**: Multer (memory storage)

## Project Structure

```
aws-api/
├── config/                    # Configuration management
│   └── index.js
├── controllers/               # Request handlers
│   └── faceVerification.js
├── models/                    # Mongoose schemas
│   └── Booking.js
├── routes/                    # Route definitions
│   └── index.js
├── services/                  # Business logic
│   ├── aws/
│   │   └── rekognition.js
│   └── booking.js
├── middlewares/               # Express middlewares
│   ├── errorHandler.js
│   └── requestLogger.js
├── utils/                     # Utility functions
│   ├── logger.js
│   ├── validation.js
│   └── database.js
├── index.js                   # Main entry point
├── package.json
├── .env.example
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- AWS Account with Rekognition Collection
- AWS Credentials

### Setup

1. **Clone/navigate to project**
   ```bash
   cd aws-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your values:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_REKOGNITION_COLLECTION_ID=your_collection
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start          # Production
   npm run dev        # Development with nodemon
   ```

Server will start on `http://localhost:3000`

## API Endpoints

### POST /api/face-verify

Verify face and check booking status.

**Request:**
- `Content-Type`: multipart/form-data
- **Fields:**
  - `image` (required): Image file (JPG, PNG)
  - `eventId` (required): MongoDB ObjectId of event

**Example:**
```bash
curl -X POST http://localhost:3000/api/face-verify \
  -F "image=@face.jpg" \
  -F "eventId=66148a2c1b2c3d4e5f6g7h8i"
```

**Success Response (200):**
```json
{
  "success": true,
  "userId": "user-123",
  "fullName": "John Doe",
  "hasTicket": true,
  "ticketStatus": "valid",
  "color": "green",
  "similarity": 98.5,
  "timestamp": "2024-04-01T10:30:00.000Z"
}
```

**Possible Colors:**
- `red`: No face match or no booking
- `green`: Valid booking, not used
- `blue`: Valid booking, already used

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "message": "Image is required and must not be empty",
    "statusCode": 400,
    "timestamp": "2024-04-01T10:30:00.000Z"
  }
}
```

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "success": true,
  "message": "Service is healthy",
  "timestamp": "2024-04-01T10:30:00.000Z"
}
```

## Performance Optimizations

1. **Memory Storage**: Image handled in memory via Multer
2. **Lean Queries**: `.lean()` returns plain objects instead of Mongoose documents
3. **Indexing**: Compound indexes on (userId, eventId)
4. **Single DB Call**: No countDocuments queries
5. **Connection Pooling**: 5-10 MongoDB connections
6. **Execution Logging**: Track timing for each major operation
7. **Stateless Design**: Ready for Lambda/serverless deployment

## Logging

Logs include structured JSON with timestamps and execution times:

```json
{
  "timestamp": "2024-04-01T10:30:00.123Z",
  "level": "info",
  "message": "Face Verification",
  "matched": true,
  "userId": "user-123",
  "hasTicket": true,
  "color": "green",
  "duration": "850ms",
  "similarity": 98.5
}
```

Monitor performance with duration fields:
- `rekognition_search`: AWS Rekognition call time
- `db_find_booking`: MongoDB query time
- `overall_request`: Total end-to-end time

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| AWS_REGION | AWS region | Yes |
| AWS_ACCESS_KEY_ID | AWS credentials | Yes |
| AWS_SECRET_ACCESS_KEY | AWS credentials | Yes |
| AWS_REKOGNITION_COLLECTION_ID | Rekognition collection | Yes |
| MONGO_URI | MongoDB connection string | Yes |
| PORT | Server port | No (default: 3000) |
| NODE_ENV | Environment mode | No (default: development) |
| LOG_LEVEL | Logging level (error, warn, info, debug) | No (default: info) |
| FACE_MATCH_THRESHOLD | Rekognition threshold (0-100) | No (default: 90) |
| MAX_FACES | Max faces to search | No (default: 1) |

## AWS Rekognition Collection Setup

Before running the service, create a Rekognition collection:

```javascript
// Using AWS SDK v3
import { RekognitionClient, CreateCollectionCommand } from '@aws-sdk/client-rekognition';

const client = new RekognitionClient({ region: 'us-east-1' });
const command = new CreateCollectionCommand({
  CollectionId: 'face-collection-name'
});

await client.send(command);
```

Add faces to collection with ExternalImageId as userId:

```javascript
import { RekognitionClient, IndexFacesCommand } from '@aws-sdk/client-rekognition';

const command = new IndexFacesCommand({
  CollectionId: 'face-collection-name',
  Image: { Bytes: imageBuffer },
  ExternalImageId: 'user-123' // This becomes userId
});

await client.send(command);
```

## MongoDB Schema

**Booking Model:**
```javascript
{
  userId: String (indexed),
  eventId: ObjectId (indexed),
  fullName: String,
  status: String ('confirmed', 'pending', 'cancelled'),
  quantity: Number,
  seatType: String,
  totalPrice: Number,
  isUsed: Boolean (indexed),
  createdAt: Date (indexed),
  updatedAt: Date
}
```

**Compound Indexes:**
- `{ userId: 1, eventId: 1 }`
- `{ userId: 1, eventId: 1, isUsed: 1 }`

## Deployment

### AWS Lambda

1. Package code:
   ```bash
   npm install --production
   zip -r function.zip .
   ```

2. Create Lambda function with the zip

3. Set environment variables in Lambda console

4. For API Gateway: map `/api/face-verify` to `POST` method

5. **Important**: Handler should be `index.app` for API Gateway proxy integration

### EC2

1. SSH to instance
2. Install Node.js 18+
3. Clone repository
4. Install dependencies: `npm install --production`
5. Set environment variables
6. Start with PM2:
   ```bash
   npm install -g pm2
   pm2 start index.js --name="face-verification"
   pm2 startup
   pm2 save
   ```

### Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

Build and run:
```bash
docker build -t face-verification .
docker run -e AWS_REGION=us-east-1 -p 3000:3000 face-verification
```

## Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# Face verification
curl -X POST http://localhost:3000/api/face-verify \
  -H "Content-Type: multipart/form-data" \
  -F "image=@test-image.jpg" \
  -F "eventId=66148a2c1b2c3d4e5f6g7h8i"
```

### Performance Testing

Load testing with Apache Bench:
```bash
ab -n 1000 -c 10 -p data.json -T application/json http://localhost:3000/api/face-verify
```

## Error Handling

The service handles:
- Missing/invalid image
- Invalid eventId format
- AWS Rekognition errors
- MongoDB connection failures
- Database query errors
- Large file uploads
- Invalid image types

All errors return structured JSON responses with appropriate HTTP status codes.

## Performance Benchmarks (Target)

- **Total Request**: 1-2 seconds
- **Rekognition Search**: 800-1000ms
- **MongoDB Query**: 50-100ms
- **Image Processing**: 50-200ms

## Monitoring

Key metrics to track:

1. **Response Time**: `duration` field in logs
2. **Success Rate**: Monitor 2xx responses
3. **Error Rate**: Monitor 4xx/5xx responses
4. **Face Match Rate**: Successful matches vs. no-match
5. **Database Latency**: Monitor `db_find_booking` times
6. **AWS Rekognition**: Monitor `rekognition_search` times

## Troubleshooting

### Slow Response Times
- Check MongoDB connection pool
- Verify Rekognition collection is indexed
- Monitor AWS region latency

### Connection Errors
- Verify MongoDB URI
- Check AWS credentials
- Ensure security groups allow connections

### 400 Bad Request
- Check image format (JPG/PNG)
- Verify eventId format
- Ensure multipart/form-data encoding

### 404 Not Found
- Verify booking exists in database
- Check userId extraction from Rekognition

## License

ISC

## Support

For issues or questions, contact the development team.
# api

# Testing Guide - Face Verification Microservice

Complete testing strategy for the Face Verification API.

---

## 1. Unit Tests

Create `tests/unit/` directory with test files.

### Example: validation.test.js

```javascript
import { validateRequest, validateImage, isValidObjectId } from '../../utils/validation.js';

describe('Validation Utilities', () => {
  describe('validateRequest', () => {
    it('should reject missing image', () => {
      const result = validateRequest(null, '507f1f77bcf86cd799439011');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Image');
    });

    it('should reject missing eventId', () => {
      const mockImage = { buffer: Buffer.from('test') };
      const result = validateRequest(mockImage, '');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('eventId');
    });

    it('should reject invalid eventId format', () => {
      const mockImage = { buffer: Buffer.from('test') };
      const result = validateRequest(mockImage, 'invalid-id');
      expect(result.valid).toBe(false);
    });

    it('should accept valid request', () => {
      const mockImage = { buffer: Buffer.from('test-image') };
      const result = validateRequest(mockImage, '507f1f77bcf86cd799439011');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateImage', () => {
    it('should reject empty image', () => {
      const result = validateImage(Buffer.from(''));
      expect(result.valid).toBe(false);
    });

    it('should reject oversized image', () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const result = validateImage(largeBuffer);
      expect(result.valid).toBe(false);
    });

    it('should accept valid image', () => {
      const validBuffer = Buffer.from('valid image data');
      const result = validateImage(validBuffer);
      expect(result.valid).toBe(true);
    });
  });

  describe('isValidObjectId', () => {
    it('should validate correct ObjectId', () => {
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    });

    it('should reject invalid ObjectId', () => {
      expect(isValidObjectId('invalid')).toBe(false);
      expect(isValidObjectId('')).toBe(false);
    });
  });
});
```

---

## 2. Integration Tests

Create `tests/integration/` directory.

### Example: faceVerification.integration.test.js

```javascript
import request from 'supertest';
import app from '../../index.js';
import { Booking } from '../../models/Booking.js';
import mongoose from 'mongoose';
import fs from 'fs';

describe('Face Verification API Integration', () => {
  let eventId;
  let testImagePath = './test-image.jpg';

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGO_URI_TEST);
    
    // Create test event
    eventId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await Booking.deleteMany({});
    await mongoose.disconnect();
  });

  describe('POST /api/face-verify', () => {
    it('should return 400 if image is missing', async () => {
      const response = await request(app)
        .post('/api/face-verify')
        .field('eventId', eventId.toString());

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 if eventId is invalid', async () => {
      const response = await request(app)
        .post('/api/face-verify')
        .attach('image', testImagePath)
        .field('eventId', 'invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('ObjectId');
    });

    it('should return green status for valid booking', async () => {
      // Create booking in database
      await Booking.create({
        userId: 'test-user-123',
        eventId,
        fullName: 'Test User',
        status: 'confirmed',
        totalPrice: 100,
        isUsed: false,
      });

      const response = await request(app)
        .post('/api/face-verify')
        .attach('image', testImagePath)
        .field('eventId', eventId.toString());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.color).toBe('green');
      expect(response.body.hasTicket).toBe(true);
    });

    it('should return blue status for used booking', async () => {
      // Update booking to used
      await Booking.updateOne(
        { userId: 'test-user-123', eventId },
        { isUsed: true }
      );

      const response = await request(app)
        .post('/api/face-verify')
        .attach('image', testImagePath)
        .field('eventId', eventId.toString());

      expect(response.status).toBe(200);
      expect(response.body.color).toBe('blue');
      expect(response.body.ticketStatus).toBe('already_used');
    });

    it('should return red status for no booking', async () => {
      const newEventId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/face-verify')
        .attach('image', testImagePath)
        .field('eventId', newEventId.toString());

      expect(response.status).toBe(200);
      expect(response.body.color).toBe('red');
      expect(response.body.hasTicket).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return 200 with healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('healthy');
    });
  });
});
```

---

## 3. Load/Performance Tests

### Using Apache Bench

```bash
# Single request
ab -n 1 -c 1 http://localhost:3000/health

# 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3000/health

# With POST data
ab -n 100 -c 10 \
  -p data.json \
  -T application/json \
  http://localhost:3000/api/face-verify
```

### Using wrk (Advanced)

```bash
# Install wrk
brew install wrk  # macOS
sudo apt-get install wrk  # Ubuntu

# Simple load test
wrk -t4 -c100 -d30s http://localhost:3000/health

# With custom script
wrk -t4 -c100 -d30s -s script.lua http://localhost:3000/api/face-verify
```

### Using Artillery

```bash
# Install
npm install -g artillery

# Create load-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "Face Verification"
    flow:
      - post:
          url: "/api/face-verify"
          formData:
            image: "@test-image.jpg"
            eventId: "66148a2c1b2c3d4e5f6g7h8i"

# Run test
artillery run load-test.yml
```

### Custom Performance Test

```bash
# Using the built-in script
NUM_REQUESTS=1000 CONCURRENT=50 node scripts/performance-test.js

# With environment
API_URL=http://localhost:3000 \
NUM_REQUESTS=500 \
CONCURRENT=25 \
EVENT_ID=66148a2c1b2c3d4e5f6g7h8i \
node scripts/performance-test.js
```

---

## 4. Manual Testing

### Test Cases

#### TC-001: Valid Face Verification
```bash
# Setup: Create booking in MongoDB
# Request: POST with valid image and eventId
# Expected: 200 OK, color=green

curl -X POST http://localhost:3000/api/face-verify \
  -F "image=@valid-face.jpg" \
  -F "eventId=66148a2c1b2c3d4e5f6g7h8i"
```

#### TC-002: Missing Image
```bash
# Request: POST without image
# Expected: 400 Bad Request

curl -X POST http://localhost:3000/api/face-verify \
  -F "eventId=66148a2c1b2c3d4e5f6g7h8i"
```

#### TC-003: Invalid EventId
```bash
# Request: POST with invalid eventId
# Expected: 400 Bad Request

curl -X POST http://localhost:3000/api/face-verify \
  -F "image=@face.jpg" \
  -F "eventId=invalid"
```

#### TC-004: Image Too Large
```bash
# Request: POST with file > 5MB
# Expected: 400 Bad Request

# Create large test file
dd if=/dev/zero of=large.jpg bs=1M count=6

curl -X POST http://localhost:3000/api/face-verify \
  -F "image=@large.jpg" \
  -F "eventId=66148a2c1b2c3d4e5f6g7h8i"
```

#### TC-005: Invalid Image Type
```bash
# Request: POST with non-image file
# Expected: 400 Bad Request

curl -X POST http://localhost:3000/api/face-verify \
  -F "image=@document.pdf" \
  -F "eventId=66148a2c1b2c3d4e5f6g7h8i"
```

#### TC-006: Health Check
```bash
# Request: GET /health
# Expected: 200 OK

curl http://localhost:3000/health
```

---

## 5. Regression Testing

### Test Suite

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/validation.test.js

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### CI/CD Integration

`.github/workflows/test.yml`:
```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

---

## 6. Security Testing

### SQL Injection (if applicable)
- Test special characters in eventId
- Test XSS payloads in form data

### File Upload Security
- Test with executable files
- Test with malicious image files
- Test path traversal in filename

### API Security
- Test without authentication
- Test with invalid API keys
- Test rate limiting

### AWS Credentials Security
- Ensure credentials are not logged
- Test credential rotation
- Verify IAM policies are minimal

---

## 7. Stress Testing

### Determine Breaking Point

```bash
# Gradually increase concurrent requests
for i in 10 50 100 500 1000 5000; do
  echo "Testing with $i concurrent requests..."
  ab -n 10000 -c $i http://localhost:3000/health
done
```

### Monitor During Stress Test

```bash
# In separate terminal
# Monitor CPU usage
watch -n 1 'ps aux | grep node'

# Monitor memory
pm2 monit

# Monitor logs
pm2 logs face-verification
```

---

## 8. Latency Analysis

### Using Response Time Logs

```javascript
// Extract timing from logs
const logs = fs.readFileSync('app.log', 'utf8');
const lines = logs.split('\n');

const durations = lines
  .filter(l => l.includes('duration'))
  .map(l => {
    const match = l.match(/"duration":"(\d+)ms"/);
    return match ? parseInt(match[1]) : 0;
  });

const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
const sorted = durations.sort((a, b) => a - b);
const p95 = sorted[Math.floor(sorted.length * 0.95)];
const p99 = sorted[Math.floor(sorted.length * 0.99)];

console.log(`Average: ${avg}ms, P95: ${p95}ms, P99: ${p99}ms`);
```

---

## 9. Error Scenario Testing

### Test Network Failures

```javascript
// Simulate network timeout
import { server } from 'http';

const testServer = http.createServer((req, res) => {
  // Timeout after 5 seconds
  setTimeout(() => res.end(), 5000);
});
```

### Test Database Failures

```javascript
// Stop MongoDB
sudo systemctl stop mongodb

# Try API request
curl http://localhost:3000/api/face-verify

# Expected: 500 error with graceful message
```

### Test AWS Failures

```bash
# Use VCR or similar to mock AWS failures
# Test with invalid collection ID
# Test with insufficient permissions
```

---

## 10. Monitoring & Observability

### Prometheus Metrics

```javascript
import promClient from 'prom-client';

const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

// Add middleware to track
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpDuration.labels(req.method, req.route?.path || req.path, res.statusCode).observe(duration);
  });
  next();
});
```

### Dashboard

- Monitor request rate
- Track error rate
- Monitor response times
- Track database latency
- Monitor AWS API calls

---

## 11. Test Data Preparation

### MongoDB Seed Data

```javascript
// seed.js
import mongoose from 'mongoose';
import { Booking } from './models/Booking.js';

async function seedDatabase() {
  await mongoose.connect(process.env.MONGO_URI);

  const bookings = [
    {
      userId: 'user-123',
      eventId: '66148a2c1b2c3d4e5f6g7h8i',
      fullName: 'John Doe',
      status: 'confirmed',
      quantity: 1,
      seatType: 'VIP',
      totalPrice: 150,
      isUsed: false,
    },
    // More test data...
  ];

  await Booking.insertMany(bookings);
  console.log('Database seeded');
  process.exit(0);
}

seedDatabase().catch(console.error);
```

Run with: `node seed.js`

---

## 12. Continuous Testing

### Watch Mode Development

```bash
npm run dev  # Auto-restarts on file changes
```

### Pre-commit Hooks

```bash
# Install husky
npm install husky --save-dev

# Setup
npx husky install

# Add hook
npx husky add .husky/pre-commit "npm test"
```

---

## Summary

| Test Type | Tool | Command |
|-----------|------|---------|
| Unit | Jest | `npm test` |
| Integration | Jest + Supertest | `npm test -- integration` |
| Load | Apache Bench | `ab -n 1000 -c 100` |
| Performance | Custom Script | `NUM_REQUESTS=1000 node scripts/performance-test.js` |
| Monitoring | PM2 | `pm2 monit` |

---

**Happy testing! 🧪**

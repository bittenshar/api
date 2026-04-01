# Quick Start Guide - Face Verification Microservice

Get up and running in **5 minutes**.

---

## 1️⃣ Prerequisites

- Node.js 18+ installed
- MongoDB account (local or Atlas)
- AWS account with Rekognition collection
- AWS credentials configured

---

## 2️⃣ Installation (2 minutes)

```bash
# Navigate to project
cd aws-api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

**Fill in these values:**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REKOGNITION_COLLECTION_ID=your-collection
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
PORT=3000
```

---

## 3️⃣ Start the Server (1 minute)

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Expected output:
```
{"timestamp":"2024-04-01T10:30:00.000Z","level":"info","message":"Connecting to MongoDB..."}
{"timestamp":"2024-04-01T10:30:02.000Z","level":"info","message":"MongoDB connected successfully"}
{"timestamp":"2024-04-01T10:30:02.000Z","level":"info","message":"Server started","port":3000,"environment":"development"}
```

✅ Server running on `http://localhost:3000`

---

## 4️⃣ Test the API (1 minute)

### Health Check
```bash
curl http://localhost:3000/health
```

Expected:
```json
{"success":true,"message":"Service is healthy","timestamp":"2024-04-01T10:30:00.000Z"}
```

### Face Verification
```bash
curl -X POST http://localhost:3000/api/face-verify \
  -F "image=@test-image.jpg" \
  -F "eventId=66148a2c1b2c3d4e5f6g7h8i"
```

Expected:
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

---

## 5️⃣ Deploy to AWS (Choose One)

### Option A: Docker (Easiest)

```bash
# Build Docker image
docker-compose build

# Run container
docker-compose up -d

# View logs
docker-compose logs -f face-verification
```

### Option B: AWS Lambda

```bash
# See AWS_DEPLOYMENT.md
# Section: "AWS Lambda Deployment"
```

### Option C: EC2

```bash
# See AWS_DEPLOYMENT.md
# Section: "AWS EC2 Deployment"
```

---

## 📊 Project Structure

```
aws-api/
├── config/              # Environment & configuration
├── controllers/         # Request handlers
├── models/              # MongoDB schemas
├── routes/              # API routes
├── services/            # Business logic
├── middlewares/         # Express middlewares
├── utils/               # Utilities (logger, validation, db)
├── index.js             # Entry point
├── Dockerfile           # Container config
└── docker-compose.yml   # Docker compose config
```

---

## 🚀 Performance

**Target response time:** 1-2 seconds

**What happens in each request:**
1. Validate image & eventId (50ms)
2. Search faces in AWS Rekognition (800-1000ms)
3. Query MongoDB for booking (50-100ms)
4. Return response (50ms)

**Total:** ~900-1200ms

---

## 📝 Key Files to Know

| File | Purpose |
|------|---------|
| `index.js` | Server startup & middleware setup |
| `config/index.js` | Environment variables |
| `controllers/faceVerification.js` | Verification logic |
| `services/aws/rekognition.js` | AWS Rekognition integration |
| `services/booking.js` | Database queries |
| `models/Booking.js` | MongoDB schema |
| `utils/logger.js` | Performance logging |

---

## 🔧 Common Issues & Fixes

### Issue: "Missing environment variables"
```bash
cp .env.example .env
# Fill in your actual values
nano .env
```

### Issue: "MongoDB connection failed"
- Check MONGO_URI format
- Verify IP whitelist in MongoDB Atlas
- Test connection: `mongoosh "your-mongo-uri"`

### Issue: "AWS credentials not found"
```bash
# Set AWS credentials via environment
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret

# Or use AWS credentials file
# ~/.aws/credentials
```

### Issue: "Rekognition collection not found"
```bash
# Create collection first
aws rekognition create-collection --collection-id your-collection
```

### Issue: "Face not found in collection"
- Add face to Rekognition collection first
- Use ExternalImageId as userId

---

## 📚 Next Steps

1. **Setup Monitoring:**
   - Monitor logs for performance
   - Set up CloudWatch alarms
   - Track response times

2. **Load Testing:**
   ```bash
   # Performance test
   NUM_REQUESTS=1000 CONCURRENT=100 node scripts/performance-test.js
   ```

3. **Production Checklist:**
   - [ ] All env vars configured
   - [ ] MongoDB backups enabled
   - [ ] SSL certificate installed
   - [ ] CloudWatch alarms set
   - [ ] Error monitoring enabled
   - [ ] Rate limiting configured

4. **Further Reading:**
   - See `README.md` for detailed docs
   - See `API_DOCS.md` for API reference
   - See `AWS_DEPLOYMENT.md` for deployment details

---

## 🆘 Quick Debugging

### View Logs
```bash
# Development
npm run dev

# Production (with tail)
pm2 logs face-verification
```

### Check Health
```bash
curl -i http://localhost:3000/health
```

### Test Database
```bash
# Inside Node REPL
node
> import('./utils/database.js').then(d => d.connectMongoDB())
```

### Check AWS Rekognition
```bash
# List faces in collection
aws rekognition list-faces --collection-id your-collection
```

---

## 📞 Support

- **Docs:** See `README.md`, `API_DOCS.md`, `AWS_DEPLOYMENT.md`
- **Issues:** Check logs with `pm2 logs` or Docker logs
- **Performance:** Monitor timing in logs (`duration` field)

---

## 🎯 Success Criteria

- ✅ Server starts without errors
- ✅ Health endpoint returns 200
- ✅ Face verification requests complete in < 2 seconds
- ✅ Proper error responses for invalid input
- ✅ Logs include performance metrics

---

**You're all set! 🚀**

Server is running and ready for requests. Monitor logs and adjust configuration as needed.

# Vercel Deployment Guide

## Prerequisites
- Vercel Account (https://vercel.com)
- GitHub account with repository
- AWS and MongoDB credentials ready (store separately, NOT in code)

## Step 1: Prepare for Deployment

Ensure these files exist:
- ✅ `vercel.json` - Build configuration
- ✅ `api/index.js` - Serverless handler
- ✅ `.vercelignore` - Files to exclude
- ✅ `package.json` - Dependencies

## Step 2: Push Code to GitHub

```bash
cd /Users/mrmad/adminthrill/aws-api
git add .
git commit -m "Vercel deployment configuration"
git push origin main
```

⚠️ **Never commit secrets!** Use environment variables instead.

## Step 3: Deploy on Vercel

### Option A: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select GitHub repository
4. Click "Deploy"

### Option B: Command Line

```bash
npm install -g vercel
vercel login
vercel
```

## Step 4: Add Environment Variables

In Vercel Project Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | Your MongoDB connection string |
| `AWS_REGION` | ap-south-1 |
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `AWS_REKOGNITION_COLLECTION_ID` | facial_collection |
| `NODE_ENV` | production |
| `LOG_LEVEL` | info |

## Step 5: Test Deployment

Once deployed:

```bash
# Replace with your Vercel URL
export URL=https://your-app.vercel.app

# Health check
curl $URL/health

# Face verification
curl -X POST $URL/api/face-verify \
  -F "image=@test-image.jpg" \
  -F "eventId=507f1f77bcf86cd799439011"
```

## Troubleshooting

### MongoDB Connection Issues
- Whitelist all IPs in MongoDB Atlas:
  - Go to Atlas → Network Access
  - Add: 0.0.0.0/0
  
### Cold Start Delays
- First request: 10-15 seconds (normal)
- Subsequent requests: < 1 second
- Use warmup requests to keep alive

### 404 Error
- Verify `vercel.json` catch-all route
- Check `api/index.js` exports Express app

## What's Deployed

✅ Full Node.js API with Express
✅ MongoDB integration (Booking + Face-Table)
✅ AWS Rekognition integration  
✅ CORS enabled
✅ Request logging
✅ Error handling

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] MongoDB Atlas allows Vercel IPs
- [ ] AWS credentials valid
- [ ] Testing completed
- [ ] Monitoring set up (optional)

Ready to deploy! 🚀

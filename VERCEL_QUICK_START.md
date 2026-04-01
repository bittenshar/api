# ✅ Vercel Deployment - Quick Start

Your Face Verification API is ready for Vercel!

## 3-Minute Setup

### 1. Push to GitHub
```bash
cd /Users/mrmad/adminthrill/aws-api
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Create Vercel Project
- Go to https://vercel.com/dashboard
- Click "Add New" → "Project"
- Select your GitHub repository
- Click "Deploy"

### 3. Add Environment Variables
In Vercel Project Settings → Environment Variables:

```
MONGO_URI          = <your_mongodb_uri>
AWS_REGION         = ap-south-1
AWS_ACCESS_KEY_ID  = <your_key>
AWS_SECRET_ACCESS_KEY = <your_secret>
AWS_REKOGNITION_COLLECTION_ID = facial_collection
NODE_ENV           = production
LOG_LEVEL          = info
```

## Test Your Deployment

Once live (URL will be like `https://your-app.vercel.app`):

```bash
# Health check
curl https://your-app.vercel.app/health

# Face verification
curl -X POST https://your-app.vercel.app/api/face-verify \
  -F "image=@test-image.jpg" \
  -F "eventId=507f1f77bcf86cd799439011"
```

## Files Configured

✅ `vercel.json` - Build config
✅ `api/index.js` - Serverless handler
✅ `.vercelignore` - Deployment exclusions
✅ `package.json` - Dependencies

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed guide.

Ready? 🚀

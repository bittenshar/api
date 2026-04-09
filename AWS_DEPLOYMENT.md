# AWS Deployment Guide

## Quick Start Deployment Checklist

- [ ] AWS Account configured with credentials
- [ ] MongoDB Atlas cluster ready
- [ ] Rekognition collection created
- [ ] Environment variables configured
- [ ] Lambda/EC2 role has Rekognition permissions
- [ ] Security groups configured
- [ ] API Gateway (if using Lambda) setup complete

---

## AWS Lambda Deployment (Recommended for Microservice)

### Option 1: Using AWS CLI

#### 1. Prepare the deployment package

```bash
# Install dependencies (production only)
npm install --production

# Create deployment package
zip -r face-verification.zip .
```

#### 2. Create IAM Role for Lambda

```bash
# Trust policy (create trust-policy.json)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}

# Create role
aws iam create-role \
  --role-name face-verification-lambda-role \
  --assume-role-policy-document file://trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name face-verification-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create and attach inline policy for Rekognition
# Create policy document (eks-policy.json)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:SearchFacesByImage"
      ],
      "Resource": "*"
    }
  ]
}

aws iam put-role-policy \
  --role-name face-verification-lambda-role \
  --policy-name face-verification-rekognition-policy \
  --policy-document file://eks-policy.json
```

#### 3. Create Lambda Function

```bash
aws lambda create-function \
  --function-name face-verification \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/face-verification-lambda-role \
  --handler lambda.handler \
  --timeout 30 \
  --memory-size 512 \
  --zip-file fileb://face-verification.zip \
  --environment Variables="{
    AWS_REGION=us-east-1,
    AWS_REKOGNITION_COLLECTION_ID=your_collection,
    MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db,
    NODE_ENV=production,
    LOG_LEVEL=info
  }"
```

#### 4. Create API Gateway Integration

```bash
# Create REST API
api_id=$(aws apigateway create-rest-api \
  --name face-verification-api \
  --query 'id' --output text)

# Get root resource
root_resource=$(aws apigateway get-resources \
  --rest-api-id $api_id \
  --query 'items[0].id' --output text)

# Create /api resource
api_resource=$(aws apigateway create-resource \
  --rest-api-id $api_id \
  --parent-id $root_resource \
  --path-part api \
  --query 'id' --output text)

# Create /face-verify resource
verify_resource=$(aws apigateway create-resource \
  --rest-api-id $api_id \
  --parent-id $api_resource \
  --path-part face-verify \
  --query 'id' --output text)

# Create POST method
aws apigateway put-method \
  --rest-api-id $api_id \
  --resource-id $verify_resource \
  --http-method POST \
  --authorization-type NONE \
  --request-parameters method.request.header.Content-Type=true

# Create integration with Lambda
aws apigateway put-integration \
  --rest-api-id $api_id \
  --resource-id $verify_resource \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:face-verification/invocations

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
  --function-name face-verification \
  --statement-id AllowAPIGateway \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com

# Deploy API
deployment=$(aws apigateway create-deployment \
  --rest-api-id $api_id \
  --stage-name prod \
  --query 'id' --output text)

echo "API deployed at: https://$api_id.execute-api.us-east-1.amazonaws.com/prod"
```

#### 5. Update Lambda Function

```bash
# After code changes
npm install --production
zip -r face-verification.zip .

aws lambda update-function-code \
  --function-name face-verification \
  --zip-file fileb://face-verification.zip

aws lambda update-function-configuration \
  --function-name face-verification \
  --timeout 30 \
  --memory-size 512
```

---

## AWS EC2 Deployment

### 1. Launch EC2 Instance

```bash
# Recommended: Ubuntu 22.04 LTS, t3.medium or larger
# Security Group: Allow inbound on port 3000 (or 80/443 with load balancer)
```

### 2. SSH and Setup

```bash
# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install git
sudo apt-get install -y git

# Install PM2 globally
sudo npm install -g pm2

# Clone repository
git clone your-repo-url
cd aws-api
```

### 3. Configure Application

```bash
# Copy .env file (use secure method)
nano .env

# Install dependencies
npm install --production

# Test run
npm start

# If working, stop with Ctrl+C
```

### 4. Setup PM2

```bash
# Start with PM2
pm2 start index.js --name "face-verification"

# Setup auto-restart
pm2 startup

# Save PM2 configuration
pm2 save

# View logs
pm2 logs face-verification

# Monitor
pm2 monit
```

### 5. Setup Nginx Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create config (sudo nano /etc/nginx/sites-available/face-verification)
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/face-verification /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup Auto-renewal SSL (Optional)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## AWS RDS (MongoDB Alternative)

If using MongoDB Atlas:

1. Create cluster in MongoDB Atlas
2. Add IP whitelist for Lambda functions or EC2 instance
3. Get connection string
4. Use in MONGO_URI environment variable

---

## Monitoring & Logging

### CloudWatch Setup (Lambda)

```bash
# View Lambda logs
aws logs tail /aws/lambda/face-verification --follow

# Create custom metrics
aws cloudwatch put-metric-data \
  --namespace FaceVerification \
  --metric-name ResponseTime \
  --value 850 \
  --unit Milliseconds
```

### CloudWatch Setup (EC2)

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure and start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s
```

---

## Auto-scaling (Lambda)

Lambda automatically scales - no configuration needed!

Key points:
- Concurrent executions limit (default 1000)
- Request increase: "burst" capacity for immediate scaling
- Reserved concurrency available for predictable loads

---

## Load Testing on AWS

```bash
# Using Apache Bench from Lambda or EC2
ab -n 10000 -c 100 \
  -p test-data.json \
  -T application/json \
  https://your-api-gateway-url/api/face-verify
```

---

## Cost Optimization

### Lambda
- **Pay per invocation** ~ $0.20 per 1M requests
- **Memory**: 512MB is good balance
- **Timeout**: Set to 30s (max needed)
- **Reserved Concurrency**: Optional

### EC2
- **t3.medium**: ~$0.04/hour (on-demand)
- **Use Spot Instances**: 70% cost reduction
- **Auto Scaling**: Scale based on CPU

### Data Transfer
- **Same region**: Free
- **Cross-region**: $0.02/GB
- Use CloudFront for global distribution

---

## Rollback Procedure

### Lambda
```bash
# List function versions
aws lambda list-function-by-code-signed

# Rollback to previous version
aws lambda update-alias \
  --function-name face-verification \
  --name prod \
  --function-version PREVIOUS_VERSION
```

### EC2
```bash
# With git
git rollback <commit-hash>
npm install
pm2 restart face-verification
```

---

## Troubleshooting

### Lambda Timeouts
- Increase timeout: 30s (default should work)
- Check MongoDB connection pool
- Monitor AWS Rekognition latency

### Cold Starts
- Lambda cold start: ~1-2 seconds (unavoidable)
- Provision concurrency: reduces cold starts
- Keep function package small

### Permission Errors
- Verify IAM role has Rekognition permissions
- Check MongoDB network access
- Verify environment variables set

### High Latency
- Scale MongoDB connection pool
- Check Lambda memory allocation (512MB+ recommended)
- Monitor Rekognition API limits

---

## Monitoring Endpoints

```bash
# Health check
curl https://your-api/health

# Check logs in real-time (Lambda)
aws logs tail /aws/lambda/face-verification --follow

# Check logs (EC2)
pm2 logs face-verification
```

---

## Production Checklist

- [ ] All environment variables configured
- [ ] MongoDB indexes created
- [ ] Rekognition collection populated
- [ ] SSL certificate installed (EC2)
- [ ] CloudWatch alarms configured
- [ ] Monitoring dashboard setup
- [ ] Backup strategy defined
- [ ] Auto-scaling configured
- [ ] Load balancer configured (EC2)
- [ ] Disaster recovery plan documented

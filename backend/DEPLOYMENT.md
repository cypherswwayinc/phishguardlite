# 🚀 PhishGuard Lite Backend Deployment Guide

## Overview
This guide will help you deploy the PhishGuard Lite backend to AWS Lambda using AWS SAM (Serverless Application Model).

## Prerequisites

### 1. AWS CLI Installation
```bash
# macOS
brew install awscli

# Verify installation
aws --version
```

### 2. AWS SAM CLI Installation
```bash
# macOS
brew install aws-sam-cli

# Verify installation
sam --version
```

### 3. AWS Credentials Configuration
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter your output format (json)
```

### 4. Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)
```bash
cd backend
./deploy.sh
```

### Option 2: Manual Deployment
```bash
cd backend/aws-sam

# Build the application
sam build --use-container

# Deploy to AWS
sam deploy --guided
```

## 📋 Deployment Details

### What Gets Deployed
- **Lambda Function**: FastAPI backend running on Python 3.11
- **API Gateway**: REST API with CORS enabled
- **S3 Bucket**: Secure storage for phishing reports
- **IAM Role**: Proper permissions for Lambda to access S3

### Environment Variables
- `S3_BUCKET`: S3 bucket name for storing reports
- `AWS_REGION`: AWS region (automatically set)

### API Endpoints
- `GET /` - API information
- `GET /health` - Health check
- `POST /score` - URL scoring
- `POST /report` - Phishing report submission
- `GET /admin/api/reports` - List all reports
- `GET /admin/api/reports/summary` - Report statistics
- `GET /admin/api/report/{id}` - Get specific report

## 🔧 Configuration

### S3 Bucket Settings
- **Versioning**: Enabled for data protection
- **Encryption**: AES256 server-side encryption
- **Public Access**: Blocked for security
- **Lifecycle**: Reports expire after 1 year

### IAM Permissions
- S3 read/write access for reports
- CloudWatch logs for monitoring
- Basic Lambda execution permissions

## 🧪 Testing After Deployment

### 1. Health Check
```bash
curl "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/Prod/health"
```

### 2. Test Report Submission
```bash
curl -X POST "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/Prod/report" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://test-phishing-site.gq",
    "context": {
      "pageUrl": "https://gmail.com",
      "linkText": "Click to verify",
      "reasons": ["High-risk TLD"]
    },
    "tenantKey": "test-user"
  }'
```

### 3. Test Admin API
```bash
curl "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/Prod/admin/api/reports/summary"
```

## 📊 Monitoring

### CloudWatch Logs
- Lambda function logs
- API Gateway access logs
- Error tracking and debugging

### S3 Monitoring
- Report storage metrics
- Access patterns
- Cost optimization

## 🔄 Updating the Deployment

### Code Changes
1. Update your code
2. Commit changes to git
3. Run `./deploy.sh` again

### Configuration Changes
1. Modify `aws-sam/template.yaml`
2. Run `sam deploy` to update the stack

## 🚨 Troubleshooting

### Common Issues

#### 1. SAM Build Fails
```bash
# Clean and rebuild
sam build --use-container --cached
```

#### 2. Deployment Fails
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name phishguard-lite-backend

# Delete and redeploy
sam delete
sam deploy --guided
```

#### 3. API Not Responding
```bash
# Check Lambda logs
sam logs -n PhishGuardFunction --stack-name phishguard-lite-backend

# Check API Gateway
aws apigateway get-rest-apis
```

### Debug Mode
```bash
# Local testing
sam local start-api

# Invoke function locally
sam local invoke PhishGuardFunction --event events/event.json
```

## 💰 Cost Optimization

### Lambda
- Memory: 512MB (adequate for most workloads)
- Timeout: 30 seconds
- Reserved concurrency if needed

### S3
- Lifecycle policies for old reports
- Intelligent tiering for cost savings
- Monitor storage usage

## 🔒 Security Considerations

- S3 bucket is private by default
- IAM roles follow least privilege principle
- API Gateway has CORS configured
- All data is encrypted at rest

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs
2. Verify IAM permissions
3. Test endpoints individually
4. Review CloudFormation stack events

## 🎯 Next Steps

After successful deployment:
1. Update your browser extension's API base URL
2. Test the reporting functionality
3. Monitor the admin dashboard
4. Set up CloudWatch alarms for monitoring
5. Configure S3 lifecycle policies as needed

---

**Happy Deploying! 🚀**

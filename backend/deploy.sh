#!/bin/bash

# PhishGuard Lite Backend Deployment Script
# This script deploys the FastAPI backend to AWS Lambda using SAM

set -e  # Exit on any error

echo "🚀 PhishGuard Lite Backend Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="phishguard-lite-backend"
REGION="us-east-1"
BUCKET_NAME="phishguard-reports-$(date +%s)"  # Unique bucket name

echo -e "${BLUE}Configuration:${NC}"
echo "  Stack Name: $STACK_NAME"
echo "  Region: $REGION"
echo "  S3 Bucket: $BUCKET_NAME"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo -e "${RED}❌ AWS SAM CLI is not installed. Please install it first.${NC}"
    echo "Install with: brew install aws-sam-cli"
    exit 1
fi

# Check AWS credentials
echo -e "${BLUE}🔐 Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS credentials valid (Account: $ACCOUNT_ID)${NC}"

# Create deployment bucket for SAM
echo -e "${BLUE}📦 Creating SAM deployment bucket...${NC}"
SAM_BUCKET="phishguard-sam-deploy-${ACCOUNT_ID}"
if ! aws s3 ls "s3://$SAM_BUCKET" &> /dev/null; then
    aws s3 mb "s3://$SAM_BUCKET" --region $REGION
    echo -e "${GREEN}✅ Created SAM deployment bucket: $SAM_BUCKET${NC}"
else
    echo -e "${GREEN}✅ SAM deployment bucket already exists: $SAM_BUCKET${NC}"
fi

# Build the SAM application
echo -e "${BLUE}🔨 Building SAM application...${NC}"
cd aws-sam
sam build --use-container
echo -e "${GREEN}✅ SAM build completed${NC}"

# Deploy the stack
echo -e "${BLUE}🚀 Deploying to AWS...${NC}"
sam deploy \
    --stack-name $STACK_NAME \
    --s3-bucket $SAM_BUCKET \
    --capabilities CAPABILITY_IAM \
    --region $REGION \
    --parameter-overrides S3BucketName=$BUCKET_NAME \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Get the API URL
echo -e "${BLUE}📡 Getting API endpoint...${NC}"
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
    --output text)

echo ""
echo -e "${GREEN}🎉 Deployment Summary${NC}"
echo "========================"
echo "Stack Name: $STACK_NAME"
echo "API URL: $API_URL"
echo "S3 Bucket: $S3_BUCKET"
echo "Region: $REGION"
echo ""

# Test the API
echo -e "${BLUE}🧪 Testing API endpoints...${NC}"
echo "Testing health endpoint..."
if curl -s "$API_URL/health" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health endpoint working${NC}"
else
    echo -e "${RED}❌ Health endpoint failed${NC}"
fi

echo "Testing admin summary endpoint..."
if curl -s "$API_URL/admin/api/reports/summary" | grep -q "totalReports"; then
    echo -e "${GREEN}✅ Admin API working${NC}"
else
    echo -e "${YELLOW}⚠️  Admin API not yet available (may need a few minutes)${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Update your extension's API base URL to: $API_URL"
echo "2. Update the admin dashboard API_BASE to: $API_URL"
echo "3. Test the reporting functionality"
echo "4. Monitor reports in the S3 bucket: $S3_BUCKET"
echo ""
echo -e "${GREEN}🚀 PhishGuard Lite is now deployed and running on AWS!${NC}"

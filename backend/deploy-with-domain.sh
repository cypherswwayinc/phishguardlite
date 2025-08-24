#!/bin/bash

# PhishGuard Lite - Deploy with Custom Domain
# Usage: ./deploy-with-domain.sh [your-domain.com]

set -e

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Failed to get AWS Account ID. Please check your AWS credentials.${NC}"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛡️  PhishGuard Lite - Custom Domain Deployment${NC}"
echo "=================================================="

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  No custom domain provided. Using default AWS API Gateway URL.${NC}"
    echo -e "${BLUE}Usage: ./deploy-with-domain.sh api.yourcompany.com${NC}"
    echo ""
    
    # Deploy without custom domain
    echo -e "${GREEN}🚀 Deploying with default AWS API Gateway URL...${NC}"
    sam build --no-use-container
    sam deploy --resolve-s3 --capabilities CAPABILITY_IAM
    
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo -e "${BLUE}🌐 Your API is available at the AWS API Gateway URL above${NC}"
    exit 0
fi

DOMAIN_NAME="$1"
echo -e "${GREEN}🎯 Deploying with custom domain: ${DOMAIN_NAME}${NC}"
echo ""

# Validate domain format
if [[ ! "$DOMAIN_NAME" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
    echo -e "${RED}❌ Invalid domain format: ${DOMAIN_NAME}${NC}"
    echo "Please use a valid domain name (e.g., api.yourcompany.com)"
    exit 1
fi

echo -e "${BLUE}📋 Deployment Steps:${NC}"
echo "1. Build SAM application"
echo "2. Deploy with custom domain parameter"
echo "3. Create SSL certificate"
echo "4. Configure API Gateway custom domain"
echo "5. Update extension configuration"
echo ""

# Build the application
echo -e "${GREEN}🔨 Building SAM application...${NC}"
sam build --no-use-container

# Deploy with custom domain
echo -e "${GREEN}🚀 Deploying with custom domain: ${DOMAIN_NAME}${NC}"
sam deploy --capabilities CAPABILITY_IAM --parameter-overrides CustomDomainName="$DOMAIN_NAME" --s3-bucket "phishguard-deploy-${AWS_ACCOUNT_ID}"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Get the outputs
echo -e "${BLUE}📊 Deployment Outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name phishguard-lite-backend \
    --query 'Stacks[0].Outputs' \
    --output table

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: SSL Certificate Validation Required${NC}"
echo "=================================================="
echo "1. Check AWS Certificate Manager for your certificate"
echo "2. Add the required DNS validation records to your domain"
echo "3. Wait for certificate validation (can take 5-30 minutes)"
echo "4. Your custom domain will work once validation is complete"
echo ""

echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Update your extension configuration with: https://${DOMAIN_NAME}/"
echo "2. Update admin dashboard with: https://${DOMAIN_NAME}/"
echo "3. Test the new endpoint"
echo "4. Update your DNS records if using external DNS"
echo ""

echo -e "${GREEN}🎉 Custom domain deployment initiated successfully!${NC}"
echo -e "${BLUE}🌐 Your API will be available at: https://${DOMAIN_NAME}/${NC}"

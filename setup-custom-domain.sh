#!/bin/bash

# PhishGuard Lite - Custom Domain Setup Script
# This script sets up a CloudFront distribution for your custom domain
# Usage: ./setup-custom-domain.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛡️  PhishGuard Lite - Custom Domain Setup${NC}"
echo "=============================================="
echo ""

# Get current API Gateway URL
echo -e "${BLUE}📋 Current Setup:${NC}"
echo "Domain: api.cyphersway.com"
echo "Target: Your existing API Gateway"
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI and credentials verified${NC}"
echo ""

# Get current API Gateway details
echo -e "${BLUE}🔍 Detecting current API Gateway...${NC}"
API_GATEWAYS=$(aws apigateway get-rest-apis --query 'items[?contains(name, `phishguard`) || contains(name, `PhishGuard`)].{Name:name,Id:id,Url:url}' --output table)

if [ -z "$API_GATEWAYS" ]; then
    echo -e "${YELLOW}⚠️  No PhishGuard API Gateway found.${NC}"
    echo "Please deploy your backend first using:"
    echo "  cd backend && sam deploy --guided"
    exit 1
fi

echo "$API_GATEWAYS"
echo ""

# Manual setup instructions
echo -e "${BLUE}📋 Manual Setup Instructions:${NC}"
echo "======================================"
echo ""
echo "1. ${GREEN}Create CloudFront Distribution:${NC}"
echo "   - Go to AWS Console → CloudFront"
echo "   - Create Distribution"
echo "   - Origin Domain: [Your API Gateway URL]"
echo "   - Origin Path: /Prod"
echo "   - Alternate Domain Names: api.cyphersway.com"
echo "   - SSL Certificate: Request new certificate for *.cyphersway.com"
echo ""
echo "2. ${GREEN}Update DNS Records:${NC}"
echo "   - Add CNAME record: api.cyphersway.com → [CloudFront Domain]"
echo "   - Or use Route 53 if your domain is managed there"
echo ""
echo "3. ${GREEN}Wait for SSL Certificate Validation:${NC}"
echo "   - Add the required DNS validation records"
echo "   - Wait 5-30 minutes for validation"
echo ""
echo "4. ${GREEN}Test Your Domain:${NC}"
echo "   - Test: curl https://api.cyphersway.com/health"
echo "   - Update extension if needed"
echo ""

# Alternative: Direct DNS mapping
echo -e "${BLUE}🌐 Alternative: Direct DNS Mapping${NC}"
echo "=========================================="
echo ""
echo "If you prefer not to use CloudFront, you can:"
echo "1. Point api.cyphersway.com directly to your API Gateway"
echo "2. Use AWS Certificate Manager for SSL"
echo "3. Update your extension configuration"
echo ""

echo -e "${GREEN}🎯 Your extension is already configured for: api.cyphersway.com${NC}"
echo "Once DNS is set up, it will automatically use your custom domain!"
echo ""
echo -e "${BLUE}📚 Next Steps:${NC}"
echo "1. Set up DNS and SSL certificate"
echo "2. Test: https://api.cyphersway.com/health"
echo "3. Load your extension and test phishing detection"
echo "4. Check the admin dashboard at: https://api.cyphersway.com/admin-dashboard.html"

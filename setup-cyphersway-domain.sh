#!/bin/bash

# PhishGuard Lite - CypherSway Domain Setup
# This script sets up api.cyphersway.com for your PhishGuard Lite backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛡️  PhishGuard Lite - CypherSway Domain Setup${NC}"
echo "====================================================="
echo ""

# Your specific details
DOMAIN="phishguard.cyphersway.com"
API_GATEWAY_ID="YOUR_API_ID"
API_GATEWAY_URL="https://${API_GATEWAY_ID}.execute-api.us-east-1.amazonaws.com/Prod"
REGION="us-east-1"

echo -e "${GREEN}🎯 Target Configuration:${NC}"
echo "Domain: ${DOMAIN}"
echo "API Gateway: ${API_GATEWAY_ID}"
echo "Region: ${REGION}"
echo "Full URL: ${API_GATEWAY_URL}"
echo ""

echo -e "${BLUE}📋 Step-by-Step Setup:${NC}"
echo "======================================"
echo ""

echo -e "${GREEN}1. Create SSL Certificate in AWS Certificate Manager${NC}"
echo "   - Go to: https://console.aws.amazon.com/acm/home?region=${REGION}"
echo "   - Click 'Request Certificate'"
echo "   - Domain name: ${DOMAIN}"
echo "   - Add wildcard: *.cyphersway.com"
echo "   - Validation method: DNS validation"
echo "   - Click 'Request'"
echo ""

echo -e "${GREEN}2. Add DNS Validation Records${NC}"
echo "   - Copy the CNAME records from the certificate"
echo "   - Add them to your DNS provider (where cyphersway.com is managed)"
echo "   - Wait for validation (check AWS Console)"
echo ""

echo -e "${GREEN}3. Create CloudFront Distribution${NC}"
echo "   - Go to: https://console.aws.amazon.com/cloudfront/home"
echo "   - Click 'Create Distribution'"
echo "   - Origin Domain: ${API_GATEWAY_ID}.execute-api.${REGION}.amazonaws.com"
echo "   - Origin Path: /Prod"
echo "   - Alternate Domain Names: ${DOMAIN}"
echo "   - SSL Certificate: Select your validated certificate"
echo "   - Default Root Object: (leave blank)"
echo "   - Click 'Create Distribution'"
echo ""

echo -e "${GREEN}4. Update DNS Records${NC}"
echo "   - Add CNAME record: ${DOMAIN} → [CloudFront Domain]"
echo "   - Example: ${DOMAIN} → d1234abcd.cloudfront.net"
echo ""

echo -e "${GREEN}5. Test Your Domain${NC}"
echo "   - Wait 5-10 minutes for DNS propagation"
echo "   - Test: curl https://${DOMAIN}/health"
echo "   - Test: curl https://${DOMAIN}/admin-dashboard.html"
echo ""

echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "======================================"
echo "• SSL certificate validation can take 5-30 minutes"
echo "• DNS changes can take 5-10 minutes to propagate"
echo "• Your extension is already configured for ${DOMAIN}"
echo "• No code changes needed - just DNS setup"
echo ""

echo -e "${BLUE}🚀 Quick Test Commands:${NC}"
echo "======================================"
echo "Once DNS is set up, test with:"
echo ""
echo "# Test health endpoint"
echo "curl https://${DOMAIN}/health"
echo ""
echo "# Test admin dashboard"
echo "curl https://${DOMAIN}/admin-dashboard.html"
echo ""
echo "# Test scoring endpoint"
echo "curl -X POST https://${DOMAIN}/score \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"url\":\"https://test.com\",\"linkText\":\"test\"}'"
echo ""

echo -e "${GREEN}🎉 Benefits of Your Custom Domain:${NC}"
echo "=============================================="
echo "✅ Professional branding: ${DOMAIN}"
echo "✅ No more random AWS URLs"
echo "✅ Better user experience"
echo "✅ Easier to remember and share"
echo "✅ Future-proof (can change backend without changing URLs)"
echo ""

echo -e "${BLUE}📚 Next Steps:${NC}"
echo "1. Follow the steps above to set up DNS and SSL"
echo "2. Test your domain endpoints"
echo "3. Load your extension and test phishing detection"
echo "4. Share your professional domain with users!"
echo ""
echo -e "${GREEN}Your extension is ready to use ${DOMAIN} once DNS is configured! 🚀${NC}"

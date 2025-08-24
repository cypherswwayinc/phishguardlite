# 🛡️ PhishGuard Lite - CypherSway Domain Setup

## 🎯 **Your Configuration**
- **Domain**: `phishguard.cyphersway.com`
- **Current API**: `https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod`
- **Region**: `us-east-1`

## 🚀 **Quick Setup (5 Steps)**

### **1. SSL Certificate** 🔐
- **URL**: https://console.aws.amazon.com/acm/home?region=us-east-1
- **Action**: Request Certificate
- **Domain**: `phishguard.cyphersway.com`
- **Wildcard**: `*.cyphersway.com`
- **Validation**: DNS validation

### **2. DNS Validation** 🌐
- Copy CNAME records from AWS Certificate Manager
- Add to your DNS provider (where cyphersway.com is managed)
- Wait for validation (5-30 minutes)

### **3. CloudFront Distribution** ☁️
- **URL**: https://console.aws.amazon.com/cloudfront/home
- **Origin**: `YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com`
- **Path**: `/Prod`
- **Alternate Domain**: `phishguard.cyphersway.com`
- **SSL**: Select your validated certificate

### **4. Final DNS Record** 📝
- **CNAME**: `phishguard.cyphersway.com` → `[CloudFront Domain]`
- **Example**: `phishguard.cyphersway.com` → `YOUR_CLOUDFRONT_DOMAIN.cloudfront.net`

### **5. Test** ✅
```bash
# Health check
curl https://phishguard.cyphersway.com/health

# Admin dashboard
curl https://phishguard.cyphersway.com/admin-dashboard.html

# Scoring endpoint
curl -X POST https://phishguard.cyphersway.com/score \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://test.com","linkText":"test"}'
```

## 🎉 **What You Get**
- **Professional URL**: `https://phishguard.cyphersway.com/`
- **Admin Dashboard**: `https://phishguard.cyphersway.com/admin-dashboard.html`
- **Extension Ready**: Already configured in your code
- **SSL Secure**: Automatic HTTPS with your certificate

## ⚡ **Timeline**
- **SSL Validation**: 5-30 minutes
- **DNS Propagation**: 5-10 minutes
- **Total Setup**: ~1 hour

## 🔧 **Your Extension Status**
✅ **Already Configured** for `phishguard.cyphersway.com`
✅ **No Code Changes** needed
✅ **Ready to Use** once DNS is set up

## 📱 **Test Your Extension**
1. Load the extension in Chrome
2. Go to any website with links
3. Extension will automatically use `phishguard.cyphersway.com`
4. Check options page for current API URL

## 🆘 **Need Help?**
- Check AWS Certificate Manager for validation status
- Verify DNS records are correct
- Test with curl commands above
- Check CloudFront distribution status

---
**Your PhishGuard Lite will be available at `https://phishguard.cyphersway.com/` once DNS is configured! 🚀**

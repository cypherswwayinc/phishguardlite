# PhishGuard Lite - Complete Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [AWS Infrastructure](#aws-infrastructure)
4. [User Roles & Permissions](#user-roles--permissions)
5. [API Reference](#api-reference)
6. [User Guide](#user-guide)
7. [Admin Guide](#admin-guide)
8. [Development Guide](#development-guide)
9. [Deployment Guide](#deployment-guide)
10. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## System Overview

**PhishGuard Lite** is a comprehensive phishing detection system that combines browser extension technology with cloud-based AI scoring to protect users from malicious links.

### Key Features:
- **Real-time Detection**: Analyzes links as you browse
- **Local + Cloud Scoring**: Combines local heuristics with cloud AI
- **One-click Reporting**: Easy reporting of suspicious links
- **Multi-tenant Support**: Organization-based reporting
- **Cross-platform**: Works on Gmail, LinkedIn, Outlook, and more
- **Privacy-focused**: Reports only when user explicitly requests

### Architecture:
```
Browser Extension → Cloud API → AI Scoring → S3 Storage → Admin Dashboard
```

---

## Tech Stack

### Frontend (Browser Extension)
- **Language**: TypeScript
- **Framework**: Chrome Extension Manifest V3
- **Build Tool**: Vite
- **Storage**: Chrome Storage Sync API
- **UI**: Vanilla HTML/CSS/JS
- **Configuration**: Centralized config system for API endpoints

### Backend (Cloud API)
- **Language**: Python 3.9
- **Framework**: FastAPI
- **Server**: AWS Lambda
- **Gateway**: AWS API Gateway
- **Storage**: Amazon S3
- **Deployment**: AWS SAM (Serverless Application Model)

### Infrastructure
- **Cloud Provider**: AWS (Amazon Web Services)
- **IaC**: CloudFormation via SAM
- **Monitoring**: CloudWatch Logs
- **Security**: IAM Roles & Policies

---

## AWS Infrastructure

### Deployed Resources

#### Lambda Function
- **Name**: `PhishGuardAPI`
- **Runtime**: `python3.9`
- **Handler**: `app.lambda_handler`
- **ARN**: `arn:aws:lambda:us-east-1:ACCOUNT_ID:function:phishguard-lite-backend-PhishGuardAPI-XXXXX`

#### API Gateway
- **Name**: `phishguard-lite-backend`
- **Stage**: `Prod`
- **Base URL**: `https://API_ID.execute-api.us-east-1.amazonaws.com/Prod/`

#### S3 Bucket
- **Name**: `pg-reports-ACCOUNT_ID-us-east-1`
- **Region**: `us-east-1`
- **Purpose**: Store phishing report data

#### IAM Role
- **Name**: `phishguard-lite-backend-PhishGuardAPIRole-XXXXX`

#### CloudFormation Stack
- **Name**: `phishguard-lite-backend`
- **Status**: `UPDATE_COMPLETE`

---

## User Roles & Permissions

### End Users
- **Permissions**: Browse websites, see phishing warnings, report suspicious links
- **Data Access**: Only their own reports (if enabled)
- **Settings**: Configure extension preferences

### Administrators
- **Permissions**: View all reports, access admin dashboard, manage system
- **Data Access**: All reports across all tenants
- **Capabilities**: Export data, view statistics, monitor system health

### Developers
- **Permissions**: Deploy updates, modify code, access logs
- **Data Access**: Development and testing environments
- **Capabilities**: Full system access for development

---

## API Reference

### Base URL
```
https://API_ID.execute-api.us-east-1.amazonaws.com/Prod
```

### Endpoints

#### Health Check
```http
GET /health
```
**Response:**
```json
{
  "ok": true,
  "time": "2025-08-23T22:34:28.075Z",
  "storage": "S3",
  "bucket": "pg-reports-ACCOUNT_ID-us-east-1"
}
```

#### URL Scoring
```http
POST /score
```
**Request:**
```json
{
  "url": "https://example.com",
  "linkText": "Click here"
}
```
**Response:**
```json
{
  "score": 40,
  "reasons": ["High-risk TLD: .com"],
  "label": "Caution"
}
```

#### Report Submission
```http
POST /report
```
**Request:**
```json
{
  "url": "https://suspicious.com",
  "tenantKey": "company_abc",
  "context": {
    "linkText": "Click here",
    "pageUrl": "https://gmail.com",
    "reasons": ["High-risk TLD"]
  }
}
```
**Response:**
```json
{
  "ok": true,
  "message": "Report received and stored successfully. Report ID: abc123",
  "reportId": "abc123"
}
```

#### Admin - List Reports
```http
GET /admin/api/reports?limit=200
```
**Response:**
```json
{
  "items": [...],
  "total": 5,
  "message": "Found 5 reports",
  "storage": "S3"
}
```

#### Admin - Reports Summary
```http
GET /admin/api/reports/summary
```
**Response:**
```json
{
  "totalReports": 5,
  "todayReports": 2,
  "tenantBreakdown": {
    "company_abc": 3,
    "company_xyz": 2
  },
  "lastUpdated": "2025-08-23T22:34:31.825Z",
  "storage": "S3",
  "bucket": "pg-reports-ACCOUNT_ID-us-east-1"
}
```

---

## User Guide

### Installation
1. **Download Extension**: Load unpacked from the `dist` folder
2. **Configure Settings**: Set API URL and tenant key
3. **Enable Features**: Turn on detection and reporting

### Daily Usage
1. **Browse Normally**: Extension works in background
2. **See Warnings**: Risk labels appear next to suspicious links
3. **Report Links**: Click report button on suspicious links
4. **Check Settings**: Access options page for configuration

### Settings Configuration
- **Enable Extension**: Turn phishing detection on/off
- **Minimum Score**: Set threshold for warnings (default: 20)
- **API Base URL**: Your backend API endpoint
- **Tenant Key**: Your organization identifier
- **Enable Reporting**: Allow reporting suspicious links

---

## Admin Guide

### Accessing Admin Dashboard
1. **Open Dashboard**: Navigate to your admin dashboard URL
2. **View Statistics**: See total reports, today's count, active tenants
3. **Browse Reports**: View detailed report information
4. **Export Data**: Download reports for analysis

### Dashboard Features
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Search & Filter**: Find specific reports or time periods
- **Detailed Views**: Expand reports to see full context
- **Tenant Management**: Monitor usage across organizations

### System Monitoring
- **API Health**: Check backend status
- **Storage Usage**: Monitor S3 bucket usage
- **Error Logs**: Review any system issues
- **Performance**: Track response times

---

## Development Guide

### Local Development Setup
```bash
# Clone repository
git clone <your-repo>
cd phishguard-lite-starter-with-admin

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run locally
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Extension Development
```bash
# Install dependencies
cd extension
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

### Testing
```bash
# Test backend API
python test-api.py

# Test specific scenarios
python test-specific-scenarios.py

# Test extension
# Load dist folder in Chrome and test on various sites
```

---

## Deployment Guide

### Prerequisites
- AWS CLI configured
- Docker running (for SAM build)
- Python 3.9+ installed
- Node.js 18+ installed

### Backend Deployment
```bash
cd backend
./deploy.sh
```

### Extension Deployment
```bash
cd extension
npm run build
# Copy dist folder contents to Chrome Web Store or distribute manually
```

### Environment Configuration
```bash
# Set environment variables
export S3_BUCKET=your-reports-bucket
export AWS_REGION=us-east-1
```

---

## Monitoring & Troubleshooting

### Common Issues

#### Extension Not Working
- Check if extension is loaded in Chrome
- Verify API URL in settings
- Check browser console for errors
- Ensure backend is running

#### API Errors
- Verify AWS credentials
- Check Lambda function logs
- Ensure S3 bucket exists and is accessible
- Verify IAM role permissions

#### Reporting Issues
- Check if reporting is enabled in extension
- Verify tenant key is set
- Check S3 bucket permissions
- Review CloudWatch logs

### Logs & Debugging
```bash
# View Lambda logs
aws logs tail phishguard-lite-backend-PhishGuardAPI-XXXXX --since 1h

# Check S3 bucket contents
aws s3 ls s3://your-reports-bucket/

# Test API endpoints
curl https://your-api.execute-api.us-east-1.amazonaws.com/Prod/health
```

### Performance Monitoring
- **Lambda Duration**: Monitor function execution time
- **API Gateway Latency**: Track response times
- **S3 Access Patterns**: Monitor storage usage
- **Error Rates**: Track failed requests

---

## Security Considerations

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **Access Control**: IAM roles with minimal required permissions
- **Audit Logging**: CloudTrail for API access monitoring
- **Data Retention**: Configurable report retention policies

### Privacy Features
- **User Consent**: Reporting only when explicitly requested
- **Data Minimization**: Store only necessary information
- **Tenant Isolation**: Separate data by organization
- **GDPR Compliance**: Right to delete and export data

### Infrastructure Security
- **VPC Isolation**: Lambda functions in private subnets
- **Security Groups**: Restrict network access
- **IAM Policies**: Principle of least privilege
- **Regular Updates**: Keep dependencies updated

---

## Scaling & Future Enhancements

### Current Capacity
- **Lambda**: 512MB memory, 30s timeout
- **API Gateway**: 10,000 requests/second
- **S3**: Unlimited storage, 5,500 requests/second

### Scaling Strategies
- **Auto-scaling**: Lambda functions scale automatically
- **CDN**: CloudFront for global distribution
- **Database**: RDS for complex queries
- **Caching**: ElastiCache for performance

### Future Features
- **Machine Learning**: Enhanced phishing detection
- **Real-time Alerts**: Instant notification system
- **Integration**: SIEM and security tools
- **Analytics**: Advanced reporting and insights

---

## Support & Resources

### Documentation
- **README.md**: Quick start guide
- **TECHNICAL_DOCUMENTATION.md**: Comprehensive technical details
- **DEPLOYMENT.md**: Step-by-step deployment instructions

### Community
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Community support and ideas
- **Contributing**: Guidelines for contributors

### Contact
- **Email**: [Your Contact Email]
- **GitHub**: [Your GitHub Profile]
- **Documentation**: [Your Docs Site]

---

## Changelog

### Version 0.2.1 (Current)
- **Admin Dashboard**: Full reporting interface
- **S3 Integration**: Cloud storage for reports
- **Multi-tenant Support**: Organization-based reporting
- **Enhanced Detection**: Local + cloud scoring
- **CSP Compliance**: Works on restricted sites
- **Configuration System**: Centralized API endpoint management
- **Security Hardening**: Removed all hardcoded AWS identifiers

### Version 0.1.0
- **Basic Extension**: Phishing detection
- **Local Scoring**: Basic heuristics
- **Simple Reporting**: Basic report submission

---

## Getting Started

1. **Clone Repository**: `git clone <your-repo>`
2. **Deploy Backend**: Follow deployment guide
3. **Build Extension**: Run build commands
4. **Load Extension**: Install in Chrome
5. **Configure Settings**: Set API URL and tenant key
6. **Start Using**: Browse and detect phishing

**Welcome to PhishGuard Lite!** 

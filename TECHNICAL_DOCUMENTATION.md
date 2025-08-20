# PhishGuard Lite - Complete Technical Documentation

## 📋 **Table of Contents**
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

## **System Overview**

PhishGuard Lite is a comprehensive phishing detection system deployed on AWS with the following architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   AWS Lambda    │    │   S3 Storage    │
│   Extension     │◄──►│   + API Gateway │◄──►│   (Reports)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Options Page  │    │   FastAPI       │    │   Admin         │
│   (Settings)    │    │   Backend       │    │   Dashboard     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **System Components**
- **Frontend**: Chrome Extension (MV3) with TypeScript
- **Backend**: FastAPI application on AWS Lambda
- **Storage**: Amazon S3 for persistent report storage
- **API Gateway**: RESTful API with CORS support
- **Admin Interface**: HTML/JavaScript dashboard for report management

---

## 🛠️ **Tech Stack**

### **Frontend Technologies**
- **Language**: TypeScript 5.x
- **Build Tool**: Vite 5.x
- **Extension Framework**: Chrome Extension Manifest V3
- **UI Framework**: Vanilla JavaScript with CSS3
- **Package Manager**: npm 9.x

### **Backend Technologies**
- **Language**: Python 3.11
- **Web Framework**: FastAPI 0.95.2
- **ASGI Server**: Uvicorn 0.22.0
- **Data Validation**: Pydantic 1.10.7
- **AWS SDK**: boto3 1.34.0
- **Package Manager**: pip

### **Infrastructure & DevOps**
- **Cloud Provider**: AWS (Amazon Web Services)
- **Infrastructure as Code**: AWS SAM (Serverless Application Model)
- **Containerization**: Docker Desktop 4.x
- **CI/CD**: GitHub Actions
- **Version Control**: Git with GitHub
- **API Gateway**: AWS API Gateway (REST)
- **Compute**: AWS Lambda (Python 3.11 runtime)
- **Storage**: Amazon S3
- **IAM**: AWS Identity and Access Management

---

##  **AWS Infrastructure**

### **Deployed Resources**

#### **Lambda Function**
- **Name**: `PhishGuardFunction`
- **Runtime**: `python3.11`
- **Handler**: `app.lambda_handler`
- **Memory**: 128 MB (default)
- **Timeout**: 3 seconds (default)
- **ARN**: `arn:aws:lambda:us-east-1:ACCOUNT_ID:function:phishguard-lite-backend-PhishGuardFunction-XXXXX`

#### **API Gateway**
- **Name**: `PhishGuardApi`
- **Stage**: `Prod`
- **Base URL**: `https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod`
- **CORS**: Enabled for all origins (`*`)
- **Methods**: GET, POST, OPTIONS

#### **S3 Bucket**
- **Name**: `phishguard-reports-1755667751`
- **Region**: `us-east-1`
- **Purpose**: Store phishing report data
- **Encryption**: Server-side encryption (SSE-S3)
- **Versioning**: Enabled
- **Lifecycle**: Reports expire after 365 days
- **Access**: Private (IAM-controlled access only)

#### **IAM Role**
- **Name**: `PhishGuardFunctionRole`
- **Permissions**:
  - `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
  - Custom S3 policy for bucket access
- **Trust Policy**: Lambda service principal

#### **CloudFormation Stack**
- **Name**: `phishguard-lite-backend`
- **Status**: `CREATE_COMPLETE`
- **Region**: `us-east-1`
- **Template**: `backend/aws-sam/template.yaml`

### **Environment Variables**
```bash
S3_BUCKET=phishguard-reports-1755667751
AWS_REGION=us-east-1  # Reserved variable, auto-set
```

---

## **User Roles & Permissions**

### **End Users (Browser Extension)**
- **Permissions**: Read web page content, access extension storage
- **Capabilities**:
  - View phishing risk scores
  - Submit suspicious URL reports
  - Configure extension settings
  - Enable/disable features
- **Data Access**: Local extension storage only
- **Privacy**: No personal data transmitted unless reporting enabled

### **Administrators**
- **Permissions**: Full access to all reports and system data
- **Capabilities**:
  - View all submitted reports
  - Access report statistics and analytics
  - Monitor system health and S3 status
  - Export report data
- **Data Access**: All S3-stored reports
- **Authentication**: No authentication required (public admin dashboard)

### **System/API Users**
- **Permissions**: API endpoint access
- **Capabilities**:
  - Submit scoring requests
  - Submit report data
  - Access health check endpoints
- **Rate Limits**: None currently implemented
- **Authentication**: None currently implemented

---

## **API Reference**

### **Base URL**
```
https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod
```

### **Public Endpoints**

#### **1. Health Check**
```http
GET /health
```
**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "storage": "s3",
  "bucket": "phishguard-reports-1755667751",
  "region": "us-east-1"
}
```

#### **2. API Information**
```http
GET /
```
**Response**:
```json
{
  "name": "PhishGuard Lite API",
  "version": "1.0.0",
  "description": "Phishing detection and reporting API",
  "storage": "s3",
  "bucket": "phishguard-reports-1755667751"
}
```

#### **3. URL Scoring**
```http
POST /score
Content-Type: application/json

{
  "url": "https://example.com/suspicious",
  "context": "email_link"
}
```
**Response**:
```json
{
  "url": "https://example.com/suspicious",
  "score": 75,
  "risk_level": "high",
  "reasons": [
    "Suspicious TLD",
    "Long URL length"
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### **4. Report Submission**
```http
POST /report
Content-Type: application/json

{
  "url": "https://example.com/suspicious",
  "context": "email_link",
  "tenant_key": "company_abc",
  "user_notes": "Received in phishing email"
}
```
**Response**:
```json
{
  "report_id": "uuid-12345-67890",
  "status": "submitted",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Report submitted successfully"
}
```

### **Admin Endpoints**

#### **1. List All Reports**
```http
GET /admin/api/reports
```
**Response**:
```json
{
  "reports": [
    {
      "id": "uuid-12345-67890",
      "url": "https://example.com/suspicious",
      "context": "email_link",
      "tenant_key": "company_abc",
      "user_notes": "Received in phishing email",
      "reported_at": "2024-01-15T10:30:00Z",
      "status": "new"
    }
  ],
  "total": 1,
  "storage": "s3"
}
```

#### **2. Get Report Summary**
```http
GET /admin/api/reports/summary
```
**Response**:
```json
{
  "total_reports": 1,
  "reports_today": 1,
  "tenant_breakdown": {
    "company_abc": 1
  },
  "storage": "s3"
}
```

#### **3. Get Specific Report**
```http
GET /admin/api/report/{report_id}
```
**Response**:
```json
{
  "id": "uuid-12345-67890",
  "url": "https://example.com/suspicious",
  "context": "email_link",
  "tenant_key": "company_abc",
  "user_notes": "Received in phishing email",
  "reported_at": "2024-01-15T10:30:00Z",
  "status": "new"
}
```

---

## **User Guide**

### **Installing the Browser Extension**

#### **Step 1: Build the Extension**
```bash
cd extension
npm install
npm run build
```

#### **Step 2: Load in Chrome**
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `extension/dist` folder
5. The extension should now appear in your extensions list

### **Using the Extension**

#### **Basic Phishing Detection**
- The extension automatically scans URLs on web pages
- Risk scores appear next to links:
  - **Low Risk** (0-30): Safe to visit
  - **Medium Risk** (31-70): Exercise caution
  - **High Risk** (71-100): Avoid visiting

#### **Reporting Suspicious URLs**
1. Click the **Report** button next to any suspicious link
2. Add optional notes about the context
3. Click **Submit Report**
4. You'll see a confirmation message

#### **Configuring the Extension**
1. Click the extension icon in your browser toolbar
2. Select **Options** or right-click and choose **Options**
3. Configure:
   - **API Base URL**: Backend endpoint (pre-filled)
   - **Enable Extension**: Toggle phishing detection
   - **Enable Reporting**: Toggle report submission
   - **Tenant Key**: Your organization identifier
4. Click **Save** to apply changes

### **Extension Features**
- **Real-time Scanning**: URLs are analyzed as you browse
- **Local Processing**: Scoring happens in your browser
- **Privacy-First**: No data sent unless you choose to report
- **Customizable**: Adjust settings to your preferences

---

## **Admin Guide**

### **Accessing the Admin Dashboard**

#### **Option 1: Direct File Access**
```bash
cd backend
# Open admin-dashboard.html in your browser
open admin-dashboard.html
```

#### **Option 2: Serve Locally**
```bash
cd backend
python -m http.server 8001
# Then visit http://localhost:8001/admin-dashboard.html
```

### **Dashboard Features**

#### **Reports Overview**
- **Total Reports**: Count of all submitted reports
- **Today's Reports**: Reports submitted in the last 24 hours
- **Tenant Breakdown**: Reports organized by organization
- **Storage Status**: S3 connection and bucket information

#### **Report Management**
- **View All Reports**: Complete list with details
- **Report Details**: Individual report information
- **Export Data**: Copy report data for external analysis
- **Status Tracking**: Monitor report processing

#### **System Monitoring**
- **API Health**: Check backend connectivity
- **S3 Status**: Verify storage access
- **Performance**: Monitor response times

### **Admin Tasks**

#### **Daily Operations**
1. Check dashboard for new reports
2. Review high-risk submissions
3. Monitor system health
4. Export data for analysis

#### **Weekly Operations**
1. Review report trends
2. Analyze tenant activity
3. Check storage usage
4. Update extension configurations

#### **Monthly Operations**
1. Review system performance
2. Analyze phishing patterns
3. Update risk scoring weights
4. Plan capacity and scaling

---

## **Development Guide**

### **Local Development Setup**

#### **Prerequisites**
```bash
# Install Node.js 18+
brew install node

# Install Python 3.11
brew install python@3.11

# Install AWS CLI
brew install awscli

# Install SAM CLI
brew install aws-sam-cli

# Install Docker Desktop
brew install --cask docker
```

#### **Extension Development**
```bash
cd extension
npm install
npm run dev          # Development mode with hot reload
npm run build        # Production build
npm run preview      # Preview production build
```

#### **Backend Development**
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### **Code Structure**

#### **Extension Structure**
```
extension/
├── src/
│   ├── background.ts      # Service worker
│   ├── content.ts         # Content script
│   ├── options/           # Options page
│   │   ├── index.html     # Options UI
│   │   ├── index.ts       # Options logic
│   │   └── styles.css     # Options styling
│   └── lib/               # Utilities
│       ├── scoring.ts     # Phishing detection algorithm
│       ├── utils.ts       # Helper functions
│       └── tld-risk.json  # TLD risk data
├── public/                # Static assets
├── manifest.json          # Extension configuration
└── package.json           # Dependencies
```

#### **Backend Structure**
```
backend/
├── app.py                 # Main FastAPI application
├── requirements.txt       # Python dependencies
├── aws-sam/              # AWS deployment configuration
│   └── template.yaml     # SAM template
├── admin-dashboard.html   # Admin interface
├── reports/               # Local report storage
├── deploy.sh              # Deployment script
└── test-*.py             # Test scripts
```

### **Testing**

#### **Extension Testing**
```bash
cd extension
npm run build
# Load dist/ folder in Chrome extensions
# Test on various websites with suspicious URLs
```

#### **API Testing**
```bash
cd backend
# Test local backend
python test-api.py

# Test specific scenarios
python test-specific-scenarios.py

# Test deployed API
curl https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod/health
```

---

## **Deployment Guide**

### **AWS Deployment**

#### **Prerequisites**
1. AWS account with appropriate permissions
2. AWS CLI configured with credentials
3. SAM CLI installed
4. Docker running

#### **Deployment Steps**

##### **Step 1: Configure AWS**
```bash
aws configure
# Enter your Access Key ID, Secret Access Key, Region (us-east-1), Output (json)
```

##### **Step 2: Deploy with SAM**
```bash
cd backend
./deploy.sh
```

**What the script does:**
- Creates deployment S3 bucket if needed
- Builds Lambda package with Docker
- Deploys CloudFormation stack
- Configures API Gateway and Lambda
- Sets up S3 bucket and IAM roles
- Tests deployed endpoints

##### **Step 3: Verify Deployment**
```bash
# Check stack status
aws cloudformation describe-stacks --stack-name phishguard-lite-backend

# Test API endpoints
curl https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod/health
curl https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod/admin/api/reports/summary
```

#### **Manual Deployment (Alternative)**
```bash
cd backend
sam build --use-container
sam deploy --stack-name phishguard-lite-backend --capabilities CAPABILITY_IAM
```

### **Environment Configuration**

#### **Required Environment Variables**
```bash
S3_BUCKET=phishguard-reports-1755667751
AWS_REGION=us-east-1
```

#### **Optional Environment Variables**
```bash
LOG_LEVEL=INFO
CORS_ORIGINS=*
MAX_REPORTS_PER_DAY=1000
```

### **Post-Deployment Steps**

#### **Update Extension Configuration**
1. Update `extension/src/options/index.ts` with new API URL
2. Rebuild extension: `npm run build`
3. Test with new backend

#### **Update Admin Dashboard**
1. Update API URL in `backend/admin-dashboard.html`
2. Test dashboard connectivity
3. Verify report loading

---

## 📊 **Monitoring & Troubleshooting**

### **AWS CloudWatch Monitoring**

#### **Lambda Metrics**
- **Invocation Count**: Number of API calls
- **Duration**: Response time
- **Error Rate**: Failed requests
- **Throttles**: Rate limiting

#### **API Gateway Metrics**
- **Request Count**: Total API requests
- **4XX Errors**: Client errors
- **5XX Errors**: Server errors
- **Latency**: Response time

#### **S3 Metrics**
- **Bucket Size**: Storage usage
- **Request Count**: Read/write operations
- **Error Rate**: Failed operations

### **Logs and Debugging**

#### **Lambda Logs**
```bash
# View real-time logs
aws logs tail phishguard-lite-backend-PhishGuardFunction-XXXXX --follow

# Search logs
aws logs filter-log-events --log-group-name /aws/lambda/phishguard-lite-backend-PhishGuardFunction-XXXXX --filter-pattern "ERROR"
```

#### **API Gateway Logs**
- Enable CloudWatch logging in API Gateway
- Monitor request/response patterns
- Track CORS and authentication issues

### **Common Issues & Solutions**

#### **Extension Issues**

**Problem**: Extension not loading
**Solution**: Check manifest.json paths and rebuild

**Problem**: Options not saving
**Solution**: Verify Chrome storage permissions and CSP settings

**Problem**: Reports not submitting
**Solution**: Check API URL configuration and CORS settings

#### **Backend Issues**

**Problem**: Lambda cold starts
**Solution**: Consider provisioned concurrency for production

**Problem**: S3 access denied
**Solution**: Verify IAM role permissions and bucket policy

**Problem**: API Gateway CORS errors
**Solution**: Check CORS configuration in template.yaml

#### **Deployment Issues**

**Problem**: SAM build failures
**Solution**: Use `--use-container` flag and ensure Docker is running

**Problem**: CloudFormation rollback
**Solution**: Delete failed stack and redeploy

**Problem**: Package size too large
**Solution**: Optimize dependencies and use pure Python packages

### **Performance Optimization**

#### **Lambda Optimization**
- Use pure Python packages (avoid C extensions)
- Optimize cold start times
- Implement connection pooling for S3
- Add caching where appropriate

#### **Extension Optimization**
- Minimize bundle size
- Implement lazy loading
- Use efficient DOM manipulation
- Optimize storage operations

#### **S3 Optimization**
- Implement lifecycle policies
- Use appropriate storage classes
- Optimize request patterns
- Monitor costs and usage

---

## **Security Considerations**

### **Data Protection**
- All data encrypted at rest (S3 SSE-S3)
- Data in transit encrypted (HTTPS/TLS)
- IAM roles with least privilege access
- No sensitive data stored in extension

### **Access Control**
- Public read access to admin dashboard (consider authentication)
- API endpoints publicly accessible (consider rate limiting)
- S3 bucket private with IAM-controlled access
- Lambda function isolated execution environment

### **Privacy Features**
- Local processing by default
- Optional reporting only
- No user tracking or analytics
- Configurable data retention

---

## 📈 **Scaling & Future Enhancements**

### **Immediate Improvements**
1. **Authentication**: Add user authentication for admin dashboard
2. **Rate Limiting**: Implement API rate limiting
3. **Monitoring**: Enhanced CloudWatch dashboards
4. **Backup**: Implement S3 cross-region replication

### **Medium-term Enhancements**
1. **Multi-tenancy**: Enhanced tenant management
2. **Analytics**: Advanced reporting and analytics
3. **Integration**: Webhook support for external systems
4. **Mobile**: Mobile app for admin functions

### **Long-term Roadmap**
1. **Machine Learning**: AI-powered phishing detection
2. **Global Deployment**: Multi-region deployment
3. **Enterprise Features**: SSO, RBAC, audit logs
4. **API Marketplace**: Public API for third-party integration

---

## **Support & Resources**

### **Documentation Links**
- **This Document**: `TECHNICAL_DOCUMENTATION.md`
- **README**: `README.md`
- **Deployment Guide**: `backend/DEPLOYMENT.md`
- **API Spec**: `backend/openapi.yaml`

### **Code Repositories**
- **Main Repo**: `https://github.com/cypherswwayinc/phishguardlite.git`
- **Extension**: `extension/` directory
- **Backend**: `backend/` directory

### **AWS Resources**
- **Lambda Function**: `PhishGuardFunction`
- **API Gateway**: `PhishGuardApi`
- **S3 Bucket**: `phishguard-reports-1755667751`
- **CloudFormation**: `phishguard-lite-backend` stack

### **Contact & Support**
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check this document first
- **AWS Support**: For infrastructure issues
- **Community**: GitHub discussions and wiki

---

## 📝 **Changelog**

### **Version 1.0.0 (Current)**
- Complete system deployment
- AWS Lambda + API Gateway integration
- S3 storage for reports
- Admin dashboard
- Browser extension with reporting
- Comprehensive documentation

### **Planned Versions**
- **v1.1.0**: Authentication and rate limiting
- **v1.2.0**: Enhanced analytics and reporting
- **v1.3.0**: Multi-tenant support
- **v2.0.0**: Machine learning integration

---

**Last Updated**: January 15, 2024  
**Version**: 1.0.0  
**Status**: Production Ready  

---

**PhishGuard Lite** - Complete technical documentation for the phishing detection system. 

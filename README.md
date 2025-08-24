# PhishGuard Lite — Complete Phishing Detection System

A comprehensive phishing detection and reporting system with browser extension, backend API, and admin dashboard.

## System Overview

PhishGuard Lite is a complete phishing detection solution that includes:
- **Browser Extension**: Chrome/Edge/Firefox (MV3) with real-time URL scoring
- **Backend API**: FastAPI service deployed on AWS Lambda with S3 storage
- **Admin Dashboard**: Web interface for viewing and managing phishing reports
- **S3 Integration**: Persistent storage for all phishing reports
- **Configuration System**: Centralized API endpoint management

## Features

### Browser Extension
- Real-time phishing detection on web pages
- Configurable scoring algorithm with customizable weights
- "Report Suspicious" functionality for user submissions
- Options page for API configuration and settings
- Privacy-focused with local processing by default
- Configuration-based API endpoint management

### Backend API
- **Health Check**: `/health` - System status and S3 connection
- **URL Scoring**: `/score` - Phishing risk assessment
- **Report Submission**: `/report` - Store suspicious URL reports
- **Admin Endpoints**: `/admin/api/*` - Report management and analytics

### Admin Dashboard
- View all submitted phishing reports
- Real-time statistics and analytics
- Tenant-based report organization
- S3 storage status monitoring

## Architecture

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

## Prerequisites

- **Node.js 18+** for the extension development
- **Python 3.11+** for local backend development
- **AWS Account** for production deployment
- **AWS CLI & SAM CLI** for infrastructure deployment

## Quick Start

### 1. Extension Development
```bash
cd extension
npm install
npm run dev
```

**Load into Chrome:**
- Visit `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked** → select the `dist` folder

### 2. Backend Development (Local)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### 3. Admin Dashboard
```bash
cd backend
# Open admin-dashboard.html in your browser
# Or serve with: python -m http.server 8001
```

## Production Deployment

### AWS Deployment
The system is pre-configured for AWS deployment using AWS SAM:

```bash
cd backend
# Ensure AWS credentials are configured
aws configure

# Deploy to AWS
sam build --use-container
sam deploy --stack-name phishguard-lite-backend --capabilities CAPABILITY_IAM
```

### Environment Variables
- `S3_BUCKET`: S3 bucket for storing reports
- `AWS_REGION`: AWS region for S3 operations

## API Endpoints

### Public Endpoints
- `GET /` - API information and status
- `GET /health` - Health check with storage status
- `POST /score` - URL phishing risk assessment
- `POST /report` - Submit suspicious URL report

### Admin Endpoints
- `GET /admin/api/reports` - List all reports
- `GET /admin/api/reports/summary` - Report statistics
- `GET /admin/api/report/{id}` - Get specific report

## Configuration

### Extension Settings
- **API Base URL**: Configure backend endpoint
- **Enable Extension**: Toggle phishing detection
- **Enable Reporting**: Toggle report submission
- **Tenant Key**: Organization identifier for reports

### Scoring Algorithm
Customize detection weights in `extension/src/lib/scoring.ts`:
- TLD risk assessment
- URL length analysis
- Domain mismatch detection
- Punycode/homoglyph detection

### Configuration System
The extension now uses a centralized configuration system in `extension/config.ts`:
- Easy API endpoint management
- Environment-specific configurations
- No hardcoded URLs in source code

## Project Structure

```
phishguard-lite-starter-with-admin/
├── extension/                 # Browser extension
│   ├── src/
│   │   ├── background.ts     # Service worker
│   │   ├── content.ts        # Content script
│   │   ├── options/          # Options page
│   │   ├── config.ts         # Configuration system
│   │   └── lib/              # Utilities and scoring
│   ├── public/               # Icons and assets
│   └── manifest.json         # Extension manifest
├── backend/                   # Backend API
│   ├── app.py                # FastAPI application
│   ├── requirements.txt      # Python dependencies
│   ├── template.yaml         # AWS SAM template
│   ├── admin-dashboard.html  # Admin interface
│   └── reports/              # Local report storage
└── README.md                 # This file
```

## Security & Privacy

- **Local Processing**: URL scoring happens locally by default
- **Optional Reporting**: Users choose whether to submit reports
- **S3 Encryption**: All reports stored with server-side encryption
- **IAM Roles**: Least-privilege access for Lambda functions
- **CORS Configuration**: Configurable cross-origin policies
- **Security Hardening**: All AWS identifiers removed from public repository
- **Configuration Management**: No hardcoded sensitive data in source code

## Testing

### API Testing
```bash
cd backend
python test-api.py                    # Basic endpoint testing
python test-specific-scenarios.py     # Phishing detection scenarios
```

### Extension Testing
- Load extension in browser
- Visit test pages with suspicious URLs
- Verify scoring and reporting functionality
- Test options page configuration

## Troubleshooting

### Common Issues
1. **Extension not loading**: Check manifest.json paths and build output
2. **API connection errors**: Verify backend URL in extension options
3. **S3 access denied**: Check IAM roles and bucket permissions
4. **Lambda cold starts**: Consider provisioned concurrency for production

### Debug Mode
Enable debug logging in the extension options page for detailed troubleshooting.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub
4. Check the deployment logs in AWS CloudWatch

---

**PhishGuard Lite** - Protecting users from phishing attacks, one URL at a time.

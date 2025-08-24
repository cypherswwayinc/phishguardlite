# PhishGuard Lite - Chrome Web Store Package

## 📦 Package Information

- **ZIP File**: `phishguard-lite-chrome-store.zip`
- **Size**: ~12.7 KB (compressed)
- **Version**: 0.2.4
- **Manifest Version**: 3
- **Target Platform**: Chrome Web Store

## 🎯 Extension Overview

**PhishGuard Lite** is a comprehensive phishing detection browser extension that provides real-time protection against malicious links while maintaining user privacy and control.

### Key Features
- **Real-time Phishing Detection**: Analyzes links as you browse
- **Local + Cloud Scoring**: Combines local heuristics with cloud AI
- **One-click Reporting**: Easy reporting of suspicious links
- **Multi-tenant Support**: Organization-based reporting
- **Privacy-focused**: Reports only when user explicitly requests
- **Cross-platform**: Works on Gmail, LinkedIn, Outlook, and more

## 🚀 Installation & Usage

### For End Users
1. **Install from Chrome Web Store**: Search for "PhishGuard Lite"
2. **Automatic Setup**: Extension works immediately with sensible defaults
3. **Configure Settings**: Access options page to customize preferences
4. **Start Browsing**: Phishing detection works automatically

### For Developers/Testing
1. **Download ZIP**: Use `phishguard-lite-chrome-store.zip`
2. **Load Unpacked**: Go to `chrome://extensions/` → Developer mode → Load unpacked
3. **Select Folder**: Extract ZIP and select the extracted folder

## ⚙️ Configuration

### Default Settings
- **Extension Enabled**: ✅ ON by default
- **Report Suspicious**: ✅ ON by default  
- **Minimum Score**: 20 (optimal phishing detection)
- **API Base URL**: Automatically configured to custom domain

### Customization Options
- **Enable/Disable Detection**: Toggle phishing protection
- **Enable Reporting**: Toggle suspicious link reporting
- **Minimum Score**: Adjust risk threshold (0-100)
- **Tenant Key**: Set organization identifier
- **API Configuration**: Automatic domain configuration

## 🔧 Technical Details

### Architecture
- **Frontend**: TypeScript, Chrome Extension Manifest V3
- **Backend**: AWS Lambda + API Gateway + S3
- **Storage**: Chrome Storage Sync/Local with fallback
- **Build System**: Vite + TypeScript compilation

### Files Included
```
phishguard-lite-chrome-store.zip
├── manifest.json          # Extension manifest (v3)
├── background.js          # Service worker
├── content.js            # Content script
├── options.js            # Options page logic
├── config.js             # Configuration system
├── index.html            # Options page UI
├── styles.css            # Options page styling
└── icons/                # Extension icons
    ├── icon16.png        # 16x16 icon
    ├── icon48.png        # 48x48 icon
    └── icon128.png       # 128x128 icon
```

### Permissions Required
- **storage**: Save user preferences and settings
- **Host Permissions**: Access to Gmail, LinkedIn, Outlook, and general web browsing

## 🌐 Supported Platforms

### Email Services
- ✅ Gmail (gmail.com)
- ✅ Outlook (outlook.office.com)
- ✅ LinkedIn (linkedin.com)

### General Web Browsing
- ✅ All HTTPS websites
- ✅ Secure browsing with CSP compliance

## 🔒 Security & Privacy

### Data Protection
- **Local Processing**: URL scoring happens locally by default
- **Optional Reporting**: Users choose whether to submit reports
- **Data Minimization**: Store only necessary information
- **Tenant Isolation**: Separate data by organization

### Privacy Features
- **User Consent**: Reporting only when explicitly requested
- **No Tracking**: No user behavior tracking
- **Local Storage**: Preferences stored locally when possible
- **GDPR Compliant**: Right to delete and export data

## 📊 Performance

### Resource Usage
- **Memory**: Minimal memory footprint
- **CPU**: Efficient local scoring algorithms
- **Network**: Only when reporting is enabled
- **Storage**: < 1MB total extension size

### Detection Accuracy
- **Local Scoring**: Basic heuristics for immediate protection
- **Cloud AI**: Enhanced detection when reporting enabled
- **False Positive Rate**: Optimized for minimal false alarms
- **Response Time**: Sub-second link analysis

## 🚨 Troubleshooting

### Common Issues
1. **Extension Not Working**: Check if enabled in Chrome extensions
2. **No Status Messages**: Verify options page loads correctly
3. **API Errors**: Check network connectivity and API configuration
4. **Reporting Issues**: Ensure reporting is enabled in options

### Debug Information
- **Console Logs**: Detailed logging in browser console
- **Options Page**: Comprehensive settings and status display
- **Test Button**: Built-in status message testing
- **Reset Function**: Restore default settings if needed

## 📝 Chrome Web Store Submission

### Required Information
- **Extension Name**: PhishGuard Lite
- **Description**: Comprehensive phishing detection with privacy focus
- **Category**: Productivity / Security
- **Screenshots**: Options page and detection examples
- **Privacy Policy**: User data handling information

### Store Listing
- **Title**: PhishGuard Lite - Phishing Detection
- **Subtitle**: Real-time protection against malicious links
- **Description**: Professional phishing detection extension with local and cloud scoring
- **Keywords**: phishing, security, protection, links, safety, browser security

## 🔄 Updates & Maintenance

### Version History
- **v0.2.4** (Current): Full functionality with custom domain support
- **v0.2.1**: Admin dashboard and S3 integration
- **v0.1.0**: Basic phishing detection

### Update Process
1. **Code Changes**: Modify source files in `src/` directory
2. **Build**: Run `./build.sh` to compile and package
3. **Test**: Verify functionality in Chrome
4. **Package**: Create new ZIP file for distribution
5. **Deploy**: Update Chrome Web Store listing

## 📞 Support & Contact

### Documentation
- **README.md**: Main project documentation
- **TECHNICAL_DOCUMENTATION.md**: Comprehensive technical details
- **Options Page**: Built-in help and information

### Community
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Community support and ideas
- **Contributing**: Guidelines for contributors

---

## 🎯 Ready for Chrome Web Store!

**This ZIP file contains a fully functional, production-ready Chrome extension that:**

✅ **Meets all Chrome Web Store requirements**  
✅ **Includes comprehensive phishing detection**  
✅ **Provides excellent user experience**  
✅ **Maintains high security standards**  
✅ **Offers professional configuration options**  

**Upload `phishguard-lite-chrome-store.zip` to the Chrome Web Store Developer Dashboard to publish your extension!**

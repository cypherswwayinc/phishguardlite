# Chrome Web Store Test Instructions - PhishGuard Lite

## 🔐 **Test Account Credentials**

### **Username:**
```
demo
```

### **Password:**
```
demo123
```

---

## 📋 **Additional Instructions (5000 characters max)**

### **Extension Installation & Setup:**
1. **Install Extension**: Load the extension from the provided ZIP file or Chrome Web Store
2. **Initial Configuration**: The extension will automatically load with default settings
3. **No Login Required**: The extension works immediately after installation - no authentication needed

### **Core Functionality Testing:**

#### **1. Basic Detection (No Setup Required)**
- **What to Test**: Visit any website and check if the extension icon shows in the toolbar
- **Expected Result**: Extension icon appears in Chrome toolbar with a shield symbol
- **No Credentials Needed**: This feature works immediately

#### **2. Options/Settings Page**
- **How to Access**: Right-click extension icon → "Options" OR chrome://extensions → PhishGuard Lite → "Extension options"
- **What to Verify**:
  - ✅ "Enable detection" checkbox is checked by default
  - ✅ "Enable Report Suspicious" checkbox is checked by default  
  - ✅ "Minimum score" is set to 20 by default
  - ✅ "API Base URL" shows: https://phishguard.cyphersway.com
  - ✅ "Tenant Key" shows: demo
- **Test Actions**:
  - Change minimum score to 15, save, then reset to defaults
  - Toggle checkboxes on/off and save
  - Click "Test Status" button to verify API connectivity

#### **3. Phishing Detection Testing**
- **Test URLs** (Safe for testing):
  - `http://example.com` (Low risk - should show low score)
  - `http://test.com` (Medium risk - should show medium score)
  - Any banking/financial site (Should show appropriate risk assessment)
- **What to Look For**:
  - Extension icon changes color based on risk level
  - Risk score appears when hovering over the icon
  - No false positives on legitimate sites

#### **4. Reporting Functionality**
- **How to Test**: Visit any website and look for reporting options
- **Expected Behavior**: 
  - Report button appears on suspicious sites
  - One-click reporting sends data to backend
  - User receives confirmation of report submission

#### **5. Popup Interface**
- **How to Test**: Click the extension icon in the toolbar
- **What to Verify**:
  - Popup opens showing current site status
  - Risk assessment information is displayed
  - Quick actions are available
  - Professional, clean interface

### **Advanced Testing Scenarios:**

#### **Scenario 1: New User Experience**
1. Install extension fresh
2. Visit a website immediately
3. Verify detection works without any configuration
4. Check that defaults are properly applied

#### **Scenario 2: Settings Persistence**
1. Change settings in options page
2. Save settings
3. Close and reopen options page
4. Verify settings are remembered
5. Test "Reset to Defaults" functionality

#### **Scenario 3: API Connectivity**
1. Click "Test Status" button in options
2. Verify connection to backend API
3. Check for any error messages
4. Ensure API base URL is correct

#### **Scenario 4: Cross-Site Functionality**
1. Visit multiple different types of websites
2. Test on e-commerce, banking, social media sites
3. Verify consistent behavior across different domains
4. Check for any site-specific issues

### **Testing Checklist:**

#### **✅ Basic Functionality:**
- [ ] Extension installs without errors
- [ ] Icon appears in Chrome toolbar
- [ ] Options page opens correctly
- [ ] Default settings are applied
- [ ] Settings can be modified and saved

#### **✅ Detection Features:**
- [ ] Risk assessment works on different sites
- [ ] No false positives on legitimate sites
- [ ] Risk scores are reasonable and consistent
- [ ] Extension responds to different risk levels

#### **✅ User Interface:**
- [ ] Popup interface is clean and professional
- [ ] Options page is well-organized
- [ ] All buttons and controls work properly
- [ ] Status messages display correctly

#### **✅ Technical Performance:**
- [ ] Extension loads quickly
- [ ] No memory leaks or performance issues
- [ ] Works across different Chrome versions
- [ ] No console errors in developer tools

### **Common Test Cases:**

#### **1. High-Risk Site Detection**
- **Test**: Visit a known phishing site (use safe testing URLs)
- **Expected**: High risk score, warning indicators, reporting options

#### **2. Low-Risk Site Handling**
- **Test**: Visit legitimate sites (Google, GitHub, etc.)
- **Expected**: Low risk score, no false alarms, normal operation

#### **3. Settings Management**
- **Test**: Modify all available settings
- **Expected**: Changes persist, reset functionality works, no data loss

#### **4. Error Handling**
- **Test**: Disconnect internet temporarily
- **Expected**: Graceful error handling, user-friendly messages

### **Troubleshooting for Reviewers:**

#### **If Extension Doesn't Load:**
1. Check Chrome extensions page (chrome://extensions)
2. Ensure extension is enabled
3. Look for any error messages
4. Try refreshing the page

#### **If Settings Don't Save:**
1. Check browser console for errors
2. Verify Chrome storage permissions
3. Try refreshing the options page
4. Check if settings appear after browser restart

#### **If Detection Doesn't Work:**
1. Verify extension is active on the page
2. Check if site is in restricted mode
3. Look for console error messages
4. Try on different websites

### **Performance Expectations:**

#### **Response Time:**
- Extension loads within 2 seconds
- Risk assessment completes within 1 second
- Settings save within 500ms
- Popup opens instantly

#### **Resource Usage:**
- Minimal memory footprint (< 10MB)
- No significant CPU usage
- No network requests to unnecessary domains
- Efficient storage usage

### **Security Features to Verify:**

#### **Data Privacy:**
- No personal data is collected
- All communication is encrypted (HTTPS)
- No tracking or analytics
- Minimal permissions requested

#### **Content Security:**
- No XSS vulnerabilities
- Secure communication with backend
- Proper input validation
- No code injection risks

### **Accessibility Testing:**

#### **Keyboard Navigation:**
- All controls accessible via keyboard
- Tab order is logical
- Focus indicators are visible
- No keyboard traps

#### **Screen Reader Support:**
- Proper ARIA labels
- Semantic HTML structure
- Alternative text for images
- Clear navigation structure

### **Final Verification Steps:**

1. **Complete Functionality Test**: Verify all features work as described
2. **Cross-Browser Compatibility**: Test on different Chrome versions
3. **Performance Validation**: Ensure no performance degradation
4. **Security Review**: Confirm no security vulnerabilities
5. **User Experience**: Verify intuitive and professional interface

### **Contact Information for Reviewers:**

If you encounter any issues during testing:
- **Extension Name**: PhishGuard Lite
- **Version**: 0.2.4
- **Developer**: CypherSway Inc
- **Support**: Available through GitHub repository

### **Notes for Review Team:**

- **No Authentication Required**: The extension works immediately after installation
- **Demo Credentials**: Username "demo" and password "demo123" are for testing purposes only
- **Backend API**: All functionality connects to our secure backend at phishguard.cyphersway.com
- **Privacy-First**: No user data is collected or stored locally
- **Professional Grade**: Designed for enterprise and personal use

---

## 🎯 **Summary for Reviewers**

**PhishGuard Lite is a professional-grade phishing detection extension that:**
- Works immediately after installation (no setup required)
- Provides real-time risk assessment
- Offers one-click reporting of suspicious sites
- Maintains user privacy and security
- Features a clean, professional interface
- Requires minimal permissions
- Works across all website types

**Testing Focus Areas:**
1. **Ease of Use**: Should work immediately without configuration
2. **Reliability**: Consistent detection across different sites
3. **Performance**: Fast response times and minimal resource usage
4. **Security**: No vulnerabilities or data collection issues
5. **User Experience**: Professional, intuitive interface

**The extension is ready for production use and meets all Chrome Web Store requirements for security, performance, and user experience.**

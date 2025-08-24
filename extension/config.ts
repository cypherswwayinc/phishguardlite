// PhishGuard Lite Configuration
// Update this file with your custom domain

export const CONFIG = {
  // Custom Domain Configuration
  // Set this to your business domain (e.g., "api.yourcompany.com")
  // Leave empty to use AWS API Gateway URL
  CUSTOM_DOMAIN: "phishguard.cyphersway.com", // Your domain here
  
  // AWS Fallback (used if no custom domain is set)
  AWS_REGION: "us-east-1",
  
  // Extension Settings
  EXTENSION_NAME: "PhishGuard Lite",
  VERSION: "0.2.4",
  
  // Feature Flags
  ENABLE_CLOUD_SCORING: true,
  ENABLE_REPORTING: true,
  ENABLE_LOCAL_DETECTION: true,
};

// Get the API base URL
export function getApiBaseUrl(): string {
  if (CONFIG.CUSTOM_DOMAIN) {
    return `https://${CONFIG.CUSTOM_DOMAIN}`;
  }
  
  // Fallback to AWS API Gateway (you'll need to update this after deployment)
  return `https://YOUR_API_ID.execute-api.${CONFIG.AWS_REGION}.amazonaws.com/Prod`;
}

// Get the admin dashboard URL
export function getAdminDashboardUrl(): string {
  if (CONFIG.CUSTOM_DOMAIN) {
    return `https://${CONFIG.CUSTOM_DOMAIN}/admin-dashboard.html`;
  }
  
  // Fallback to AWS API Gateway
  return `https://YOUR_API_ID.execute-api.${CONFIG.AWS_REGION}.amazonaws.com/Prod/admin-dashboard.html`;
}

// Configuration validation
export function validateConfig(): boolean {
  if (CONFIG.CUSTOM_DOMAIN) {
    // Validate custom domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(CONFIG.CUSTOM_DOMAIN);
  }
  return true;
}

// Export for use in other files
export default CONFIG;

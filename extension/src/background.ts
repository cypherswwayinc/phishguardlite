import { getApiBaseUrl } from '../config';

const DEFAULT_API = getApiBaseUrl();

// Background script for PhishGuard Lite
// Uses activeTab permission for enhanced security

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.type === 'pg_report_suspicious') {
    console.log('Processing suspicious link report:', message);
    
    // Handle the report asynchronously
    postReport(message).then(response => {
      console.log('Report response:', response);
      sendResponse(response);
    }).catch(error => {
      console.error('Report error:', error);
      sendResponse({ ok: false, error: error.message });
    });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

// Handle extension icon click to activate on current tab
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url) {
    console.log('Extension icon clicked on tab:', tab.id, tab.url);
    
    // Check if this is a supported site
    const supportedHosts = [
      'mail.google.com',
      'www.linkedin.com', 
      'linkedin.com',
      'outlook.office.com',
      'outlook.live.com'
    ];
    
    try {
      const url = new URL(tab.url);
      if (supportedHosts.includes(url.hostname)) {
        // Inject content script to activate scanning on this tab
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log('Content script activated on tab:', tab.id);
      } else {
        console.log('Site not supported for active scanning:', url.hostname);
      }
    } catch (error) {
      console.error('Error processing tab click:', error);
    }
  }
});

async function postReport(body: any) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiBase", "tenantKey"], async (s) => {
      try {
        const apiBase = (s.apiBase || DEFAULT_API).replace(/\/$/, "");
        const tenantKey = s.tenantKey || '';
        
        console.log('Sending report to:', apiBase);
        console.log('Report data:', body);
        
        const response = await fetch(`${apiBase}/report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: body.url,
            tenantKey: tenantKey,
            context: {
              linkText: body.linkText,
              pageUrl: body.pageUrl,
              reasons: body.reasons,
              timestamp: new Date().toISOString()
            }
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Report API error:', response.status, errorText);
          resolve({ 
            ok: false, 
            error: `API Error: ${response.status} ${response.statusText}` 
          });
          return;
        }
        
        const result = await response.json();
        console.log('Report successful:', result);
        resolve({ ok: true, message: result.message, reportId: result.reportId });
        
      } catch (e) {
        console.error('Report fetch error:', e);
        resolve({ 
          ok: false, 
          error: e instanceof Error ? e.message : 'Unknown error' 
        });
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("PhishGuard Lite installed with activeTab permission");
});
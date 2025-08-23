const DEFAULT_API = "https://szyld5pw2d.execute-api.us-east-1.amazonaws.com/Prod";
// src/background.ts
// Handles "Report Suspicious" requests by posting to backend /report

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
  console.log("PhishGuard Lite installed");
});
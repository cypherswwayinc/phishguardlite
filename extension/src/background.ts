// src/background.ts
// Handles "Report Suspicious" requests by posting to backend /report
async function postReport(body) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiBase", "tenantKey"], async (s) => {
      try {
        const apiBase = (s.apiBase || "").replace(/\/$/, "");
        if (!apiBase) return resolve({ ok: false, error: "API base not set" });
        const resp = await fetch(`${apiBase}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: body.url,
            tenantKey: s.tenantKey || null,
            context: { pageUrl: body.pageUrl, linkText: body.linkText, reasons: body.reasons, reportedAt: new Date().toISOString() }
          })
        });
        const data = await resp.json().catch(() => ({}));
        resolve({ ok: resp.ok, data });
      } catch (e) {
        resolve({ ok: false, error: String(e) });
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("PhishGuard Lite installed");
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "pg_report_suspicious") {
    postReport(msg).then(sendResponse);
    return true; // keep the message channel open for async response
  }
});
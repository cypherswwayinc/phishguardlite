"use strict";
(() => {
  // config.ts
  var CONFIG = {
    // Custom Domain Configuration
    // Set this to your business domain (e.g., "api.yourcompany.com")
    // Leave empty to use AWS API Gateway URL
    CUSTOM_DOMAIN: "phishguard.cyphersway.com",
    // Your domain here
    // AWS Fallback (used if no custom domain is set)
    AWS_REGION: "us-east-1",
    // Extension Settings
    EXTENSION_NAME: "PhishGuard Lite",
    VERSION: "0.3.1",
    // Feature Flags
    ENABLE_CLOUD_SCORING: false,
    // scoring is local-only; reports are sent only on user click
    ENABLE_REPORTING: true,
    ENABLE_LOCAL_DETECTION: true
  };
  function getApiBaseUrl() {
    if (CONFIG.CUSTOM_DOMAIN) {
      return `https://${CONFIG.CUSTOM_DOMAIN}`;
    }
    return `https://YOUR_API_ID.execute-api.${CONFIG.AWS_REGION}.amazonaws.com/Prod`;
  }

  // src/background.ts
  var DEFAULT_API = getApiBaseUrl();
  var REQUEST_TIMEOUT_MS = 1e4;
  function str(v, max) {
    return typeof v === "string" ? v.slice(0, max) : "";
  }
  function isHttpUrl(v) {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }
  async function readSettings() {
    let s = {};
    try {
      s = await chrome.storage.sync.get(["apiBase", "tenantKey"]);
    } catch {
    }
    if (Object.keys(s).length === 0) {
      try {
        s = await chrome.storage.local.get(["apiBase", "tenantKey"]);
      } catch {
      }
    }
    const apiBase = (typeof s.apiBase === "string" && s.apiBase.trim() ? s.apiBase.trim() : DEFAULT_API).replace(/\/$/, "");
    return { apiBase, tenantKey: str(s.tenantKey, 128) };
  }
  async function postReport(msg) {
    const url = str(msg.url, 2048);
    if (!isHttpUrl(url)) return { ok: false, error: "Invalid URL" };
    const { apiBase, tenantKey } = await readSettings();
    if (!apiBase.startsWith("https://")) return { ok: false, error: "API address must use HTTPS" };
    const reasons = Array.isArray(msg.reasons) ? msg.reasons.slice(0, 10).map((r) => str(r, 200)).filter(Boolean) : [];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${apiBase}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          url,
          tenantKey,
          score: typeof msg.score === "number" && Number.isFinite(msg.score) ? Math.round(msg.score) : void 0,
          label: str(msg.label, 20) || void 0,
          context: {
            linkText: str(msg.linkText, 300),
            pageUrl: str(msg.pageUrl, 200),
            // origin only
            reasons,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        })
      });
      if (!response.ok) return { ok: false, error: `API error ${response.status}` };
      const body = await response.json();
      return { ok: body?.ok !== false, message: body?.message, reportId: body?.reportId };
    } catch (e) {
      return { ok: false, error: e instanceof Error && e.name === "AbortError" ? "Timed out" : "Network error" };
    } finally {
      clearTimeout(timer);
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message?.type !== "pg_report_suspicious") return;
    postReport(message).then(sendResponse, () => sendResponse({ ok: false, error: "Unexpected error" }));
    return true;
  });
  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage();
  });
})();

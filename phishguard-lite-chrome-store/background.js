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
    VERSION: "0.4.0",
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
  function count(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(999, Math.max(0, Math.round(n))) : 0;
  }
  async function showPageStatus(tabId, msg) {
    const high = count(msg.high);
    const total = high + count(msg.caution);
    let text;
    let color;
    let title;
    if (msg.active === false) {
      text = "off";
      color = "#5f6368";
      title = "PhishGuard Lite is turned off. Click to open settings.";
    } else if (total === 0) {
      text = "\u2713";
      color = "#188038";
      title = "PhishGuard Lite: no risky links found on this page";
    } else {
      text = String(total);
      color = high > 0 ? "#c5221f" : "#b06000";
      title = `PhishGuard Lite: ${total} risky link${total === 1 ? "" : "s"} on this page`;
    }
    try {
      await chrome.action.setBadgeText({ tabId, text });
      await chrome.action.setBadgeBackgroundColor({ tabId, color });
      await chrome.action.setBadgeTextColor({ tabId, color: "#ffffff" });
      await chrome.action.setTitle({ tabId, title });
    } catch {
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message?.type === "pg_page_stats") {
      if (sender.tab?.id !== void 0) void showPageStatus(sender.tab.id, message);
      return;
    }
    if (message?.type !== "pg_report_suspicious") return;
    postReport(message).then(sendResponse, () => sendResponse({ ok: false, error: "Unexpected error" }));
    return true;
  });
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      void chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
    }
  });
  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage();
  });
})();

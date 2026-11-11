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
    VERSION: "0.3.0",
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

  // src/options/index.ts
  var DEFAULT_API_BASE = getApiBaseUrl();
  var KEYS = ["enabled", "minScore", "apiBase", "tenantKey", "enableReporting"];
  var $ = (id) => document.getElementById(id);
  var statusTimer;
  function setStatus(msg, ok = true) {
    const box = $("status");
    if (!box) return;
    box.textContent = msg;
    box.className = `status ${ok ? "success" : "error"}`;
    box.style.display = "block";
    clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => box.style.display = "none", 5e3);
  }
  function readForm() {
    const minScore = Number($("minScore")?.value);
    return {
      enabled: $("enabled")?.checked ?? true,
      enableReporting: $("enableReporting")?.checked ?? true,
      minScore: Number.isFinite(minScore) ? Math.min(100, Math.max(0, Math.round(minScore))) : 20,
      apiBase: $("apiBase")?.value.trim() || DEFAULT_API_BASE,
      tenantKey: $("tenantKey")?.value.trim() ?? ""
    };
  }
  function writeForm(s) {
    const set = (id, fn) => {
      const el = $(id);
      if (el) fn(el);
    };
    set("enabled", (el) => el.checked = s.enabled ?? true);
    set("enableReporting", (el) => el.checked = s.enableReporting ?? true);
    set("minScore", (el) => el.value = String(s.minScore ?? 20));
    set("apiBase", (el) => el.value = s.apiBase || DEFAULT_API_BASE);
    set("tenantKey", (el) => el.value = s.tenantKey ?? "");
  }
  async function load() {
    let stored = {};
    try {
      stored = await chrome.storage.sync.get(KEYS);
    } catch {
    }
    if (Object.keys(stored).length === 0) {
      try {
        stored = await chrome.storage.local.get(KEYS);
      } catch {
      }
    }
    writeForm(stored);
  }
  async function save() {
    const btn = $("save");
    const settings = readForm();
    if (!settings.apiBase.startsWith("https://")) {
      setStatus("API address must start with https://", false);
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }
    try {
      try {
        await chrome.storage.sync.set(settings);
      } catch {
        await chrome.storage.local.set(settings);
      }
      writeForm(settings);
      setStatus("Settings saved \u2713");
    } catch (e) {
      setStatus("Could not save settings: " + (e instanceof Error ? e.message : String(e)), false);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Save";
      }
    }
  }
  function addInfoBox() {
    const status = $("status");
    if (!status?.parentNode) return;
    const box = document.createElement("div");
    box.className = "info-box";
    const title = document.createElement("h4");
    title.textContent = "How PhishGuard Lite works";
    const list = document.createElement("ul");
    list.style.cssText = "margin: 5px 0; padding-left: 20px;";
    for (const line of [
      "Links are checked locally in your browser. Nothing is sent anywhere while you read email.",
      "A link is only sent to PhishGuard when you press its Report button.",
      "Minimum score: links scoring at or above this value get a badge (20 = Caution, 50 = High Risk).",
      "Works on Gmail, Outlook on the web and LinkedIn."
    ]) {
      const li = document.createElement("li");
      li.textContent = line;
      list.appendChild(li);
    }
    box.append(title, list);
    status.parentNode.insertBefore(box, status.nextSibling);
  }
  document.addEventListener("DOMContentLoaded", () => {
    void load();
    $("save")?.addEventListener("click", () => void save());
    $("reset")?.addEventListener("click", () => {
      writeForm({});
      setStatus("Defaults restored. Press Save to apply.");
    });
    addInfoBox();
  });
})();

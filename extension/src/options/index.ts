// src/options/index.ts
const enabledEl = document.getElementById('enabled') as HTMLInputElement;
const minScoreEl = document.getElementById('minScore') as HTMLInputElement;
const apiUrlEl = document.getElementById('apiBase') as HTMLInputElement; // Keep ID for HTML compatibility
const tenantKeyEl = document.getElementById('tenantKey') as HTMLInputElement;
const enableReportingEl = document.getElementById('enableReporting') as HTMLInputElement;
const saveBtn = document.getElementById('save') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

function load() {
  chrome.storage.sync.get(["enabled", "minScore", "apiUrl", "tenantKey", "enableReporting"], (s) => {
    enabledEl.checked = s.enabled ?? true;
    minScoreEl.value = String(s.minScore ?? 20);
    apiUrlEl.value = s.apiUrl ?? "http://localhost:8080";
    tenantKeyEl.value = s.tenantKey ?? "";
    enableReportingEl.checked = s.enableReporting ?? false;
  });
}

function save() {
  const payload = {
    enabled: enabledEl.checked,
    minScore: Number(minScoreEl.value || 20),
    apiUrl: apiUrlEl.value.trim() || "http://localhost:8080",
    tenantKey: tenantKeyEl.value.trim(),
    enableReporting: enableReportingEl.checked,
  };
  chrome.storage.sync.set(payload, () => {
    statusEl.textContent = "Saved.";
    setTimeout(() => statusEl.textContent = "", 1500);
  });
}

saveBtn.addEventListener("click", save);
document.addEventListener("DOMContentLoaded", load);
// src/options/index.ts
const enabledEl = document.getElementById('enabled') as HTMLInputElement;
const minScoreEl = document.getElementById('minScore') as HTMLInputElement;
const apiBaseEl = document.getElementById('apiBase') as HTMLInputElement;
const tenantKeyEl = document.getElementById('tenantKey') as HTMLInputElement;
const enableReportingEl = document.getElementById('enableReporting') as HTMLInputElement;
const saveBtn = document.getElementById('save') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

function load() {
  chrome.storage.sync.get(["enabled", "minScore", "apiBase", "tenantKey", "enableReporting"], (s) => {
    enabledEl.checked = s.enabled ?? true;
    minScoreEl.value = String(s.minScore ?? 20);
    apiBaseEl.value = s.apiBase ?? "";
    tenantKeyEl.value = s.tenantKey ?? "";
    enableReportingEl.checked = s.enableReporting ?? false;
  });
}

function save() {
  const payload = {
    enabled: enabledEl.checked,
    minScore: Number(minScoreEl.value || 20),
    apiBase: apiBaseEl.value.trim(),
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
// Options page logic for PhishGuard Lite.
import { getApiBaseUrl } from "../../config";

const DEFAULT_API_BASE = getApiBaseUrl();
const KEYS = ["enabled", "minScore", "apiBase", "tenantKey", "enableReporting"];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

let statusTimer: number | undefined;
function setStatus(msg: string, ok = true): void {
  const box = $<HTMLDivElement>("status");
  if (!box) return;
  box.textContent = msg;
  box.className = `status ${ok ? "success" : "error"}`;
  box.style.display = "block";
  clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => (box.style.display = "none"), 5000);
}

function readForm() {
  const minScore = Number($<HTMLInputElement>("minScore")?.value);
  return {
    enabled: $<HTMLInputElement>("enabled")?.checked ?? true,
    enableReporting: $<HTMLInputElement>("enableReporting")?.checked ?? true,
    minScore: Number.isFinite(minScore) ? Math.min(100, Math.max(0, Math.round(minScore))) : 20,
    apiBase: $<HTMLInputElement>("apiBase")?.value.trim() || DEFAULT_API_BASE,
    tenantKey: $<HTMLInputElement>("tenantKey")?.value.trim() ?? "",
  };
}

function writeForm(s: Partial<ReturnType<typeof readForm>>): void {
  const set = <T extends HTMLInputElement>(id: string, fn: (el: T) => void) => {
    const el = $<T>(id);
    if (el) fn(el);
  };
  set("enabled", (el) => (el.checked = s.enabled ?? true));
  set("enableReporting", (el) => (el.checked = s.enableReporting ?? true));
  set("minScore", (el) => (el.value = String(s.minScore ?? 20)));
  set("apiBase", (el) => (el.value = s.apiBase || DEFAULT_API_BASE));
  set("tenantKey", (el) => (el.value = s.tenantKey ?? ""));
}

async function load(): Promise<void> {
  let stored: Record<string, unknown> = {};
  try {
    stored = await chrome.storage.sync.get(KEYS);
  } catch {
    /* sync unavailable */
  }
  if (Object.keys(stored).length === 0) {
    try {
      stored = await chrome.storage.local.get(KEYS);
    } catch {
      /* defaults */
    }
  }
  writeForm(stored as Partial<ReturnType<typeof readForm>>);
}

async function save(): Promise<void> {
  const btn = $<HTMLButtonElement>("save");
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
      await chrome.storage.local.set(settings); // managed profiles without sync
    }
    writeForm(settings); // show the cleaned-up values that were actually stored
    setStatus("Settings saved ✓");
  } catch (e) {
    setStatus("Could not save settings: " + (e instanceof Error ? e.message : String(e)), false);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save";
    }
  }
}

function addInfoBox(): void {
  const status = $<HTMLDivElement>("status");
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
    "Works on Gmail, Outlook on the web and LinkedIn.",
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

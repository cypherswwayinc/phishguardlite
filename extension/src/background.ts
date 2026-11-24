// src/background.ts
// Service worker. Its only network job is submitting a report the user explicitly clicked.
// (Content scripts on Gmail/Outlook can't call our API directly; the worker can, via host_permissions.)

import { getApiBaseUrl } from "../config";

const DEFAULT_API = getApiBaseUrl();
const REQUEST_TIMEOUT_MS = 10_000;

type ReportMessage = {
  type: "pg_report_suspicious";
  url: unknown;
  linkText?: unknown;
  pageUrl?: unknown;
  reasons?: unknown;
  score?: unknown;
  label?: unknown;
};

type Result = { ok: boolean; message?: string; reportId?: string; error?: string };

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function readSettings(): Promise<{ apiBase: string; tenantKey: string }> {
  let s: Record<string, unknown> = {};
  try {
    s = await chrome.storage.sync.get(["apiBase", "tenantKey"]);
  } catch {
    /* fall through to local */
  }
  if (Object.keys(s).length === 0) {
    try {
      s = await chrome.storage.local.get(["apiBase", "tenantKey"]);
    } catch {
      /* defaults */
    }
  }
  const apiBase = (typeof s.apiBase === "string" && s.apiBase.trim() ? s.apiBase.trim() : DEFAULT_API).replace(/\/$/, "");
  return { apiBase, tenantKey: str(s.tenantKey, 128) };
}

async function postReport(msg: ReportMessage): Promise<Result> {
  const url = str(msg.url, 2048);
  if (!isHttpUrl(url)) return { ok: false, error: "Invalid URL" };

  const { apiBase, tenantKey } = await readSettings();
  if (!apiBase.startsWith("https://")) return { ok: false, error: "API address must use HTTPS" };

  const reasons = Array.isArray(msg.reasons)
    ? msg.reasons.slice(0, 10).map((r) => str(r, 200)).filter(Boolean)
    : [];

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
        score: typeof msg.score === "number" && Number.isFinite(msg.score) ? Math.round(msg.score) : undefined,
        label: str(msg.label, 20) || undefined,
        context: {
          linkText: str(msg.linkText, 300),
          pageUrl: str(msg.pageUrl, 200), // origin only
          reasons,
          timestamp: new Date().toISOString(),
        },
      }),
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

type StatsMessage = { type: "pg_page_stats"; active?: unknown; high?: unknown; caution?: unknown };

function count(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(999, Math.max(0, Math.round(n))) : 0;
}

/**
 * Toolbar icon status for one tab, so people can see the extension is working even when
 * nothing is flagged: a green tick when the page is clear, a number when links were flagged.
 * Counts stay inside the browser (content script -> this worker); nothing is sent anywhere.
 */
async function showPageStatus(tabId: number, msg: StatsMessage): Promise<void> {
  const high = count(msg.high);
  const total = high + count(msg.caution);
  let text: string;
  let color: string;
  let title: string;
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
    /* the tab was closed before we could update it */
  }
}

chrome.runtime.onMessage.addListener((message: ReportMessage | StatsMessage, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return; // ignore anything not from this extension
  if (message?.type === "pg_page_stats") {
    if (sender.tab?.id !== undefined) void showPageStatus(sender.tab.id, message);
    return;
  }
  if (message?.type !== "pg_report_suspicious") return;
  postReport(message).then(sendResponse, () => sendResponse({ ok: false, error: "Unexpected error" }));
  return true; // keep the channel open for the async response
});

// First install: open a short welcome page that shows what a warning looks like.
// (Updates do not reopen it.)
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

// There is no popup: clicking the toolbar icon opens the settings page.
chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

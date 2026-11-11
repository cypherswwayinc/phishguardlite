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

chrome.runtime.onMessage.addListener((message: ReportMessage, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return; // ignore anything not from this extension
  if (message?.type !== "pg_report_suspicious") return;
  postReport(message).then(sendResponse, () => sendResponse({ ok: false, error: "Unexpected error" }));
  return true; // keep the channel open for the async response
});

// There is no popup: clicking the toolbar icon opens the settings page.
chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

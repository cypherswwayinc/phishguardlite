// src/content.ts
// Runs on the pages listed in manifest.json (Gmail, Outlook on the web, LinkedIn).
// All scoring is local: no link ever leaves the browser unless the user clicks "Report".

import { analyzeLink } from "./lib/scoring";
import { attachBadge, WRAP_CLASS, hideTooltip } from "./lib/utils";

type Settings = { enabled: boolean; minScore: number; enableReporting: boolean };

const SETTING_KEYS = ["enabled", "minScore", "enableReporting"];
let settings: Settings = { enabled: true, minScore: 20, enableReporting: true };

// href each anchor was last evaluated with, and the badge we attached (if any)
const evaluatedHref = new WeakMap<HTMLAnchorElement, string>();
const badges = new WeakMap<HTMLAnchorElement, HTMLElement>();

function clampScore(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 20;
}

async function loadSettings(): Promise<void> {
  let stored: Record<string, unknown> = {};
  try {
    stored = await chrome.storage.sync.get(SETTING_KEYS);
  } catch {
    /* sync unavailable (some managed profiles) */
  }
  if (Object.keys(stored).length === 0) {
    try {
      stored = await chrome.storage.local.get(SETTING_KEYS); // options page falls back to local
    } catch {
      /* use defaults */
    }
  }
  settings = {
    enabled: stored.enabled !== false,
    minScore: clampScore(stored.minScore ?? 20),
    enableReporting: stored.enableReporting !== false,
  };
}

// Tell the toolbar icon how many risky links are on the page (green tick when there are none).
// Counted from the badges actually on screen, so closing an email updates the number too.
let statsTimer: number | undefined;
function reportStats(): void {
  if (statsTimer !== undefined) return;
  statsTimer = window.setTimeout(() => {
    statsTimer = undefined;
    const high = document.querySelectorAll('.pg-badge[data-level="high"]').length;
    const caution = document.querySelectorAll('.pg-badge[data-level="caution"]').length;
    try {
      void chrome.runtime.sendMessage({ type: "pg_page_stats", active: settings.enabled, high, caution }).catch(() => {});
    } catch {
      /* extension was updated or reloaded while this tab was open */
    }
  }, 300);
}

function removeBadge(a: HTMLAnchorElement): void {
  hideTooltip(badges.get(a));
  badges.get(a)?.remove();
  badges.delete(a);
}

function evaluate(a: HTMLAnchorElement): void {
  if (!settings.enabled) return;
  if (a.closest(`.${WRAP_CLASS}`)) return; // our own UI
  // Never touch links inside editable areas: badges would end up in the email being written.
  if (a.isContentEditable) return;

  const raw = a.getAttribute("href");
  if (!raw || raw.startsWith("#")) return;

  const current = a.href; // absolute, resolved by the browser
  if (evaluatedHref.get(a) === current) return; // already handled, nothing changed
  evaluatedHref.set(a, current);
  removeBadge(a);

  const result = analyzeLink(current, a.textContent, location.href);
  if (!result || result.score < settings.minScore) return;
  badges.set(a, attachBadge(a, result, settings.enableReporting));
}

function scan(root: ParentNode): void {
  if (root instanceof HTMLAnchorElement) evaluate(root);
  root.querySelectorAll?.("a[href]").forEach((a) => evaluate(a as HTMLAnchorElement));
}

// Mutations arrive in bursts (Gmail re-renders whole threads): batch them.
const pending = new Set<Element>();
let flushTimer: number | undefined;

function queue(node: Element): void {
  if (node.classList?.contains(WRAP_CLASS)) return;
  pending.add(node);
  if (flushTimer === undefined) {
    flushTimer = window.setTimeout(() => {
      flushTimer = undefined;
      const nodes = [...pending];
      pending.clear();
      for (const n of nodes) if (n.isConnected) scan(n);
      reportStats();
    }, 150);
  }
}

function rescanEverything(): void {
  hideTooltip();
  document.querySelectorAll(`.${WRAP_CLASS}`).forEach((w) => w.remove());
  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    evaluatedHref.delete(a);
    badges.delete(a);
  });
  scan(document);
  reportStats();
}

async function start(): Promise<void> {
  await loadSettings();
  scan(document);
  reportStats();

  new MutationObserver((records) => {
    for (const rec of records) {
      if (rec.type === "attributes") {
        if (rec.target instanceof HTMLAnchorElement) queue(rec.target);
        continue;
      }
      rec.addedNodes.forEach((n) => n.nodeType === Node.ELEMENT_NODE && queue(n as Element));
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["href"],
  });

  // Apply changes from the options page immediately, without reloading the mail tab.
  chrome.storage.onChanged.addListener(async () => {
    await loadSettings();
    rescanEverything();
  });
}

void start();

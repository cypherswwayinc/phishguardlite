// src/content.ts
import { scoreUrl } from './lib/scoring'
import { attachBadge, attachBadgeWithReport } from './lib/utils'

type Settings = {
  enabled?: boolean;
  minScore?: number;
  enableReporting?: boolean;
}

let settings: Settings = { enabled: true, minScore: 20, enableReporting: false };

chrome.storage.sync.get(["enabled", "minScore", "enableReporting"], (s) => {
  settings = { enabled: s.enabled ?? true, minScore: s.minScore ?? 20, enableReporting: s.enableReporting ?? false };
  scanAllLinks();
});

function evaluateLink(a: HTMLAnchorElement) {
  if (!settings.enabled) return;
  const href = a.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

  const text = a.textContent?.trim() || null;
  const result = scoreUrl(href, text);
  if (result.score >= (settings.minScore || 20)) {
    if (settings.enableReporting) {
      attachBadgeWithReport(a, result.label, result.reasons);
    } else {
      attachBadge(a, result.label, result.reasons);
    }
  }
}

function scanAllLinks(root: ParentNode = document) {
  const links = root.querySelectorAll("a[href]");
  links.forEach(a => evaluateLink(a as HTMLAnchorElement));
}

const mo = new MutationObserver((m) => {
  for (const rec of m) {
    rec.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        scanAllLinks(node as Element);
      }
    });
  }
});

mo.observe(document.documentElement, { subtree: true, childList: true });
scanAllLinks();
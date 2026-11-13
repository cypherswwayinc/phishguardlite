// src/lib/utils.ts
// DOM helpers for the in-page badge. Everything is built with createElement/textContent
// (never innerHTML) because the text can contain attacker-controlled data (hostnames, link text).

import type { LinkAnalysis } from "./scoring";

export const WRAP_CLASS = "pg-wrap";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildTooltip(analysis: LinkAnalysis): HTMLDivElement {
  const tip = el("div", "pg-tooltip");
  tip.setAttribute("role", "tooltip");

  tip.appendChild(el("strong", undefined, "Why flagged:"));
  const list = el("ul");
  for (const reason of analysis.reasons) list.appendChild(el("li", undefined, reason));
  tip.appendChild(list);

  const dest = el("div", "pg-dest");
  dest.appendChild(el("span", undefined, analysis.viaRedirect ? "Real destination: " : "Goes to: "));
  dest.appendChild(el("strong", undefined, analysis.host));
  tip.appendChild(dest);
  return tip;
}

// The tooltip lives in its own layer attached to the page root, not inside the email. Gmail and
// Outlook clip their message containers (overflow: hidden), which cut the tooltip off in short emails.
const FLOAT_CLASS = "pg-float";
const GAP = 6;
const EDGE = 8;
let floating: HTMLElement | null = null;
let floatingOwner: HTMLElement | null = null;

export function hideTooltip(owner?: HTMLElement): void {
  if (owner && owner !== floatingOwner) return;
  floating?.remove();
  floating = null;
  floatingOwner = null;
}

function showTooltip(wrap: HTMLElement, badge: HTMLElement, analysis: LinkAnalysis): void {
  if (floatingOwner === wrap) return;
  hideTooltip();
  const host = el("div", `${WRAP_CLASS} ${FLOAT_CLASS}`);
  host.dataset.open = "1";
  host.appendChild(buildTooltip(analysis));
  document.documentElement.appendChild(host);

  // Position with CSSOM (allowed under strict CSP, unlike style attributes).
  const anchor = badge.getBoundingClientRect();
  const size = host.getBoundingClientRect();
  let left = anchor.left;
  if (left + size.width > window.innerWidth - EDGE) left = window.innerWidth - EDGE - size.width;
  let top = anchor.bottom + GAP;
  const above = anchor.top - GAP - size.height;
  if (top + size.height > window.innerHeight - EDGE && above >= EDGE) top = above; // flip up near the bottom
  host.style.left = `${Math.max(EDGE, left)}px`;
  host.style.top = `${Math.max(EDGE, top)}px`;

  floating = host;
  floatingOwner = wrap;
}

// A fixed-position tooltip would drift away from its badge when anything scrolls: just close it.
window.addEventListener("scroll", () => hideTooltip(), { capture: true, passive: true });
window.addEventListener("resize", () => hideTooltip(), { passive: true });

/** Ask the background worker to submit a report (works on Gmail/Outlook, unlike page-level fetch). */
function sendReport(
  analysis: LinkAnalysis,
  anchor: HTMLAnchorElement,
  button: HTMLButtonElement,
): void {
  button.disabled = true;
  const reset = (label: string) => {
    button.textContent = label;
    setTimeout(() => {
      button.textContent = "Report";
      button.disabled = false;
    }, 2000);
  };
  try {
    chrome.runtime.sendMessage(
      {
        type: "pg_report_suspicious",
        url: analysis.target,
        linkText: (anchor.textContent || "").trim().slice(0, 300),
        // Origin only: Gmail/Outlook URLs contain mailbox and thread identifiers.
        pageUrl: location.origin,
        reasons: analysis.reasons,
        score: analysis.score,
        label: analysis.label,
      },
      (resp) => {
        if (chrome.runtime.lastError) return reset("Error");
        reset(resp?.ok ? "Reported ✓" : "Error");
      },
    );
  } catch {
    // Extension was updated/reloaded while this page stayed open ("context invalidated").
    reset("Reload page");
  }
}

/** Insert the badge (and optional Report button) right after the link. Returns the wrapper. */
export function attachBadge(
  anchor: HTMLAnchorElement,
  analysis: LinkAnalysis,
  withReport: boolean,
): HTMLElement {
  const wrap = el("span", WRAP_CLASS);

  const badge = el("span", "pg-badge", analysis.label);
  badge.dataset.level = analysis.label === "High Risk" ? "high" : "caution";
  badge.tabIndex = 0;
  badge.setAttribute("role", "note");
  badge.title = `${analysis.label}: ${analysis.reasons.join("; ")}`; // fallback if the tooltip is clipped
  wrap.appendChild(badge);

  if (withReport) {
    const btn = el("button", "pg-report-btn", "Report");
    btn.type = "button";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      sendReport(analysis, anchor, btn);
    });
    wrap.appendChild(btn);
  }

  const open = () => showTooltip(wrap, badge, analysis);
  const close = () => hideTooltip(wrap);
  wrap.addEventListener("mouseenter", open);
  wrap.addEventListener("mouseleave", close);
  wrap.addEventListener("focusin", open);
  wrap.addEventListener("focusout", close);

  anchor.insertAdjacentElement("afterend", wrap);
  return wrap;
}

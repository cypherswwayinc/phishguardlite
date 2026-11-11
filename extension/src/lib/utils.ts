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
  wrap.appendChild(buildTooltip(analysis));

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

  const open = () => (wrap.dataset.open = "1");
  const close = () => delete wrap.dataset.open;
  wrap.addEventListener("mouseenter", open);
  wrap.addEventListener("mouseleave", close);
  wrap.addEventListener("focusin", open);
  wrap.addEventListener("focusout", close);

  anchor.insertAdjacentElement("afterend", wrap);
  return wrap;
}

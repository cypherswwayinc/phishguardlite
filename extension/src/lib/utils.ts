// src/lib/utils.ts
export function createBadge(label: string): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = "pg-badge";
  el.textContent = label;
  return el;
}

export function createTooltip(reasons: string[]): HTMLDivElement {
  const tip = document.createElement("div");
  tip.className = "pg-tooltip";
  tip.innerHTML = `<strong>Why flagged:</strong><ul>${reasons.map(r => `<li>${r}</li>`).join("")}</ul>`;
  return tip;
}

export function attachBadge(anchor: HTMLAnchorElement, label: string, reasons: string[]) {
  if ((anchor as any).dataset.pgDone) return;
  (anchor as any).dataset.pgDone = "1";

  const badge = createBadge(label);
  badge.style.marginLeft = "6px";

  const tip = createTooltip(reasons);
  tip.style.display = "none";

  const wrap = document.createElement("span");
  wrap.className = "pg-wrap";
  wrap.style.position = "relative";
  wrap.appendChild(badge);
  wrap.appendChild(tip);

  badge.addEventListener("mouseenter", () => {
    tip.style.display = "block";
  });
  badge.addEventListener("mouseleave", () => {
    tip.style.display = "none";
  });

  anchor.insertAdjacentElement("afterend", wrap);
}

export function createReportButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Report";
  btn.className = "pg-report-btn";
  return btn;
}

export function attachBadgeWithReport(anchor: HTMLAnchorElement, label: string, reasons: string[]) {
  if ((anchor as any).dataset.pgDone) return;
  (anchor as any).dataset.pgDone = "1";

  const badge = createBadge(label);
  badge.style.marginLeft = "6px";

  const tip = createTooltip(reasons);
  tip.style.display = "none";

  const reportBtn = createReportButton();

  const wrap = document.createElement("span");
  wrap.className = "pg-wrap";
  wrap.style.position = "relative";
  wrap.appendChild(badge);
  wrap.appendChild(tip);
  wrap.appendChild(reportBtn);

  badge.addEventListener("mouseenter", () => { tip.style.display = "block"; });
  badge.addEventListener("mouseleave", () => { tip.style.display = "none"; });

  reportBtn.addEventListener("click", () => {
    const payload = {
      type: "pg_report_suspicious",
      url: anchor.href,
      linkText: anchor.textContent || "",
      pageUrl: location.href,
      reasons
    };
    chrome.runtime.sendMessage(payload, (resp) => {
      if (chrome.runtime.lastError) {
        console.warn("Report error:", chrome.runtime.lastError.message);
        return;
      }
      // Provide a tiny visual confirmation
      reportBtn.textContent = resp?.ok ? "Reported ✓" : "Error";
      setTimeout(() => (reportBtn.textContent = "Report"), 1500);
    });
  });

  anchor.insertAdjacentElement("afterend", wrap);
}

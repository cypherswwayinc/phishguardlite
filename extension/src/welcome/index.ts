// src/welcome/index.ts
// Shown once, right after install. It runs the same scoring and badge code as the mail pages,
// so what people see here is exactly what they will see in their inbox.

import { analyzeLink } from "../lib/scoring";
import { attachBadge } from "../lib/utils";

const MIN_SCORE = 20;

document.querySelectorAll<HTMLAnchorElement>("a[data-demo]").forEach((a) => {
  // Example links must never open: some of them imitate real sites.
  a.addEventListener("click", (e) => e.preventDefault());
  a.removeAttribute("target");

  const result = analyzeLink(a.href, a.textContent, location.href);
  if (result && result.score >= MIN_SCORE) {
    attachBadge(a, result, false);
  } else {
    a.closest("li")?.querySelector<HTMLElement>("[data-safe-note]")?.removeAttribute("hidden");
  }
});

document.getElementById("open-settings")?.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

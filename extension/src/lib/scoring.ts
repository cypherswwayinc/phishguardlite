// src/lib/scoring.ts
// Basic URL risk scoring used by the content script.

const BAD_TLDS = new Set([
  "zip","mov","gq","cf","tk","ml","ga","loan","click","country","uno","quest"
]);

const SHORTENER_HOSTS = new Set([
  "bit.ly","t.co","tinyurl.com","goo.gl","is.gd","ow.ly","buff.ly","cutt.ly","rebrand.ly"
]);

export type Score = {
  score: number;
  reasons: string[];
  label: "Safe" | "Caution" | "High Risk";
};

function getHostname(u: string): string | null {
  try { return new URL(u).hostname.toLowerCase(); } catch { return null; }
}

function getTld(host: string): string {
  const parts = host.split(".");
  return parts[parts.length - 1] || "";
}

function isPunycode(host: string): boolean {
  return /\bxn--/i.test(host);
}

function looksLikeEmailObfuscation(path: string): boolean {
  return /@/.test(path); // e.g., https://example.com/account@secure-login
}

function isUrlVeryLong(u: string): boolean {
  try {
    const url = new URL(u);
    return (url.pathname + url.search).length > 150;
  } catch { return false; }
}

function textDomainMismatch(u: string, linkText?: string | null): boolean {
  if (!linkText) return false;
  try {
    const linkHost = new URL(u).hostname.replace(/^www\./, "");
    const textMatch = linkText.match(/([a-z0-9-]+\.)+[a-z]{2,}/i);
    if (!textMatch) return false;
    const textHost = textMatch[0].toLowerCase().replace(/^www\./, "");
    return textHost && linkHost && textHost !== linkHost;
  } catch { return false; }
}

export function scoreUrl(u: string, linkText?: string | null): Score {
  const reasons: string[] = [];
  let score = 0;

  const host = getHostname(u);
  if (!host) {
    return { score: 0, reasons, label: "Safe" };
  }

  const tld = getTld(host);
  if (BAD_TLDS.has(tld)) {
    score += 40;
    reasons.push(`High-risk TLD: .${tld}`);
  }
  if (isPunycode(host)) {
    score += 25;
    reasons.push("Punycode/homoglyph in hostname");
  }
  if (SHORTENER_HOSTS.has(host)) {
    score += 20;
    reasons.push("URL shortener host");
  }
  if (isUrlVeryLong(u)) {
    score += 10;
    reasons.push("Very long URL path/query");
  }
  try {
    const url = new URL(u);
    if (looksLikeEmailObfuscation(url.pathname)) {
      score += 20;
      reasons.push("Contains '@' in the path");
    }
  } catch {}

  if (textDomainMismatch(u, linkText)) {
    score += 15;
    reasons.push("Link text domain mismatch");
  }

  const label = score >= 50 ? "High Risk" : score >= 20 ? "Caution" : "Safe";
  return { score, reasons, label };
}
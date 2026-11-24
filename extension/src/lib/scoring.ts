// src/lib/scoring.ts
// Local, offline URL risk scoring. No network calls: everything runs in the browser.

import { resolveLink } from "./links";

export type Label = "Safe" | "Caution" | "High Risk";

export type Score = {
  score: number;
  reasons: string[];
  label: Label;
};

export type LinkAnalysis = Score & {
  /** Hostname the link really goes to (after unwrapping redirect wrappers). */
  host: string;
  /** Full destination URL (after unwrapping redirect wrappers). */
  target: string;
  viaRedirect: boolean;
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

// Free / abused TLDs that are overwhelmingly used for throwaway infrastructure.
const BAD_TLDS = new Set([
  "zip", "mov", "gq", "cf", "tk", "ml", "ga", "loan", "click", "country", "uno", "quest",
]);

// Cheap TLDs with a high abuse rate but plenty of legitimate use: a smaller nudge.
const SUSPICIOUS_TLDS = new Set([
  "top", "xyz", "icu", "buzz", "cfd", "sbs", "cyou", "monster", "rest",
]);

const SHORTENER_HOSTS = new Set([
  "bit.ly", "t.co", "tinyurl.com", "goo.gl", "is.gd", "ow.ly", "buff.ly", "cutt.ly",
  "rebrand.ly", "t.ly", "rb.gy", "shorturl.at", "tiny.cc",
]);

// Brands that phishers impersonate most. Value = extra domains that are genuinely the brand's
// (a domain whose first label equals the brand, e.g. amazon.ca / paypal.com, is always legitimate).
const BRANDS: Record<string, string[]> = {
  paypal: ["paypal-community.com", "paypalobjects.com"],
  microsoft: ["microsoftonline.com", "microsoft365.com"],
  microsoftonline: ["microsoft.com", "live.com", "office.com", "microsoftonline-p.com"],
  office365: [],
  onedrive: ["live.com", "1drv.ms", "sharepoint.com"],
  google: ["google-analytics.com", "googlemail.com"],
  gmail: [],
  apple: ["icloud.com"],
  icloud: [],
  amazon: [],
  netflix: [],
  facebook: ["facebookmail.com", "fb.com", "fb.me"],
  instagram: [],
  linkedin: [],
  dropbox: ["dropboxmail.com"],
  docusign: [],
  adobe: [],
  zoom: [],
  whatsapp: [],
  fedex: [],
  dhl: [],
  ups: [],
  usps: [],
  purolator: [],
  chase: [],
  wellsfargo: [],
  bankofamerica: [],
  intuit: ["quickbooks.com"],
  quickbooks: ["intuit.com"],
  irs: [],
  // Canadian brands (the primary market)
  canadapost: ["canadapost-postescanada.ca", "postescanada-canadapost.ca"],
  cra: [],
  canadarevenue: [],
  canadarevenueagency: [],
  revenuecanada: [],
  servicecanada: [],
  rbc: ["rbcroyalbank.com", "royalbank.com", "rbcinsurance.com", "rbccm.com", "rbcgam.com"],
  royalbank: ["rbc.com", "rbcroyalbank.com", "rbcinsurance.com"],
  rbcroyalbank: ["rbc.com", "royalbank.com"],
  td: ["tdbank.com", "tdcanadatrust.com", "tdameritrade.com", "tdsecurities.com"],
  tdbank: ["td.com", "tdcanadatrust.com"],
  tdcanadatrust: ["td.com", "tdbank.com"],
  scotiabank: [],
  bmo: [],
  cibc: [],
  desjardins: [],
  tangerine: [],
  simplii: [],
  wealthsimple: [],
  questrade: [],
  telus: [],
  rogers: ["rogersbank.com"],
  interac: [],
};

// Too short to match as a loose word in a host name ("td" appears in many unrelated names).
// Only caught when glued to a lure word: td-secure-login.com, tdbanking.net.
const SHORT_BRANDS = new Set(["td"]);

// Names shown to the user in the "Why flagged" list.
const BRAND_NAMES: Record<string, string> = {
  paypal: "PayPal", microsoft: "Microsoft", microsoftonline: "Microsoft", office365: "Microsoft 365",
  onedrive: "OneDrive", google: "Google", gmail: "Gmail", apple: "Apple", icloud: "iCloud",
  amazon: "Amazon", netflix: "Netflix", facebook: "Facebook", instagram: "Instagram",
  linkedin: "LinkedIn", dropbox: "Dropbox", docusign: "DocuSign", adobe: "Adobe", zoom: "Zoom",
  whatsapp: "WhatsApp", fedex: "FedEx", dhl: "DHL", ups: "UPS", usps: "USPS", purolator: "Purolator",
  chase: "Chase", wellsfargo: "Wells Fargo", bankofamerica: "Bank of America", intuit: "Intuit",
  quickbooks: "QuickBooks", irs: "IRS", canadapost: "Canada Post", cra: "CRA",
  canadarevenue: "CRA", canadarevenueagency: "CRA", revenuecanada: "CRA",
  servicecanada: "Service Canada", rbc: "RBC", royalbank: "RBC", rbcroyalbank: "RBC", td: "TD",
  tdbank: "TD", tdcanadatrust: "TD", scotiabank: "Scotiabank", bmo: "BMO", cibc: "CIBC",
  desjardins: "Desjardins", tangerine: "Tangerine", simplii: "Simplii", wealthsimple: "Wealthsimple",
  questrade: "Questrade", telus: "Telus", rogers: "Rogers", interac: "Interac",
};
const brandName = (brand: string) => BRAND_NAMES[brand] ?? brand;

// Words attackers glue onto a brand name to make a domain look official: paypalsecure.com,
// rbc-banking.com, cra-arc-gc-refund.com. A name made only of a brand plus these words is flagged.
// (Kept short on purpose: "chasecenter.com" and "zoominfo.com" are real businesses.)
const LURE_WORDS = [
  "secure", "security", "login", "logon", "signin", "verify", "verification", "account", "accounts",
  "support", "service", "services", "help", "helpdesk", "alert", "alerts", "update", "updates",
  "online", "banking", "bank", "billing", "payment", "payments", "refund", "refunds", "claim",
  "delivery", "tracking", "portal", "auth", "confirm", "confirmation", "customer", "notice",
  "notification", "invoice", "wallet", "recovery", "unlock", "mail", "webmail", "canada", "ca", "arc", "gc",
];

// Governments own their domains: nobody else can register these, so never treat them as imitations.
const OFFICIAL_GOV = /(^|\.)(canada\.ca|gc\.ca|gov|mil|gov\.[a-z]{2}\.ca|gov\.[a-z]{2})$/;

// Sites where anyone can publish a page for free. Attackers host fake sign-in pages here.
const FREE_HOSTING = new Set([
  "pages.dev", "web.app", "firebaseapp.com", "netlify.app", "vercel.app", "github.io", "glitch.me",
  "herokuapp.com", "onrender.com", "workers.dev", "weebly.com", "wixsite.com", "blogspot.com",
  "000webhostapp.com", "webflow.io", "repl.co", "replit.app", "surge.sh", "r2.dev", "notion.site",
  "carrd.co", "godaddysites.com", "azurewebsites.net", "azurestaticapps.net", "framer.website",
]);

/** Pages on big, trusted domains that any user can create (forms, sites, file buckets). */
function userContentPlatform(url: URL): string | null {
  const h = url.hostname.toLowerCase();
  const p = url.pathname.toLowerCase();
  if (h === "sites.google.com") return "Google Sites";
  if (h === "storage.googleapis.com" || h === "storage.cloud.google.com") return "Google Cloud Storage";
  if ((h === "docs.google.com" && p.startsWith("/forms/")) || h === "forms.gle") return "Google Forms";
  if (h === "forms.office.com" || h === "forms.microsoft.com") return "Microsoft Forms";
  return null;
}

// Wording that asks for credentials. Harmless on its own, suspicious on a page anyone can publish.
const CREDENTIAL_WORDING =
  /\b(sign[\s_-]?in|log[\s_-]?in|logon|verify|verification|password|passcode|confirm( your)? account|account (suspended|locked|limited)|unlock|re-?activate|update (your )?(payment|billing|account|password))\b/i;

// A real domain used as a "subdomain" of someone else's site: outlook.com.evil.net
const EMBEDDED_OFFICIAL = [
  "outlook.com", "office.com", "live.com", "office365.com", "microsoft.com", "google.com", "gmail.com",
  "apple.com", "icloud.com", "paypal.com", "amazon.com", "amazon.ca", "canada.ca", "linkedin.com",
  "facebook.com", "dropbox.com", "docusign.net", "zoom.us", "adobe.com",
];
// Legitimate services that wrap a Microsoft address in their own domain (Defender for Cloud Apps).
const TRUSTED_PROXIES = new Set(["mcas.ms"]);

// Not file-type TLDs: a link text such as "report.pdf" is not a web address.
const FILE_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "png", "jpg", "jpeg", "gif", "svg",
  "txt", "csv", "html", "htm", "js", "exe", "msi", "dmg", "rar", "7z", "xml", "json",
  "mp3", "mp4", "py", "rtf", "ics",
]);

// Second-level labels that act like a public suffix under a 2-letter country TLD (co.uk, com.au, ...)
const GENERIC_SLDS = new Set(["co", "com", "org", "net", "gov", "edu", "ac", "or", "ne", "go"]);
// Canadian provinces/territories are public suffixes under .ca (gov.bc.ca, example.on.ca, ...)
const CA_PROVINCES = new Set(["ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yk"]);

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

export function isIpHost(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[");
}

/**
 * Approximate registrable domain ("eTLD+1") without shipping the full Public Suffix List.
 * Handles the common multi-part suffixes (co.uk, com.au, gov.bc.ca). Good enough for scoring.
 */
export function registrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (isIpHost(h)) return h;
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  if (tld.length === 2 && (GENERIC_SLDS.has(sld) || (tld === "ca" && CA_PROVINCES.has(sld)))) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

/** First label of the registrable domain: "amazon" for www.amazon.co.uk. */
function registrableLabel(host: string): string {
  return registrableDomain(host).split(".")[0];
}

function tldOf(host: string): string {
  const parts = host.split(".");
  return parts[parts.length - 1] || "";
}

function editDistance(a: string, b: string): number {
  const prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = a[i - 1] === b[j - 1] ? diag : 1 + Math.min(diag, prev[j], prev[j - 1]);
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Collapse look-alike characters so "paypa1", "paypai" and "paypal" compare equal.
function canon(s: string): string {
  return s
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/[1i|!]/g, "l")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s");
}

type BrandFinding = { reason: string; inSubdomain: boolean } | null;

/** True when `flat` is made only of `brand` (at least once) and lure words: "paypalsecure", "rbcbanking". */
function isBrandWithLureWords(flat: string, brand: string): boolean {
  const words = [brand, ...LURE_WORDS];
  const memo = new Map<string, boolean>();
  const walk = (i: number, usedBrand: boolean): boolean => {
    if (i === flat.length) return usedBrand;
    const key = `${i}|${usedBrand}`;
    const seen = memo.get(key);
    if (seen !== undefined) return seen;
    let ok = false;
    for (const w of words) {
      if (flat.startsWith(w, i) && walk(i + w.length, usedBrand || w === brand)) {
        ok = true;
        break;
      }
    }
    memo.set(key, ok);
    return ok;
  };
  return walk(0, false);
}

/**
 * Detects hosts that imitate a well-known brand:
 *  - brand name used as a word in the host but the registrable domain isn't the brand's
 *    (paypal.com.account-verify.net, login-microsoft.com, secure-rbc-signin.tk)
 *  - brand glued to lure words (paypalsecure.com, rbcbanking.com, tdcanadatrust-secure.com)
 *  - look-alike spellings of the brand (paypa1.com, secure-paypa1.tk, arnazon.com, gogle.com)
 *  - a real domain placed in front of the attacker's own (login.microsoftonline.com.evil.net)
 * `inSubdomain` is true when the brand sits in the part of the host the attacker controls
 * but the user reads as "the site" (paypal.com.evil.net): the strongest phishing tell.
 */
function brandFinding(host: string): BrandFinding {
  if (isIpHost(host) || OFFICIAL_GOV.test(host)) return null;
  // Brand-owned top-level domains (.microsoft, .google, .amazon, ...) can only be registered by
  // the brand itself, so outlook.cloud.microsoft is Microsoft's. (.td is Chad's country domain.)
  const topLevel = tldOf(host);
  if (topLevel in BRANDS && !SHORT_BRANDS.has(topLevel)) return null;
  const reg = registrableDomain(host);
  const label = registrableLabel(host);
  const labelFlat = label.replace(/-/g, "");
  const tokens = host.split(/[.\-_]/);
  const hostLabels = host.split(".");
  const subdomainTokens = hostLabels
    .slice(0, hostLabels.length - reg.split(".").length)
    .join(".")
    .split(/[.\-_]/);

  // On a free hosting site the part the attacker chose is the label in front of it
  // (login-microsoft.pages.dev), not the platform's own name.
  const regLabels = reg.split(".").length;
  const siteFlat =
    FREE_HOSTING.has(reg) && hostLabels.length > regLabels
      ? hostLabels[hostLabels.length - regLabels - 1].replace(/-/g, "")
      : labelFlat;

  for (const [brand, legit] of Object.entries(BRANDS)) {
    if (label === brand || legit.includes(reg)) continue; // the real thing (any country TLD)
    const name = brandName(brand);

    if (!SHORT_BRANDS.has(brand) && tokens.includes(brand)) {
      return {
        reason: `Imitates ${name} (${host} is not an official ${name} domain)`,
        inSubdomain: subdomainTokens.includes(brand),
      };
    }
    // Another brand's own name (rbcroyalbank, microsoftonline) is never a lure-word combination.
    if (!(siteFlat in BRANDS) && isBrandWithLureWords(siteFlat, brand)) {
      return { reason: `Imitates ${name} (${host} is not an official ${name} domain)`, inSubdomain: false };
    }
    if (brand.length >= 5) {
      const canonBrand = canon(brand);
      if (tokens.some((t) => t !== brand && canon(t) === canonBrand)) {
        return { reason: `Look-alike of ${name}: ${reg}`, inSubdomain: false };
      }
      if (
        brand.length >= 6 &&
        Math.abs(labelFlat.length - brand.length) <= 1 &&
        editDistance(labelFlat, brand) === 1
      ) {
        return { reason: `Look-alike of ${name}: ${reg}`, inSubdomain: false };
      }
    }
  }

  if (!TRUSTED_PROXIES.has(reg)) {
    const front = `.${host.slice(0, host.length - reg.length)}`; // ".login.outlook.com."
    for (const official of EMBEDDED_OFFICIAL) {
      if (reg !== official && front.includes(`.${official}.`)) {
        return { reason: `Contains "${official}" but the real site is ${reg}`, inSubdomain: true };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Link text vs destination
// ---------------------------------------------------------------------------

function domainsInText(text: string): string[] {
  const found: string[] = [];
  const re = /(?:[a-z0-9-]+\.)+[a-z]{2,}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const before = text[m.index - 1];
    const after = text[m.index + m[0].length];
    if (before === "@" || after === "@") continue; // part of an email address
    const d = m[0].toLowerCase().replace(/^www\./, "");
    if (FILE_EXTENSIONS.has(tldOf(d))) continue; // "invoice.pdf" is a file, not a site
    found.push(d);
  }
  return found;
}

/** Returns 0 (no mismatch), 15 (generic mismatch) or 25 (text names a well-known brand's site). */
function textMismatchWeight(host: string, linkText?: string | null): number {
  if (!linkText) return 0;
  const targetReg = registrableDomain(host);
  for (const d of domainsInText(linkText.slice(0, 300))) {
    if (registrableDomain(d) !== targetReg) {
      return registrableLabel(d) in BRANDS ? 25 : 15;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function labelFor(score: number): Label {
  return score >= 50 ? "High Risk" : score >= 20 ? "Caution" : "Safe";
}

function scoreParsed(url: URL, linkText?: string | null): Score {
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  const host = url.hostname.toLowerCase();
  const tld = tldOf(host);

  if (BAD_TLDS.has(tld)) add(40, `High-risk TLD: .${tld}`);
  else if (SUSPICIOUS_TLDS.has(tld)) add(15, `Frequently abused TLD: .${tld}`);

  if (/(^|\.)xn--/i.test(host)) add(25, "Punycode/homoglyph in hostname");
  if (SHORTENER_HOSTS.has(host)) add(20, "URL shortener host");
  if (url.username || url.password) add(40, "Username/password in the link (often used to disguise the real site)");
  if (isIpHost(host)) add(30, "Link points to a raw IP address");
  if (url.protocol === "http:") add(10, "Not using HTTPS");
  if (url.port) add(10, `Unusual port :${url.port}`);
  if ((url.pathname + url.search).length > 150) add(10, "Very long URL path/query");
  if (url.pathname.includes("@")) add(20, "Contains '@' in the path");

  if (!isIpHost(host)) {
    const extraLabels = host.split(".").length - registrableDomain(host).split(".").length;
    if (extraLabels >= 3) add(10, "Unusually many subdomains");
  }

  const brand = brandFinding(host);
  if (brand) add(brand.inSubdomain ? 50 : 35, brand.reason);

  // Pages anyone can publish (free hosting, forms, sites). A nudge on its own; with sign-in
  // wording it becomes a Caution, because that is how fake login pages are served.
  const reg = registrableDomain(host);
  const platform = userContentPlatform(url) ?? (FREE_HOSTING.has(reg) ? reg : null);
  if (platform) {
    add(10, `Page on ${platform}, where anyone can publish a page`);
    let path = url.pathname;
    try {
      path = decodeURIComponent(path);
    } catch {
      /* keep raw path */
    }
    const front = host.slice(0, host.length - reg.length);
    if (CREDENTIAL_WORDING.test(`${linkText ?? ""} ${path} ${front}`)) {
      add(15, "Sign-in wording on a page anyone can publish");
    }
  }

  const mismatch = textMismatchWeight(host, linkText);
  if (mismatch) add(mismatch, "Link text domain mismatch");

  return { score, reasons, label: labelFor(score) };
}

/** Score a URL string (no redirect unwrapping). Kept for simple callers and tests. */
export function scoreUrl(u: string, linkText?: string | null): Score {
  const resolved = resolveLink(u);
  if (!resolved) return { score: 0, reasons: [], label: "Safe" };
  return scoreParsed(new URL(u), linkText);
}

/**
 * Analyse an <a href>: resolves relative URLs, unwraps known redirect wrappers
 * (Google, Microsoft Safe Links, LinkedIn, Facebook) and scores the real destination.
 * Returns null for non-web links (mailto:, tel:, #anchors, javascript:).
 */
export function analyzeLink(href: string, linkText?: string | null, base?: string): LinkAnalysis | null {
  const resolved = resolveLink(href, base);
  if (!resolved) return null;
  const result = scoreParsed(resolved.url, linkText);
  return {
    ...result,
    host: resolved.url.hostname.toLowerCase(),
    target: resolved.url.toString(),
    viaRedirect: resolved.viaRedirect,
  };
}

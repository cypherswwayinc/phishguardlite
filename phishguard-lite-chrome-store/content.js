"use strict";
(() => {
  // src/lib/links.ts
  var MAX_UNWRAP_DEPTH = 3;
  function paramTarget(u, ...names) {
    for (const name of names) {
      const raw = u.searchParams.get(name);
      if (!raw) continue;
      try {
        const target = new URL(raw);
        if (target.protocol === "http:" || target.protocol === "https:") return target;
      } catch {
      }
    }
    return null;
  }
  function extractTarget(u) {
    const host = u.hostname.toLowerCase();
    const path = u.pathname;
    if (/^(www\.)?google\.[a-z.]{2,}$/.test(host) && path === "/url") {
      return paramTarget(u, "q", "url");
    }
    if (host === "safelinks.protection.outlook.com" || host.endsWith(".safelinks.protection.outlook.com")) {
      return paramTarget(u, "url");
    }
    if ((host === "www.linkedin.com" || host === "linkedin.com") && /^\/safety\/go\/?$/.test(path)) {
      return paramTarget(u, "url");
    }
    if (host === "l.facebook.com" && path === "/l.php") {
      return paramTarget(u, "u");
    }
    return null;
  }
  function resolveLink(href, base) {
    let url;
    try {
      url = base ? new URL(href, base) : new URL(href);
    } catch {
      return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    let viaRedirect = false;
    for (let i = 0; i < MAX_UNWRAP_DEPTH; i++) {
      const next = extractTarget(url);
      if (!next) break;
      url = next;
      viaRedirect = true;
    }
    return { url, viaRedirect };
  }

  // src/lib/scoring.ts
  var BAD_TLDS = /* @__PURE__ */ new Set([
    "zip",
    "mov",
    "gq",
    "cf",
    "tk",
    "ml",
    "ga",
    "loan",
    "click",
    "country",
    "uno",
    "quest"
  ]);
  var SUSPICIOUS_TLDS = /* @__PURE__ */ new Set([
    "top",
    "xyz",
    "icu",
    "buzz",
    "cfd",
    "sbs",
    "cyou",
    "monster",
    "rest"
  ]);
  var SHORTENER_HOSTS = /* @__PURE__ */ new Set([
    "bit.ly",
    "t.co",
    "tinyurl.com",
    "goo.gl",
    "is.gd",
    "ow.ly",
    "buff.ly",
    "cutt.ly",
    "rebrand.ly",
    "t.ly",
    "rb.gy",
    "shorturl.at",
    "tiny.cc"
  ]);
  var BRANDS = {
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
    interac: []
  };
  var SHORT_BRANDS = /* @__PURE__ */ new Set(["td"]);
  var BRAND_NAMES = {
    paypal: "PayPal",
    microsoft: "Microsoft",
    microsoftonline: "Microsoft",
    office365: "Microsoft 365",
    onedrive: "OneDrive",
    google: "Google",
    gmail: "Gmail",
    apple: "Apple",
    icloud: "iCloud",
    amazon: "Amazon",
    netflix: "Netflix",
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    dropbox: "Dropbox",
    docusign: "DocuSign",
    adobe: "Adobe",
    zoom: "Zoom",
    whatsapp: "WhatsApp",
    fedex: "FedEx",
    dhl: "DHL",
    ups: "UPS",
    usps: "USPS",
    purolator: "Purolator",
    chase: "Chase",
    wellsfargo: "Wells Fargo",
    bankofamerica: "Bank of America",
    intuit: "Intuit",
    quickbooks: "QuickBooks",
    irs: "IRS",
    canadapost: "Canada Post",
    cra: "CRA",
    canadarevenue: "CRA",
    canadarevenueagency: "CRA",
    revenuecanada: "CRA",
    servicecanada: "Service Canada",
    rbc: "RBC",
    royalbank: "RBC",
    rbcroyalbank: "RBC",
    td: "TD",
    tdbank: "TD",
    tdcanadatrust: "TD",
    scotiabank: "Scotiabank",
    bmo: "BMO",
    cibc: "CIBC",
    desjardins: "Desjardins",
    tangerine: "Tangerine",
    simplii: "Simplii",
    wealthsimple: "Wealthsimple",
    questrade: "Questrade",
    telus: "Telus",
    rogers: "Rogers",
    interac: "Interac"
  };
  var brandName = (brand) => BRAND_NAMES[brand] ?? brand;
  var LURE_WORDS = [
    "secure",
    "security",
    "login",
    "logon",
    "signin",
    "verify",
    "verification",
    "account",
    "accounts",
    "support",
    "service",
    "services",
    "help",
    "helpdesk",
    "alert",
    "alerts",
    "update",
    "updates",
    "online",
    "banking",
    "bank",
    "billing",
    "payment",
    "payments",
    "refund",
    "refunds",
    "claim",
    "delivery",
    "tracking",
    "portal",
    "auth",
    "confirm",
    "confirmation",
    "customer",
    "notice",
    "notification",
    "invoice",
    "wallet",
    "recovery",
    "unlock",
    "mail",
    "webmail",
    "canada",
    "ca",
    "arc",
    "gc"
  ];
  var OFFICIAL_GOV = /(^|\.)(canada\.ca|gc\.ca|gov|mil|gov\.[a-z]{2}\.ca|gov\.[a-z]{2})$/;
  var FREE_HOSTING = /* @__PURE__ */ new Set([
    "pages.dev",
    "web.app",
    "firebaseapp.com",
    "netlify.app",
    "vercel.app",
    "github.io",
    "glitch.me",
    "herokuapp.com",
    "onrender.com",
    "workers.dev",
    "weebly.com",
    "wixsite.com",
    "blogspot.com",
    "000webhostapp.com",
    "webflow.io",
    "repl.co",
    "replit.app",
    "surge.sh",
    "r2.dev",
    "notion.site",
    "carrd.co",
    "godaddysites.com",
    "azurewebsites.net",
    "azurestaticapps.net",
    "framer.website"
  ]);
  function userContentPlatform(url) {
    const h = url.hostname.toLowerCase();
    const p = url.pathname.toLowerCase();
    if (h === "sites.google.com") return "Google Sites";
    if (h === "storage.googleapis.com" || h === "storage.cloud.google.com") return "Google Cloud Storage";
    if (h === "docs.google.com" && p.startsWith("/forms/") || h === "forms.gle") return "Google Forms";
    if (h === "forms.office.com" || h === "forms.microsoft.com") return "Microsoft Forms";
    return null;
  }
  var CREDENTIAL_WORDING = /\b(sign[\s_-]?in|log[\s_-]?in|logon|verify|verification|password|passcode|confirm( your)? account|account (suspended|locked|limited)|unlock|re-?activate|update (your )?(payment|billing|account|password))\b/i;
  var EMBEDDED_OFFICIAL = [
    "outlook.com",
    "office.com",
    "live.com",
    "office365.com",
    "microsoft.com",
    "google.com",
    "gmail.com",
    "apple.com",
    "icloud.com",
    "paypal.com",
    "amazon.com",
    "amazon.ca",
    "canada.ca",
    "linkedin.com",
    "facebook.com",
    "dropbox.com",
    "docusign.net",
    "zoom.us",
    "adobe.com"
  ];
  var TRUSTED_PROXIES = /* @__PURE__ */ new Set(["mcas.ms"]);
  var FILE_EXTENSIONS = /* @__PURE__ */ new Set([
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "svg",
    "txt",
    "csv",
    "html",
    "htm",
    "js",
    "exe",
    "msi",
    "dmg",
    "rar",
    "7z",
    "xml",
    "json",
    "mp3",
    "mp4",
    "py",
    "rtf",
    "ics"
  ]);
  var GENERIC_SLDS = /* @__PURE__ */ new Set(["co", "com", "org", "net", "gov", "edu", "ac", "or", "ne", "go"]);
  var CA_PROVINCES = /* @__PURE__ */ new Set(["ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yk"]);
  function isIpHost(host) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[");
  }
  function registrableDomain(host) {
    const h = host.toLowerCase().replace(/\.$/, "");
    if (isIpHost(h)) return h;
    const parts = h.split(".");
    if (parts.length <= 2) return h;
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    if (tld.length === 2 && (GENERIC_SLDS.has(sld) || tld === "ca" && CA_PROVINCES.has(sld))) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  }
  function registrableLabel(host) {
    return registrableDomain(host).split(".")[0];
  }
  function tldOf(host) {
    const parts = host.split(".");
    return parts[parts.length - 1] || "";
  }
  function editDistance(a, b) {
    const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
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
  function canon(s) {
    return s.replace(/rn/g, "m").replace(/vv/g, "w").replace(/[1i|!]/g, "l").replace(/0/g, "o").replace(/[5$]/g, "s");
  }
  function isBrandWithLureWords(flat, brand) {
    const words = [brand, ...LURE_WORDS];
    const memo = /* @__PURE__ */ new Map();
    const walk = (i, usedBrand) => {
      if (i === flat.length) return usedBrand;
      const key = `${i}|${usedBrand}`;
      const seen = memo.get(key);
      if (seen !== void 0) return seen;
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
  function brandFinding(host) {
    if (isIpHost(host) || OFFICIAL_GOV.test(host)) return null;
    const topLevel = tldOf(host);
    if (topLevel in BRANDS && !SHORT_BRANDS.has(topLevel)) return null;
    const reg = registrableDomain(host);
    const label = registrableLabel(host);
    const labelFlat = label.replace(/-/g, "");
    const tokens = host.split(/[.\-_]/);
    const hostLabels = host.split(".");
    const subdomainTokens = hostLabels.slice(0, hostLabels.length - reg.split(".").length).join(".").split(/[.\-_]/);
    const regLabels = reg.split(".").length;
    const siteFlat = FREE_HOSTING.has(reg) && hostLabels.length > regLabels ? hostLabels[hostLabels.length - regLabels - 1].replace(/-/g, "") : labelFlat;
    for (const [brand, legit] of Object.entries(BRANDS)) {
      if (label === brand || legit.includes(reg)) continue;
      const name = brandName(brand);
      if (!SHORT_BRANDS.has(brand) && tokens.includes(brand)) {
        return {
          reason: `Imitates ${name} (${host} is not an official ${name} domain)`,
          inSubdomain: subdomainTokens.includes(brand)
        };
      }
      if (!(siteFlat in BRANDS) && isBrandWithLureWords(siteFlat, brand)) {
        return { reason: `Imitates ${name} (${host} is not an official ${name} domain)`, inSubdomain: false };
      }
      if (brand.length >= 5) {
        const canonBrand = canon(brand);
        if (tokens.some((t) => t !== brand && canon(t) === canonBrand)) {
          return { reason: `Look-alike of ${name}: ${reg}`, inSubdomain: false };
        }
        if (brand.length >= 6 && Math.abs(labelFlat.length - brand.length) <= 1 && editDistance(labelFlat, brand) === 1) {
          return { reason: `Look-alike of ${name}: ${reg}`, inSubdomain: false };
        }
      }
    }
    if (!TRUSTED_PROXIES.has(reg)) {
      const front = `.${host.slice(0, host.length - reg.length)}`;
      for (const official of EMBEDDED_OFFICIAL) {
        if (reg !== official && front.includes(`.${official}.`)) {
          return { reason: `Contains "${official}" but the real site is ${reg}`, inSubdomain: true };
        }
      }
    }
    return null;
  }
  function domainsInText(text) {
    const found = [];
    const re = /(?:[a-z0-9-]+\.)+[a-z]{2,}/gi;
    let m;
    while (m = re.exec(text)) {
      const before = text[m.index - 1];
      const after = text[m.index + m[0].length];
      if (before === "@" || after === "@") continue;
      const d = m[0].toLowerCase().replace(/^www\./, "");
      if (FILE_EXTENSIONS.has(tldOf(d))) continue;
      found.push(d);
    }
    return found;
  }
  function textMismatchWeight(host, linkText) {
    if (!linkText) return 0;
    const targetReg = registrableDomain(host);
    for (const d of domainsInText(linkText.slice(0, 300))) {
      if (registrableDomain(d) !== targetReg) {
        return registrableLabel(d) in BRANDS ? 25 : 15;
      }
    }
    return 0;
  }
  function labelFor(score) {
    return score >= 50 ? "High Risk" : score >= 20 ? "Caution" : "Safe";
  }
  function scoreParsed(url, linkText) {
    const reasons = [];
    let score = 0;
    const add = (points, reason) => {
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
    const reg = registrableDomain(host);
    const platform = userContentPlatform(url) ?? (FREE_HOSTING.has(reg) ? reg : null);
    if (platform) {
      add(10, `Page on ${platform}, where anyone can publish a page`);
      let path = url.pathname;
      try {
        path = decodeURIComponent(path);
      } catch {
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
  function analyzeLink(href, linkText, base) {
    const resolved = resolveLink(href, base);
    if (!resolved) return null;
    const result = scoreParsed(resolved.url, linkText);
    return {
      ...result,
      host: resolved.url.hostname.toLowerCase(),
      target: resolved.url.toString(),
      viaRedirect: resolved.viaRedirect
    };
  }

  // src/lib/utils.ts
  var WRAP_CLASS = "pg-wrap";
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function buildTooltip(analysis) {
    const tip = el("div", "pg-tooltip");
    tip.setAttribute("role", "tooltip");
    tip.appendChild(el("strong", void 0, "Why flagged:"));
    const list = el("ul");
    for (const reason of analysis.reasons) list.appendChild(el("li", void 0, reason));
    tip.appendChild(list);
    const dest = el("div", "pg-dest");
    dest.appendChild(el("span", void 0, analysis.viaRedirect ? "Real destination: " : "Goes to: "));
    dest.appendChild(el("strong", void 0, analysis.host));
    tip.appendChild(dest);
    return tip;
  }
  var FLOAT_CLASS = "pg-float";
  var GAP = 6;
  var EDGE = 8;
  var floating = null;
  var floatingOwner = null;
  function hideTooltip(owner) {
    if (owner && owner !== floatingOwner) return;
    floating?.remove();
    floating = null;
    floatingOwner = null;
  }
  function showTooltip(wrap, badge, analysis) {
    if (floatingOwner === wrap) return;
    hideTooltip();
    const host = el("div", `${WRAP_CLASS} ${FLOAT_CLASS}`);
    host.dataset.open = "1";
    host.appendChild(buildTooltip(analysis));
    document.documentElement.appendChild(host);
    const anchor = badge.getBoundingClientRect();
    const size = host.getBoundingClientRect();
    let left = anchor.left;
    if (left + size.width > window.innerWidth - EDGE) left = window.innerWidth - EDGE - size.width;
    let top = anchor.bottom + GAP;
    const above = anchor.top - GAP - size.height;
    if (top + size.height > window.innerHeight - EDGE && above >= EDGE) top = above;
    host.style.left = `${Math.max(EDGE, left)}px`;
    host.style.top = `${Math.max(EDGE, top)}px`;
    floating = host;
    floatingOwner = wrap;
  }
  window.addEventListener("scroll", () => hideTooltip(), { capture: true, passive: true });
  window.addEventListener("resize", () => hideTooltip(), { passive: true });
  function sendReport(analysis, anchor, button) {
    button.disabled = true;
    const reset = (label) => {
      button.textContent = label;
      setTimeout(() => {
        button.textContent = "Report";
        button.disabled = false;
      }, 2e3);
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
          label: analysis.label
        },
        (resp) => {
          if (chrome.runtime.lastError) return reset("Error");
          reset(resp?.ok ? "Reported \u2713" : "Error");
        }
      );
    } catch {
      reset("Reload page");
    }
  }
  function attachBadge(anchor, analysis, withReport) {
    const wrap = el("span", WRAP_CLASS);
    const badge = el("span", "pg-badge", analysis.label);
    badge.dataset.level = analysis.label === "High Risk" ? "high" : "caution";
    badge.tabIndex = 0;
    badge.setAttribute("role", "note");
    badge.title = `${analysis.label}: ${analysis.reasons.join("; ")}`;
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

  // src/content.ts
  var SETTING_KEYS = ["enabled", "minScore", "enableReporting"];
  var settings = { enabled: true, minScore: 20, enableReporting: true };
  var evaluatedHref = /* @__PURE__ */ new WeakMap();
  var badges = /* @__PURE__ */ new WeakMap();
  function clampScore(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 20;
  }
  async function loadSettings() {
    let stored = {};
    try {
      stored = await chrome.storage.sync.get(SETTING_KEYS);
    } catch {
    }
    if (Object.keys(stored).length === 0) {
      try {
        stored = await chrome.storage.local.get(SETTING_KEYS);
      } catch {
      }
    }
    settings = {
      enabled: stored.enabled !== false,
      minScore: clampScore(stored.minScore ?? 20),
      enableReporting: stored.enableReporting !== false
    };
  }
  var statsTimer;
  function reportStats() {
    if (statsTimer !== void 0) return;
    statsTimer = window.setTimeout(() => {
      statsTimer = void 0;
      const high = document.querySelectorAll('.pg-badge[data-level="high"]').length;
      const caution = document.querySelectorAll('.pg-badge[data-level="caution"]').length;
      try {
        void chrome.runtime.sendMessage({ type: "pg_page_stats", active: settings.enabled, high, caution }).catch(() => {
        });
      } catch {
      }
    }, 300);
  }
  function removeBadge(a) {
    hideTooltip(badges.get(a));
    badges.get(a)?.remove();
    badges.delete(a);
  }
  function evaluate(a) {
    if (!settings.enabled) return;
    if (a.closest(`.${WRAP_CLASS}`)) return;
    if (a.isContentEditable) return;
    const raw = a.getAttribute("href");
    if (!raw || raw.startsWith("#")) return;
    const current = a.href;
    if (evaluatedHref.get(a) === current) return;
    evaluatedHref.set(a, current);
    removeBadge(a);
    const result = analyzeLink(current, a.textContent, location.href);
    if (!result || result.score < settings.minScore) return;
    badges.set(a, attachBadge(a, result, settings.enableReporting));
  }
  function scan(root) {
    if (root instanceof HTMLAnchorElement) evaluate(root);
    root.querySelectorAll?.("a[href]").forEach((a) => evaluate(a));
  }
  var pending = /* @__PURE__ */ new Set();
  var flushTimer;
  function queue(node) {
    if (node.classList?.contains(WRAP_CLASS)) return;
    pending.add(node);
    if (flushTimer === void 0) {
      flushTimer = window.setTimeout(() => {
        flushTimer = void 0;
        const nodes = [...pending];
        pending.clear();
        for (const n of nodes) if (n.isConnected) scan(n);
        reportStats();
      }, 150);
    }
  }
  function rescanEverything() {
    hideTooltip();
    document.querySelectorAll(`.${WRAP_CLASS}`).forEach((w) => w.remove());
    document.querySelectorAll("a[href]").forEach((a) => {
      evaluatedHref.delete(a);
      badges.delete(a);
    });
    scan(document);
    reportStats();
  }
  async function start() {
    await loadSettings();
    scan(document);
    reportStats();
    new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type === "attributes") {
          if (rec.target instanceof HTMLAnchorElement) queue(rec.target);
          continue;
        }
        rec.addedNodes.forEach((n) => n.nodeType === Node.ELEMENT_NODE && queue(n));
      }
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["href"]
    });
    chrome.storage.onChanged.addListener(async () => {
      await loadSettings();
      rescanEverything();
    });
  }
  void start();
})();

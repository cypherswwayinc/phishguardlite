// src/lib/scoring.ts
// Basic URL risk scoring used by the content script.

const BAD_TLDS = new Set([
  "zip","mov","gq","cf","tk","ml","ga","loan","click","country","uno","quest"
]);

const SHORTENER_HOSTS = new Set([
  "bit.ly","t.co","tinyurl.com","goo.gl","is.gd","ow.ly","buff.ly","cutt.ly","rebrand.ly"
]);

// High-trust domains that are commonly targeted by lookalike attacks
const HIGH_TRUST_DOMAINS = new Set([
  "google.com", "gmail.com", "youtube.com", "facebook.com", "amazon.com", "netflix.com",
  "microsoft.com", "apple.com", "paypal.com", "ebay.com", "walmart.com", "target.com",
  "bankofamerica.com", "chase.com", "wellsfargo.com", "citibank.com", "usbank.com",
  "github.com", "stackoverflow.com", "reddit.com", "twitter.com", "instagram.com",
  "linkedin.com", "dropbox.com", "spotify.com", "discord.com", "slack.com", "zoom.us"
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
    return Boolean(textHost && linkHost && textHost !== linkHost);
  } catch { return false; }
}

// Character shape mapping for lookalike detection
const CHARACTER_SHAPES: { [key: string]: string[] } = {
  'm': ['rn', 'nn'],
  'rn': ['m'],
  'nn': ['m'],
  'l': ['I', '1', '|'],
  'I': ['l', '1', '|'],
  '1': ['l', 'I', '|'],
  '|': ['l', 'I', '1'],
  'o': ['0'],
  '0': ['o'],
  's': ['5'],
  '5': ['s'],
  'z': ['2'],
  '2': ['z'],
  'g': ['9'],
  '9': ['g'],
  'b': ['6'],
  '6': ['b'],
  'a': ['@'],
  '@': ['a']
};

// Normalize domain by applying character shape transformations
function normalizeDomain(domain: string): string[] {
  const normalized = [domain];
  
  // Apply character shape transformations
  for (let i = 0; i < domain.length; i++) {
    const char = domain[i];
    if (CHARACTER_SHAPES[char]) {
      for (const replacement of CHARACTER_SHAPES[char]) {
        const newDomain = domain.slice(0, i) + replacement + domain.slice(i + 1);
        normalized.push(newDomain);
      }
    }
  }
  
  return normalized;
}

// Calculate Levenshtein edit distance between two strings
function editDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Check if domain is a lookalike of a high-trust domain
function isLookalikeDomain(host: string): { isLookalike: boolean; reason: string | null } {
  const domain = host.replace(/^www\./, "");
  
  // Check exact matches first
  if (HIGH_TRUST_DOMAINS.has(domain)) {
    return { isLookalike: false, reason: null };
  }
  
  // Check for lookalikes with edit distance ≤ 1
  for (const trustedDomain of HIGH_TRUST_DOMAINS) {
    const distance = editDistance(domain, trustedDomain);
    if (distance <= 1) {
      return { 
        isLookalike: true, 
        reason: `Lookalike domain: ${domain} vs ${trustedDomain} (edit distance: ${distance})` 
      };
    }
  }
  
  // Check character shape variations
  const normalizedVariations = normalizeDomain(domain);
  for (const variation of normalizedVariations) {
    for (const trustedDomain of HIGH_TRUST_DOMAINS) {
      const distance = editDistance(variation, trustedDomain);
      if (distance <= 1) {
        return { 
          isLookalike: true, 
          reason: `Lookalike domain: ${domain} vs ${trustedDomain} (character shape variation)` 
        };
      }
    }
  }
  
  return { isLookalike: false, reason: null };
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

  // Check for lookalike domains
  const lookalikeCheck = isLookalikeDomain(host);
  if (lookalikeCheck.isLookalike) {
    score += 35;
    reasons.push(lookalikeCheck.reason!);
  }

  const label = score >= 50 ? "High Risk" : score >= 20 ? "Caution" : "Safe";
  return { score, reasons, label };
}
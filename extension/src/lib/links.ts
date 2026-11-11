// src/lib/links.ts
// Resolve a link's real destination. Email clients and security gateways often
// wrap the original URL in a redirect (Google, Microsoft Defender Safe Links,
// LinkedIn, Facebook). Scoring the wrapper host (e.g. google.com) would always
// look "safe", so we unwrap it and score where the link actually goes.

const MAX_UNWRAP_DEPTH = 3;

function paramTarget(u: URL, ...names: string[]): URL | null {
  for (const name of names) {
    const raw = u.searchParams.get(name); // already percent-decoded
    if (!raw) continue;
    try {
      const target = new URL(raw);
      if (target.protocol === "http:" || target.protocol === "https:") return target;
    } catch {
      /* not an absolute URL, ignore */
    }
  }
  return null;
}

function extractTarget(u: URL): URL | null {
  const host = u.hostname.toLowerCase();
  const path = u.pathname;

  // https://www.google.com/url?q=<target>   (also google.ca, google.co.uk, ...)
  if (/^(www\.)?google\.[a-z.]{2,}$/.test(host) && path === "/url") {
    return paramTarget(u, "q", "url");
  }
  // Microsoft Defender Safe Links: https://nam02.safelinks.protection.outlook.com/?url=<target>
  if (host === "safelinks.protection.outlook.com" || host.endsWith(".safelinks.protection.outlook.com")) {
    return paramTarget(u, "url");
  }
  // LinkedIn external link warning: https://www.linkedin.com/safety/go?url=<target>
  if ((host === "www.linkedin.com" || host === "linkedin.com") && /^\/safety\/go\/?$/.test(path)) {
    return paramTarget(u, "url");
  }
  // Facebook link shim: https://l.facebook.com/l.php?u=<target>
  if (host === "l.facebook.com" && path === "/l.php") {
    return paramTarget(u, "u");
  }
  return null;
}

export type ResolvedLink = {
  /** Where the link actually goes (after unwrapping known redirectors). */
  url: URL;
  /** True if at least one redirect wrapper was removed. */
  viaRedirect: boolean;
};

/**
 * Parse an href (absolute or relative) and unwrap known redirect wrappers.
 * Returns null for anything that is not an http(s) link (mailto:, tel:, javascript:, #anchor...).
 */
export function resolveLink(href: string, base?: string): ResolvedLink | null {
  let url: URL;
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

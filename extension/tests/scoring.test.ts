import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeLink, scoreUrl, registrableDomain } from "../src/lib/scoring";
import { resolveLink } from "../src/lib/links";

const label = (u: string, text?: string) => scoreUrl(u, text).label;

test("registrableDomain handles common multi-part suffixes", () => {
  assert.equal(registrableDomain("www.amazon.co.uk"), "amazon.co.uk");
  assert.equal(registrableDomain("gov.bc.ca"), "gov.bc.ca");
  assert.equal(registrableDomain("mail.google.com"), "google.com");
  assert.equal(registrableDomain("a.b.example.com.au"), "example.com.au");
  assert.equal(registrableDomain("192.168.4.5"), "192.168.4.5");
});

// --- Must NOT be flagged (false-positive guards, incl. Canadian domains) ---
const SAFE = [
  "https://google.com", "https://www.google.ca/", "https://www.google.com.au/",
  "https://mail.google.com/mail/u/0/#inbox", "https://accounts.google.com/signin",
  "https://amazon.com", "https://www.amazon.ca/deals", "https://smile.amazon.co.uk/",
  "https://login.microsoftonline.com/common/oauth2", "https://outlook.office.com/mail",
  "https://www.microsoft.com/en-ca", "https://onedrive.live.com/?id=1", "https://contoso.sharepoint.com/sites/x",
  "https://paypal.me/someone", "https://www.paypal.com.au/", "https://support.apple.com/en-ca",
  "https://us02web.zoom.us/j/123456789", "https://www.rbc.com", "https://www.rbcroyalbank.com/personal.html",
  "https://www.canadapost-postescanada.ca/track", "https://www.canada.ca/en.html", "https://www2.gov.bc.ca/gov/content",
  "https://github.com/cypherswwayinc/phishguardlite", "https://stackoverflow.com/questions/1",
  "https://www.applebees.com", "https://example.org", "https://www.cyphersway.com/",
  // Outlook on the web (all addresses it uses) and Microsoft's own domains
  "https://outlook.cloud.microsoft/mail/", "https://login.cloud.microsoft/", "https://outlook.live.com/mail/",
  "https://outlook.office365.com/owa/", "https://login.microsoftonline-p.com/", "https://microsoftonline.us/",
  "https://outlook.office.com.mcas.ms/mail",
  // Real companies whose names contain a brand or a lure word
  "https://www.td.com/ca/en/personal-banking", "https://www.tdbank.com/", "https://www.royalbank.com/",
  "https://apps.cra-arc.gc.ca/ebci/", "https://www.irs.gov/refunds", "https://quickbooks.intuit.com/",
  "https://www.facebookmail.com/", "https://www.rogersbank.com/", "https://www.zoominfo.com/",
  "https://www.chasecenter.com/", "https://www.ups.com/track",
  // Pages anyone can publish are only a nudge on their own
  "https://forms.office.com/r/abc123", "https://docs.google.com/forms/d/e/abc/viewform",
  "https://sites.google.com/view/our-team", "https://myapp.vercel.app/", "https://cyphersway.github.io/docs",
];
for (const u of SAFE) test(`safe: ${u}`, () => assert.equal(label(u), "Safe", JSON.stringify(scoreUrl(u))));

// --- Link text must not cause false alarms on files / emails ---
test("file names in link text are not treated as domains", () => {
  assert.equal(label("https://files.example.com/a1b2", "Download invoice.pdf"), "Safe");
});
test("email addresses in link text are not treated as domains", () => {
  assert.equal(label("https://calendar.example.org/x", "Contact john.smith@example.com"), "Safe");
});
test("link text naming the same site (www / subdomain variants) is fine", () => {
  assert.equal(label("https://www.example.com/page", "example.com/page"), "Safe");
  assert.equal(label("https://login.example.com/", "www.example.com"), "Safe");
});

// --- Must be flagged ---
const caution: [string, string?][] = [
  ["https://g\u043e\u043egle.com/login"], // Cyrillic o's: homoglyph of google.com
  ["https://bit.ly/abc123"], ["https://tinyurl.com/test"], ["https://login.gq"], ["https://account.ga"],
  ["http://192.168.4.5/login"], ["https://example.com/login@secure-bank"],
  ["https://paypal-secure-login.com/"], ["https://arnazon.com/login"], ["https://g00gle.com/"], ["https://gogle.com/"],
  // A brand glued to words like secure / banking / refund
  ["https://paypalsecure.com/login"], ["https://rbcbanking.com/"], ["https://amazonsecure.net/"],
  ["https://microsoftonline-verify.com/"], ["https://tdcanadatrust-secure.com/"], ["https://td-secure-login.com/"],
  ["https://royalbank-secure.com/"], ["https://rbc-royalbank-signin.com/"], ["https://cra-arc-gc-refund.com/"],
  ["https://canada-revenue-refund.com/"], ["https://purolator-delivery.info/pay"], ["https://quickbooks-invoice.com/"],
  // Pages anyone can publish, with sign-in wording
  ["https://secure-docs.pages.dev/login"], ["https://sites.google.com/view/secure-docs-login"],
  ["https://storage.googleapis.com/bucket/login.html"],
  ["https://forms.office.com/r/abc123", "Verify your mailbox password"],
  ["https://docs.google.com/forms/d/e/abc/viewform", "Confirm account"],
];
for (const [u, t] of caution) test(`flagged (>= Caution): ${u}`, () => {
  assert.notEqual(label(u, t), "Safe", JSON.stringify(scoreUrl(u, t)));
});

const high: [string, string?][] = [
  ["https://paypal.com@evil-site.top/login", "paypal.com sign in"],
  ["https://paypal.com.account-verify.net/signin"],
  ["https://secure-paypa1.tk/login", "Verify your account at paypal.com"],
  ["https://rbc-secure-login.tk/"],
  // A real domain placed in front of the attacker's own, or a brand on free hosting
  ["https://login.microsoftonline.com.evil.net/"], ["https://outlook.com.account-check.net/"],
  ["https://login-microsoftonline.pages.dev/"], ["https://office365-login.web.app/"],
];
for (const [u, t] of high) test(`High Risk: ${u}`, () => {
  assert.equal(label(u, t), "High Risk", JSON.stringify(scoreUrl(u, t)));
});

test("text/destination mismatch alone is a nudge, brand text is stronger", () => {
  assert.equal(scoreUrl("https://example.com/x", "visit other.com").score, 15);
  assert.equal(scoreUrl("https://example.com/x", "paypal.com").score, 25);
});

// --- Redirect unwrapping ---
test("Google redirect is unwrapped and the destination is scored", () => {
  const a = analyzeLink("https://www.google.com/url?q=https%3A%2F%2Fsecure-paypa1.tk%2Flogin&sa=D", "Verify at paypal.com");
  assert.ok(a);
  assert.equal(a!.host, "secure-paypa1.tk");
  assert.equal(a!.viaRedirect, true);
  assert.equal(a!.label, "High Risk");
});
test("Google redirect to a good site stays Safe", () => {
  const a = analyzeLink("https://www.google.com/url?q=https%3A%2F%2Fwww.cyphersway.com%2F&sa=D", "Our website");
  assert.equal(a!.host, "www.cyphersway.com");
  assert.equal(a!.label, "Safe");
});
test("Microsoft Safe Links and nested wrappers are unwrapped", () => {
  const inner = "https://login.gq/x";
  const safelink = "https://nam02.safelinks.protection.outlook.com/?url=" + encodeURIComponent(inner) + "&data=abc";
  const outer = "https://www.google.com/url?q=" + encodeURIComponent(safelink);
  const a = analyzeLink(outer);
  assert.equal(a!.host, "login.gq");
  assert.equal(a!.label, "Caution");
});
test("LinkedIn external link warning page is unwrapped", () => {
  const a = analyzeLink("https://www.linkedin.com/safety/go?url=" + encodeURIComponent("https://bit.ly/abc"));
  assert.equal(a!.host, "bit.ly");
});
test("redirect param that is not an http(s) URL is ignored", () => {
  const a = analyzeLink("https://www.google.com/url?q=javascript:alert(1)");
  assert.equal(a!.host, "www.google.com");
  assert.equal(a!.viaRedirect, false);
});
test("invalid punycode cannot be navigated to and is ignored", () => {
  assert.equal(analyzeLink("https://xn--google-45g.com"), null);
});
test("non-web and malformed links return null", () => {
  for (const h of ["mailto:a@b.com", "tel:+1604", "javascript:void(0)", "data:text/html,hi", "http://", ""]) {
    assert.equal(analyzeLink(h), null, h);
  }
});
test("relative links resolve against the page", () => {
  const r = resolveLink("/mail/u/0/", "https://mail.google.com/mail/u/0/#inbox");
  assert.equal(r!.url.hostname, "mail.google.com");
});

test("pages anyone can publish stay Safe without sign-in wording", () => {
  assert.equal(label("https://forms.office.com/r/abc123", "Quick survey"), "Safe");
  assert.equal(label("https://sites.google.com/view/our-team", "Our team page"), "Safe");
});
test("brand-owned top-level domains (.microsoft) are never imitations", () => {
  const a = analyzeLink("https://outlook.cloud.microsoft/mail/");
  assert.equal(a!.score, 0);
});
test("friendly brand names appear in the reasons", () => {
  assert.match(scoreUrl("https://cra-arc-gc-refund.com/").reasons[0], /^Imitates CRA /);
  assert.match(scoreUrl("https://paypa1.com/").reasons[0], /^Look-alike of PayPal/);
});

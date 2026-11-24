# Changelog

## 0.4.0

### Added
- **Outlook on the web on every address.** The extension now also runs on `outlook.live.com` (personal
  Outlook.com / Hotmail), `outlook.cloud.microsoft` (Microsoft's new address) and `outlook.office365.com`,
  not only `outlook.office.com`.
- **Welcome page on first install** (`welcome.html`). Shows real warning badges on example links (they
  never open), where the extension works, and how to pin the toolbar icon. Not shown again on updates.
- **Toolbar icon status.** On Gmail, Outlook and LinkedIn the icon shows a green tick when nothing is flagged
  on the page, a number when links are flagged (red if any is High Risk) and "off" when detection is
  turned off. The counts never leave the browser.

### Improved detection
- A brand glued to words like secure, login, banking or refund is now flagged: `paypalsecure.com`,
  `rbcbanking.com`, `amazonsecure.net`, `microsoftonline-verify.com`, `tdcanadatrust-secure.com`.
- A real Microsoft/Google/etc. domain placed in front of the attacker's own is now High Risk:
  `login.microsoftonline.com.evil.net`, `outlook.com.account-check.net`.
- More Canadian and common targets: TD, Royal Bank, CRA / Canada Revenue, Service Canada, Desjardins,
  Tangerine, Simplii, Wealthsimple, Questrade, Purolator, UPS, IRS, QuickBooks / Intuit, WhatsApp.
- Pages anyone can publish are a small nudge, and a Caution when the link or page uses sign-in wording:
  free hosting (pages.dev, web.app, github.io, ...), Google Sites / Forms / Cloud Storage, Microsoft Forms.
  A brand name on free hosting (`login-microsoftonline.pages.dev`) is flagged as an imitation.
- Reasons now use proper brand names ("Imitates RBC", "Look-alike of PayPal").

### Fixed
- Microsoft's own `*.cloud.microsoft` addresses (for example `outlook.cloud.microsoft`) were flagged as
  imitations of Microsoft. Brand-owned top-level domains and government domains (`canada.ca`, `*.gc.ca`,
  `*.gov`) are no longer treated as imitations.

### Tests
- `extension`: 102 unit tests (was 55); 24 real-browser checks (was 9), including each Outlook address,
  the toolbar icon states and the welcome page.

## 0.3.1
- Fix: the "Why flagged" tooltip was cut off in short emails because Gmail and Outlook clip the message area. It now floats above the page, stays inside the window and flips upward near the bottom edge.

## 0.3.0

### Fixed
- **Extension did not run on Gmail, Outlook or LinkedIn at all.** The Vite build split shared code into a
  separate chunk, so `content.js` started with an ES `import`, which Chrome rejects for manifest content
  scripts. Each entry point is now bundled into one self-contained script (esbuild, `extension/build.mjs`).
- Badges had no styling on the mail sites (the CSS only existed in the options page). Styles now ship via
  the manifest (`content.css`), so they work under Gmail's CSP.
- "Report" and cloud features never appeared on Gmail/Outlook/LinkedIn. Reporting now goes through the
  background service worker.
- Links added as the mutation itself (not nested inside it) were never scanned; `href` changes were ignored.
- Badge tooltip used `innerHTML` with strings derived from page content; now built with DOM APIs.
- Badges could be inserted into the email being composed. Editable areas are now skipped.
- Settings keys mismatched between options page (`apiBase`) and content script (`apiUrl`).
- Backend: report list was cached per Lambda instance and rewritten as one file, silently losing reports
  when several instances were warm. Reports are now one object each. A failed save is no longer reported
  as success.
- Backend: `/admin/api/*` was unauthenticated. It now requires `Authorization: Bearer <ADMIN_TOKEN>` and is
  disabled (503) until `ADMIN_TOKEN` (16+ chars) is configured.
- Admin dashboard rendered report data with `innerHTML` (stored XSS: anyone can submit a report). All data
  is escaped; it also read fields the API never returned (score/reasons), so those columns were empty.
- Public `/` and `/health` no longer expose the S3 bucket name. CORS no longer combines `*` with credentials.

### Improved
- Scoring: unwraps Google, Microsoft Safe Links, LinkedIn and Facebook redirect wrappers; detects
  `user@host` tricks, raw IPs, brand impersonation (`paypal.com.evil.net`, `secure-paypa1.tk`), more
  shorteners and abused TLDs; no more false alarms on `amazon.ca`-style country domains, file names or
  email addresses in link text.
- Settings changes apply to open mail tabs immediately.
- Reports send only the site origin (not the full Gmail/Outlook URL) plus score/label.
- Removed unused permissions (`activeTab`, `scripting`); toolbar icon opens Settings.
- API throttling in both SAM templates.

### Tests
- `extension`: `npm test` (55 unit tests), `node tests/e2e/run.cjs dist` (9 real-browser checks).
- `backend`: `python -m pytest backend/tests` (22 tests).

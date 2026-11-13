# Changelog

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

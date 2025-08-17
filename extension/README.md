# PhishGuard Lite — Extension

Manifest V3 extension that labels risky links in Gmail, Outlook Web, and LinkedIn using local heuristics.

## Quick start

1. Install Node.js (v18+) and PNPM or NPM.
2. Install dependencies:
   ```bash
   pnpm install
   # or: npm install
   ```
3. Start dev:
   ```bash
   pnpm dev
   # or: npm run dev
   ```
4. Load the unpacked extension in Chrome:
   - Go to `chrome://extensions`
   - Toggle **Developer mode**
   - Click **Load unpacked** and select the `dist` folder that Vite creates after `pnpm dev` (for dev) or `pnpm build` (for prod).
   - Alternatively for dev: select the project root and Chrome will pick the `dist` folder once built.

## Build
```bash
pnpm build
```

The build artifacts will be in `dist/`. You can zip and upload to the Chrome Web Store.

## How it works
- `src/content.ts` scans for `<a href>` links, scores their URLs, and decorates them with badges.
- `src/lib/scoring.ts` contains simple, explainable heuristics.
- `src/options/` provides a basic settings page stored via `chrome.storage.sync`.
- `src/background.ts` is a placeholder for future features.

## Privacy
- All analysis is local by default. No URLs are sent anywhere unless you add a backend and explicitly wire a "Report Suspicious" action.
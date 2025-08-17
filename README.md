# PhishGuard Lite — Starter Repo

This repo contains:
- `/extension` — Chrome/Edge/Firefox (MV3) extension built with Vite + @crxjs/vite-plugin + TypeScript.
- `/backend` — Optional FastAPI service with `/score` and `/report` endpoints.

## Prereqs
- Node.js 18+ for the extension
- Python 3.11+ for the backend (optional)

## Get started — Extension
```bash
cd extension
npm install   # or: pnpm install
npm run dev   # or: pnpm dev
```
Then load the unpacked build into Chrome:
- Visit `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked** → select the `dist` folder created by Vite

## Get started — Backend (optional)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8080
```

## Next steps
- Tune `src/lib/scoring.ts` weights.
- Add a "Report Suspicious" button and POST to `/backend/report`.
- (Optional) Wire `/score` to do cloud enrichment when enabled in Options.

## Privacy
Local by default. No outbound network calls unless you add them.
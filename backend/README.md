# PhishGuard Lite — Backend (Optional)

Minimal FastAPI stub that provides:
- `POST /score` to score a URL (mirrors extension heuristics)
- `POST /report` to store a suspicious report as JSON (local folder or later S3)

## Quick start (local)
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8080
```

- Test health: `GET http://127.0.0.1:8080/health`
- Score: `POST http://127.0.0.1:8080/score` with JSON: `{"url": "https://example.com", "linkText": "Example"}`
- Report: `POST http://127.0.0.1:8080/report` with JSON: `{"url": "...", "context": {...}, "tenantKey": "abc"}`

## Deploying to AWS Lambda (future)
- Use AWS API Gateway + Lambda (via Mangum) for a serverless deployment.
- Add IAM permissions if you write reports to S3.
- See `scripts/deploy-lambda.md` for a high-level outline.
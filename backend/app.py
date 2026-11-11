"""PhishGuard Lite backend (FastAPI on AWS Lambda via Mangum).

Public endpoints:   GET /, GET /health, POST /report, POST /score (legacy)
Protected endpoints: /admin/api/*  (require `Authorization: Bearer <ADMIN_TOKEN>`)
"""

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl

from security import DISABLED, OK, check_admin
from storage import ReportStore

try:
    import boto3
except ImportError:  # local development without AWS libraries
    boto3 = None

log = logging.getLogger("phishguard")
logging.getLogger().setLevel(logging.INFO)

app = FastAPI(title="PhishGuard Lite Backend", version="1.1.0")

# --- Configuration -----------------------------------------------------------------------
# The two SAM templates in this repo name the bucket variable differently; accept both.
S3_BUCKET = os.environ.get("S3_BUCKET") or os.environ.get("REPORTS_BUCKET") or "phishguard-reports"
S3_REGION = os.environ.get("AWS_REGION", "us-east-1")
LOCAL_DIR = Path(os.environ.get("REPORTS_DIR", "/tmp/phishguard-reports"))

MAX_URL_LEN = 2048
MAX_TENANT_LEN = 128
MAX_CONTEXT_BYTES = 4096

try:
    _s3 = boto3.client("s3", region_name=S3_REGION) if boto3 else None
except Exception as exc:  # noqa: BLE001
    log.warning("S3 client initialisation failed: %s", exc)
    _s3 = None

store = ReportStore(s3_client=_s3, bucket=S3_BUCKET, local_dir=LOCAL_DIR)

# --- Models --------------------------------------------------------------------------------
BAD_TLDS = {"zip", "mov", "gq", "cf", "tk", "ml", "ga", "loan", "click", "country", "uno", "quest"}
SHORTENERS = {"bit.ly", "t.co", "tinyurl.com", "goo.gl", "is.gd", "ow.ly", "buff.ly", "cutt.ly", "rebrand.ly"}


class ScoreRequest(BaseModel):
    url: HttpUrl
    linkText: Optional[str] = None


class ScoreResponse(BaseModel):
    score: int
    reasons: List[str]
    label: str


class ReportRequest(BaseModel):
    url: HttpUrl
    context: dict = {}
    tenantKey: Optional[str] = None
    score: Optional[int] = None
    label: Optional[str] = None


class ReportResponse(BaseModel):
    ok: bool
    message: str
    reportId: Optional[str] = None


# --- Auth ----------------------------------------------------------------------------------
def require_admin(authorization: Optional[str] = Header(default=None)) -> None:
    """FastAPI dependency: reject admin requests without the correct bearer token."""
    result = check_admin(authorization, os.environ.get("ADMIN_TOKEN", ""))
    if result == DISABLED:
        raise HTTPException(status_code=503, detail="Admin API is disabled: ADMIN_TOKEN is not configured")
    if result != OK:
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Bearer"})


# --- Legacy server-side scoring ------------------------------------------------------------
# NOTE: the extension scores links locally (see extension/src/lib/scoring.ts) and does not call
# /score. This endpoint is kept for backwards compatibility and uses a smaller rule set.
def score_url(u: str, link_text: Optional[str]) -> ScoreResponse:
    reasons: List[str] = []
    score = 0
    parsed = urlparse(u)
    host = (parsed.hostname or "").lower()
    tld = host.rsplit(".", 1)[-1] if host else ""

    if tld in BAD_TLDS:
        score += 40
        reasons.append("High-risk TLD: .%s" % tld)
    if "xn--" in host:
        score += 25
        reasons.append("Punycode/homoglyph in hostname")
    if host in SHORTENERS:
        score += 20
        reasons.append("URL shortener host")
    if len((parsed.path or "") + (parsed.query or "")) > 150:
        score += 10
        reasons.append("Very long URL path/query")
    if "@" in (parsed.path or "") or parsed.username or parsed.password:
        score += 20
        reasons.append("Contains '@' or credentials in the URL")
    if link_text and host:
        m = re.search(r"([a-z0-9-]+\.)+[a-z]{2,}", link_text[:300], re.I)
        if m and m.group(0).lower().removeprefix("www.") != host.removeprefix("www."):
            score += 15
            reasons.append("Link text domain mismatch")

    label = "High Risk" if score >= 50 else ("Caution" if score >= 20 else "Safe")
    return ScoreResponse(score=score, reasons=reasons, label=label)


# --- Public endpoints ----------------------------------------------------------------------
@app.get("/")
def root():
    return {"message": "PhishGuard Lite Backend API", "version": app.version, "status": "running"}


@app.get("/health")
def health():
    return {"ok": True, "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}


@app.post("/score", response_model=ScoreResponse)
def score_endpoint(req: ScoreRequest):
    url = str(req.url)
    if len(url) > MAX_URL_LEN:
        raise HTTPException(status_code=422, detail="URL too long")
    return score_url(url, req.linkText)


def _clean_str_list(value, max_items: int = 10, max_len: int = 200) -> List[str]:
    if not isinstance(value, list):
        return []
    return [str(v)[:max_len] for v in value[:max_items] if isinstance(v, (str, int, float))]


@app.post("/report", response_model=ReportResponse)
def report_endpoint(req: ReportRequest):
    url = str(req.url)
    if len(url) > MAX_URL_LEN:
        raise HTTPException(status_code=422, detail="URL too long")
    if req.tenantKey and len(req.tenantKey) > MAX_TENANT_LEN:
        raise HTTPException(status_code=422, detail="tenantKey too long")
    if len(json.dumps(req.context, default=str)) > MAX_CONTEXT_BYTES:
        raise HTTPException(status_code=413, detail="Report context too large")

    now = datetime.now(timezone.utc)
    report_id = str(uuid.uuid4())
    ctx = req.context if isinstance(req.context, dict) else {}
    report = {
        "id": report_id,
        "url": url,
        "tenantKey": req.tenantKey,
        "score": req.score if req.score is not None and 0 <= req.score <= 1000 else None,
        "label": (req.label or "")[:20] or None,
        "reasons": _clean_str_list(ctx.get("reasons")),
        "context": ctx,
        "reportedAt": now.isoformat().replace("+00:00", "Z"),
        "status": "new",
    }
    try:
        store.add(report, when=now)
    except Exception:  # noqa: BLE001
        log.exception("Failed to store report %s", report_id)
        # Never tell the user a report was saved when it wasn't.
        raise HTTPException(status_code=503, detail="Could not store the report right now")

    log.info("Report stored: %s", report_id)
    return ReportResponse(ok=True, message="Report received. Report ID: %s" % report_id, reportId=report_id)


# --- Admin ---------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # the extension and the dashboard call from other origins
    allow_credentials=False,  # no cookies are used; the admin API relies on the bearer token
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/admin-dashboard.html")
async def admin_dashboard():
    """Static HTML only: it contains no data and needs the admin token to load any."""
    path = Path(__file__).parent / "admin-dashboard.html"
    if path.exists():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="Admin dashboard not found")


@app.get("/admin/")
async def admin_react():
    path = Path(__file__).parent / "admin" / "index.html"
    if path.exists():
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="Admin interface not found")


_admin_static = Path(__file__).parent / "admin"
if _admin_static.exists():
    app.mount("/admin/static", StaticFiles(directory=str(_admin_static)), name="admin_static")


@app.get("/admin/api/reports", dependencies=[Depends(require_admin)])
def admin_list_reports(limit: int = 200):
    items = store.list_recent(limit)
    return {"items": items, "total": len(items), "storage": store.kind}


@app.get("/admin/api/reports/summary", dependencies=[Depends(require_admin)])
def admin_reports_summary():
    summary = store.summary()
    summary["lastUpdated"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return summary


@app.get("/admin/api/report/{report_id}", dependencies=[Depends(require_admin)])
def admin_get_report(report_id: str):
    report = store.get(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


# --- AWS Lambda entry point ----------------------------------------------------------------
try:
    from mangum import Mangum

    _adapter = Mangum(app)
except ImportError:  # not running on Lambda
    _adapter = None


def lambda_handler(event, context):
    if _adapter is None:
        raise RuntimeError("mangum is not installed")
    return _adapter(event, context)

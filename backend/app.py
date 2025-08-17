from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime
import json
from pathlib import Path
import re

app = FastAPI(title="PhishGuard Lite Backend", version="0.1.0")

# Remove local file system operations for Lambda compatibility
# REPORTS_DIR = Path(__file__).parent / "reports"
# REPORTS_DIR.mkdir(exist_ok=True)

BAD_TLDS = {"zip","mov","gq","cf","tk","ml","ga","loan","click","country","uno","quest"}
SHORTENERS = {"bit.ly","t.co","tinyurl.com","goo.gl","is.gd","ow.ly","buff.ly","cutt.ly","rebrand.ly"}

class ScoreRequest(BaseModel):
    url: HttpUrl
    linkText: Optional[str] = None

class ScoreResponse(BaseModel):
    score: int
    reasons: List[str]
    label: str

class ReportRequest(BaseModel):
    url: HttpUrl
    context: dict
    tenantKey: Optional[str] = None

def get_hostname(u: str) -> str:
    # Basic extraction
    return re.sub(r'^https?://', '', u).split('/')[0].lower()

def get_tld(host: str) -> str:
    parts = host.split('.')
    return parts[-1] if parts else ""

def is_punycode(host: str) -> bool:
    return 'xn--' in host

def is_url_very_long(u: str) -> bool:
    try:
        from urllib.parse import urlparse
        parsed = urlparse(u)
        return len((parsed.path or "") + (parsed.query or "")) > 150
    except Exception:
        return False

def text_domain_mismatch(u: str, link_text: Optional[str]) -> bool:
    if not link_text:
        return False
    try:
        from urllib.parse import urlparse
        link_host = (urlparse(u).hostname or "").lower().removeprefix("www.")
        m = re.search(r'([a-z0-9-]+\.)+[a-z]{2,}', link_text, re.I)
        if not m:
            return False
        text_host = m.group(0).lower().removeprefix("www.")
        return text_host and link_host and text_host != link_host
    except Exception:
        return False

def score_url(u: str, link_text: Optional[str]) -> ScoreResponse:
    reasons: List[str] = []
    score = 0

    host = get_hostname(u)
    tld = get_tld(host)
    if tld in BAD_TLDS:
        score += 40
        reasons.append(f"High-risk TLD: .{tld}")
    if is_punycode(host):
        score += 25
        reasons.append("Punycode/homoglyph in hostname")
    if host in SHORTENERS:
        score += 20
        reasons.append("URL shortener host")
    if is_url_very_long(u):
        score += 10
        reasons.append("Very long URL path/query")
    if '@' in u:
        score += 20
        reasons.append("Contains '@' in the path")
    if text_domain_mismatch(u, link_text):
        score += 15
        reasons.append("Link text domain mismatch")

    label = "High Risk" if score >= 50 else ("Caution" if score >= 20 else "Safe")
    return ScoreResponse(score=score, reasons=reasons, label=label)

@app.get("/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat() + "Z"}

@app.post("/score", response_model=ScoreResponse)
def score_endpoint(req: ScoreRequest):
    try:
        return score_url(str(req.url), req.linkText)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/report")
def report_endpoint(req: ReportRequest):
    # In production, store to S3. For now, just return success.
    # TODO: Implement S3 storage
    return {"ok": True, "message": "Report received (S3 storage not yet implemented)"}

# --- Admin Dashboard APIs & Static ---
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
import datetime as _dt

# CORS (allow same-origin dashboard usage)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Remove local file system dependencies for Lambda
# ADMIN_DIST = Path(__file__).parent / "admin" / "dist"
# REPORTS_DIR = Path(__file__).parent / "reports"

def _safe_child(base: Path, name: str) -> Path:
    p = (base / name).resolve()
    if not str(p).startswith(str(base.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")
    return p

@app.get("/admin/api/reports")
def admin_list_reports(limit: int = 200):
    # TODO: Implement S3 listing
    return {"items": [], "message": "S3 integration not yet implemented"}

@app.get("/admin/api/report/{name}")
def admin_get_report(name: str):
    # TODO: Implement S3 retrieval
    raise HTTPException(status_code=501, detail="S3 integration not yet implemented")

@app.get("/admin/api/digests")
def admin_list_digests(limit: int = 200):
    # TODO: Implement S3 listing
    return {"items": [], "message": "S3 integration not yet implemented"}

@app.get("/admin/api/digest/{name}")
def admin_get_digest(name: str):
    # TODO: Implement S3 retrieval
    raise HTTPException(status_code=501, detail="S3 integration not yet implemented")

# Remove static file mounting for Lambda compatibility
# if ADMIN_DIST.exists():
#     app.mount("/admin", StaticFiles(directory=str(ADMIN_DIST), html=True), name="admin")

# Lambda handler for AWS SAM deployment
def lambda_handler(event, context):
    """AWS Lambda handler for the FastAPI application"""
    from mangum import Mangum
    
    # Create Mangum adapter for FastAPI
    adapter = Mangum(app)
    
    # Handle the Lambda event
    response = adapter(event, context)
    
    return response

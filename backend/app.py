from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from datetime import datetime
import json
from pathlib import Path
import re
import uuid

app = FastAPI(title="PhishGuard Lite Backend", version="0.1.0")

# In-memory storage for reports (in production, this would be S3/DynamoDB)
REPORTS_STORAGE = []
REPORTS_FILE = Path(__file__).parent / "reports" / "reports.json"

# Ensure reports directory exists
REPORTS_FILE.parent.mkdir(exist_ok=True)

def load_reports():
    """Load reports from JSON file"""
    global REPORTS_STORAGE
    try:
        if REPORTS_FILE.exists():
            with open(REPORTS_FILE, 'r') as f:
                REPORTS_STORAGE = json.load(f)
    except Exception as e:
        print(f"Error loading reports: {e}")
        REPORTS_STORAGE = []

def save_reports():
    """Save reports to JSON file"""
    try:
        with open(REPORTS_FILE, 'w') as f:
            json.dump(REPORTS_STORAGE, f, indent=2)
    except Exception as e:
        print(f"Error saving reports: {e}")

# Load existing reports on startup
load_reports()

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

class ReportResponse(BaseModel):
    ok: bool
    message: str
    reportId: Optional[str] = None

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

@app.get("/")
def root():
    return {
        "message": "PhishGuard Lite Backend API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "score": "/score",
            "report": "/report",
            "admin": "/admin/api/*"
        },
        "status": "running"
    }

@app.get("/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat() + "Z"}

@app.post("/score", response_model=ScoreResponse)
def score_endpoint(req: ScoreRequest):
    try:
        return score_url(str(req.url), req.linkText)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/report", response_model=ReportResponse)
def report_endpoint(req: ReportRequest):
    try:
        # Create a unique report ID
        report_id = str(uuid.uuid4())
        
        # Create report object
        report = {
            "id": report_id,
            "url": str(req.url),
            "tenantKey": req.tenantKey,
            "context": req.context,
            "reportedAt": datetime.utcnow().isoformat() + "Z",
            "status": "new"
        }
        
        # Add to storage
        REPORTS_STORAGE.append(report)
        
        # Save to file
        save_reports()
        
        print(f"Report received: {report_id} for URL: {req.url}")
        
        return ReportResponse(
            ok=True, 
            message=f"Report received and stored successfully. Report ID: {report_id}",
            reportId=report_id
        )
    except Exception as e:
        print(f"Error storing report: {e}")
        return ReportResponse(
            ok=False, 
            message=f"Error storing report: {str(e)}"
        )

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

@app.get("/admin/api/reports")
def admin_list_reports(limit: int = 200):
    """List all reports with optional filtering"""
    try:
        # Return reports in reverse chronological order (newest first)
        sorted_reports = sorted(REPORTS_STORAGE, key=lambda x: x.get('reportedAt', ''), reverse=True)
        return {
            "items": sorted_reports[:limit],
            "total": len(REPORTS_STORAGE),
            "message": f"Found {len(REPORTS_STORAGE)} reports"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing reports: {str(e)}")

@app.get("/admin/api/report/{report_id}")
def admin_get_report(report_id: str):
    """Get a specific report by ID"""
    try:
        for report in REPORTS_STORAGE:
            if report.get('id') == report_id:
                return report
        raise HTTPException(status_code=404, detail="Report not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving report: {str(e)}")

@app.get("/admin/api/reports/summary")
def admin_reports_summary():
    """Get summary statistics for reports"""
    try:
        total_reports = len(REPORTS_STORAGE)
        today = datetime.utcnow().date()
        today_reports = sum(1 for r in REPORTS_STORAGE 
                          if datetime.fromisoformat(r['reportedAt'].replace('Z', '+00:00')).date() == today)
        
        # Count by tenant
        tenant_counts = {}
        for report in REPORTS_STORAGE:
            tenant = report.get('tenantKey', 'unknown')
            tenant_counts[tenant] = tenant_counts.get(tenant, 0) + 1
        
        return {
            "totalReports": total_reports,
            "todayReports": today_reports,
            "tenantBreakdown": tenant_counts,
            "lastUpdated": datetime.utcnow().isoformat() + "Z"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

# Lambda handler for AWS SAM deployment
def lambda_handler(event, context):
    """AWS Lambda handler for the FastAPI application"""
    from mangum import Mangum
    
    # Create Mangum adapter for FastAPI
    adapter = Mangum(app)
    
    # Handle the Lambda event
    response = adapter(event, context)
    
    return response

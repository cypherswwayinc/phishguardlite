
import json, glob, os, datetime, collections, urllib.parse, smtplib
from email.mime.text import MIMEText
from pathlib import Path
from jinja2 import Template

BASE = Path(__file__).resolve().parents[1]
REPORTS = BASE / "reports"
TPL = BASE / "templates" / "weekly_digest.html"

def load_reports(start_utc: datetime.datetime, end_utc: datetime.datetime):
  items = []
  for fp in sorted(REPORTS.glob("report-*.json")):
    try:
      data = json.loads(Path(fp).read_text())
      t = data.get("receivedAt")
      if not t: 
        continue
      ts = datetime.datetime.fromisoformat(t.replace("Z","").replace("+00:00",""))
      if start_utc <= ts <= end_utc:
        items.append(data)
    except Exception:
      continue
  return items

def domain_from_url(u: str) -> str:
  try:
    from urllib.parse import urlparse
    return (urlparse(u).hostname or "").lower()
  except Exception:
    return ""

def aggregate(items):
  total = len(items)
  dom_counts = collections.Counter(domain_from_url(x.get("url","")) for x in items if x.get("url"))
  reason_counts = collections.Counter()
  for it in items:
    for r in (it.get("context",{}).get("reasons") or []):
      reason_counts[r] += 1
  top_domains = [{"domain": d or "(unknown)", "count": c} for d,c in dom_counts.most_common(15)]
  top_reasons = [{"reason": r, "count": c} for r,c in reason_counts.most_common(15)]
  return total, top_domains, top_reasons

def render_html(start, end, total, top_domains, top_reasons):
  tpl = Template(Path(TPL).read_text())
  return tpl.render(
    start=start.isoformat() + "Z",
    end=end.isoformat() + "Z",
    total=total,
    top_domains=top_domains,
    top_reasons=top_reasons,
    generated=datetime.datetime.utcnow().isoformat() + "Z"
  )

def maybe_send_email(html: str):
  # Simple SMTP example (fill in your SMTP settings to enable)
  SMTP_HOST = os.environ.get("SMTP_HOST")  # e.g., smtp.gmail.com
  SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
  SMTP_USER = os.environ.get("SMTP_USER")
  SMTP_PASS = os.environ.get("SMTP_PASS")
  TO = os.environ.get("DIGEST_TO")  # comma-separated
  FROM = os.environ.get("DIGEST_FROM", SMTP_USER or "digest@example.com")

  if not (SMTP_HOST and SMTP_USER and SMTP_PASS and TO):
    print("SMTP not configured; skipping email send. Set SMTP_* and DIGEST_TO env vars to enable.")
    return False

  msg = MIMEText(html, "html", "utf-8")
  msg["Subject"] = "PhishGuard Lite — Weekly Digest"
  msg["From"] = FROM
  msg["To"] = TO

  with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
    s.starttls()
    s.login(SMTP_USER, SMTP_PASS)
    s.sendmail(FROM, TO.split(","), msg.as_string())
  return True

if __name__ == "__main__":
  # Default window: last 7 days
  end = datetime.datetime.utcnow()
  start = end - datetime.timedelta(days=7)
  items = load_reports(start, end)
  total, top_domains, top_reasons = aggregate(items)
  html = render_html(start, end, total, top_domains, top_reasons)
  out = BASE / "reports" / f"weekly_digest_{end.strftime('%Y%m%d')}.html"
  out.write_text(html, encoding="utf-8")
  print(f"Wrote {out}")
  maybe_send_email(html)

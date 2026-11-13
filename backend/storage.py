"""Report storage.

One JSON object per report (S3 key or local file) instead of one big reports.json that every
Lambda instance cached and rewrote: that design silently dropped reports whenever two warm
instances handled requests, and every write cost O(number of reports).

Layout:  reports/items/YYYY/MM/DD/<timestamp>-<id>.json   (keys sort chronologically)
The old reports/reports.json (if present) is still read so existing reports are not lost.
"""

import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

ITEMS_PREFIX = "reports/items/"
LEGACY_KEY = "reports/reports.json"
ID_RE = re.compile(r"^[0-9a-fA-F-]{8,64}$")
MAX_LIST = 500
TENANT_SAMPLE = 1000


def _is_missing(exc: Exception) -> bool:
    code = getattr(exc, "response", {}).get("Error", {}).get("Code") if hasattr(exc, "response") else None
    return code in ("NoSuchKey", "404", "NotFound")


class _S3Backend:
    def __init__(self, client, bucket: str):
        self.client, self.bucket = client, bucket

    def put(self, key: str, data: bytes) -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType="application/json")

    def get(self, key: str) -> Optional[bytes]:
        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except Exception as e:  # noqa: BLE001 - botocore exceptions are dynamic
            if _is_missing(e):
                return None
            raise

    def list(self, prefix: str) -> List[str]:
        keys: List[str] = []
        token = None
        while True:
            kwargs = {"Bucket": self.bucket, "Prefix": prefix}
            if token:
                kwargs["ContinuationToken"] = token
            page = self.client.list_objects_v2(**kwargs)
            keys.extend(o["Key"] for o in page.get("Contents", []))
            if not page.get("IsTruncated"):
                return keys
            token = page.get("NextContinuationToken")


class _LocalBackend:
    def __init__(self, root: Path):
        self.root = Path(root)

    def put(self, key: str, data: bytes) -> None:
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(data)
        tmp.replace(path)  # atomic on POSIX: readers never see a half-written file

    def get(self, key: str) -> Optional[bytes]:
        path = self.root / key
        return path.read_bytes() if path.exists() else None

    def list(self, prefix: str) -> List[str]:
        base = self.root / prefix
        if not base.exists():
            return []
        return [p.relative_to(self.root).as_posix() for p in base.rglob("*.json")]


class ReportStore:
    def __init__(self, s3_client=None, bucket: str = "", local_dir: Optional[Path] = None):
        if s3_client is not None and bucket:
            self.backend = _S3Backend(s3_client, bucket)
            self.kind = "S3"
        else:
            self.backend = _LocalBackend(local_dir or Path("/tmp/phishguard-reports"))
            self.kind = "Local"

    # -- writing -------------------------------------------------------------------------
    def add(self, report: Dict, when: Optional[datetime] = None) -> str:
        """Persist one report. Raises on failure so callers can tell the user it was NOT saved."""
        when = (when or datetime.now(timezone.utc)).astimezone(timezone.utc)
        key = f"{ITEMS_PREFIX}{when:%Y/%m/%d}/{when:%Y%m%dT%H%M%S%f}Z-{report['id']}.json"
        self.backend.put(key, json.dumps(report).encode("utf-8"))
        return key

    # -- reading -------------------------------------------------------------------------
    def _item_keys_desc(self) -> List[str]:
        return sorted(self.backend.list(ITEMS_PREFIX), reverse=True)

    def _load(self, keys: List[str]) -> List[Dict]:
        def one(key: str) -> Optional[Dict]:
            raw = self.backend.get(key)
            return json.loads(raw) if raw else None

        if not keys:
            return []
        with ThreadPoolExecutor(max_workers=min(16, len(keys))) as pool:
            return [r for r in pool.map(one, keys) if r]

    def _legacy(self) -> List[Dict]:
        raw = self.backend.get(LEGACY_KEY)
        if not raw:
            return []
        try:
            data = json.loads(raw)
            return data if isinstance(data, list) else []
        except ValueError:
            return []

    @staticmethod
    def _newest_first(reports: List[Dict]) -> List[Dict]:
        return sorted(reports, key=lambda r: r.get("reportedAt", ""), reverse=True)

    def list_recent(self, limit: int = 200) -> List[Dict]:
        limit = max(1, min(int(limit), MAX_LIST))
        items = self._load(self._item_keys_desc()[:limit])
        merged = {r.get("id"): r for r in self._legacy() + items}  # de-duplicate by id
        return self._newest_first(list(merged.values()))[:limit]

    def get(self, report_id: str) -> Optional[Dict]:
        if not ID_RE.match(report_id or ""):
            return None  # never build a storage key from unvalidated input
        suffix = f"-{report_id}.json"
        for key in self._item_keys_desc():
            if key.endswith(suffix):
                found = self._load([key])
                return found[0] if found else None
        return next((r for r in self._legacy() if r.get("id") == report_id), None)

    def summary(self, now: Optional[datetime] = None) -> Dict:
        now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
        keys = self._item_keys_desc()
        legacy = self._legacy()
        today_prefix = f"{ITEMS_PREFIX}{now:%Y/%m/%d}/"
        today_str = f"{now:%Y-%m-%d}"
        today = sum(1 for k in keys if k.startswith(today_prefix)) + sum(
            1 for r in legacy if str(r.get("reportedAt", "")).startswith(today_str)
        )
        tenants: Dict[str, int] = {}
        for r in self._load(keys[:TENANT_SAMPLE]) + legacy[-TENANT_SAMPLE:]:
            tenant = r.get("tenantName") or r.get("tenantKey") or "unknown"
            tenants[tenant] = tenants.get(tenant, 0) + 1
        return {
            "totalReports": len(keys) + len(legacy),
            "todayReports": today,
            "tenantBreakdown": tenants,  # based on the most recent reports
            "storage": self.kind,
        }

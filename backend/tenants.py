"""Organisation (tenant) keys.

Each paying customer gets a key like `pg_...`. Only a SHA-256 hash of the key is stored, so a
leaked bucket does not leak working keys. The raw key is shown once, when it is created.

Layout:  tenants/<sha256(key)>.json   ->  {"id", "name", "active", "createdAt", "keyHint"}
Looking a key up is one object read; no scanning.
"""

import hashlib
import re
import secrets
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

import json

PREFIX = "tenants/"
KEY_RE = re.compile(r"^pg_[A-Za-z0-9_-]{20,100}$")
NAME_MAX = 100


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class TenantStore:
    def __init__(self, backend):
        self.backend = backend  # same put/get/list backend the ReportStore uses

    def _key(self, digest: str) -> str:
        return f"{PREFIX}{digest}.json"

    def create(self, name: str) -> Dict:
        """Create a tenant. Returns the record plus the raw key (the only time it is visible)."""
        name = (name or "").strip()[:NAME_MAX]
        if not name:
            raise ValueError("name is required")
        raw = "pg_" + secrets.token_urlsafe(24)
        record = {
            "id": uuid.uuid4().hex[:12],
            "name": name,
            "active": True,
            "createdAt": _now(),
            "keyHint": raw[:7] + "..." + raw[-4:],
        }
        self.backend.put(self._key(hash_key(raw)), json.dumps(record).encode("utf-8"))
        return {**record, "key": raw}

    def lookup(self, key: Optional[str]) -> Optional[Dict]:
        """Return the active tenant record for a raw key, or None."""
        if not key or not KEY_RE.match(key):
            return None
        raw = self.backend.get(self._key(hash_key(key)))
        if not raw:
            return None
        record = json.loads(raw)
        return record if record.get("active") else None

    def _all(self) -> List[Dict]:
        out = []
        for k in self.backend.list(PREFIX):
            raw = self.backend.get(k)
            if raw:
                rec = json.loads(raw)
                rec["_d"] = k[len(PREFIX):-len(".json")]  # internal: storage digest
                out.append(rec)
        return sorted(out, key=lambda r: r.get("createdAt", ""), reverse=True)

    def list_public(self) -> List[Dict]:
        """Tenant records safe to return from the admin API (no digest, never the key)."""
        return [{k: v for k, v in r.items() if k != "_d"} for r in self._all()]

    def set_active(self, tenant_id: str, active: bool) -> Optional[Dict]:
        for rec in self._all():
            if rec.get("id") == tenant_id:
                digest = rec.pop("_d")
                rec["active"] = active
                self.backend.put(self._key(digest), json.dumps(rec).encode("utf-8"))
                return rec
        return None

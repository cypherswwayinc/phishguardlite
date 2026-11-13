"""End-to-end HTTP tests against the real FastAPI app. Skipped unless fastapi's TestClient works
(needs the real `fastapi` and `httpx` packages)."""
import hashlib
import hmac
import json
import time

import pytest

pytest.importorskip("httpx")
testclient = pytest.importorskip("fastapi.testclient")

import app as backend  # noqa: E402
from fakes import FakeS3  # noqa: E402
from storage import ReportStore  # noqa: E402

TOKEN = "correct-horse-battery-staple"
SECRET = "whsec_http_test"
AUTH = {"Authorization": "Bearer " + TOKEN}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(backend, "store", ReportStore(s3_client=FakeS3(), bucket="b"))
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", SECRET)
    monkeypatch.setenv("MAIL_FROM", "PhishGuard <pg@example.test>")
    sent = []

    class FakeSES:
        def send_email(self, **kw):
            sent.append(kw)

    monkeypatch.setattr(backend, "_ses", FakeSES())
    c = testclient.TestClient(backend.app)
    c.sent = sent
    return c


def test_public_and_admin_routes_over_http(client):
    assert client.get("/health").json()["ok"] is True
    assert client.get("/admin/api/reports/summary").status_code == 401
    assert client.get("/admin/api/tenants").status_code == 401
    assert client.post("/admin/api/tenants", json={"name": "x"}).status_code == 401
    assert client.get("/admin/api/reports/summary", headers=AUTH).status_code == 200


def test_report_flow_with_and_without_key(client):
    body = {"url": "https://bit.ly/abc", "score": 20, "label": "Caution", "context": {"reasons": ["URL shortener host"]}}
    assert client.post("/report", json=body).status_code == 200
    assert client.post("/report", json={**body, "tenantKey": "nope"}).status_code == 401
    key = client.post("/admin/api/tenants", json={"name": "Acme"}, headers=AUTH).json()["key"]
    assert client.post("/report", json={**body, "tenantKey": key}).status_code == 200
    items = client.get("/admin/api/reports", headers=AUTH).json()["items"]
    assert sorted(str(i["tenantName"]) for i in items) == ["Acme", "None"]
    assert client.post("/report", json={"url": "javascript:alert(1)"}).status_code == 422


def test_stripe_webhook_over_http(client):
    payload = json.dumps({"type": "checkout.session.completed", "data": {"object": {
        "id": "cs_live_1", "payment_status": "paid", "customer": "cus_1", "subscription": "sub_1",
        "collected_information": {"business_name": "Acme Law"},
        "customer_details": {"email": "owner@acme.test", "name": "Pat"}}}}).encode()
    ts = str(int(time.time()))
    sig = hmac.new(SECRET.encode(), ts.encode() + b"." + payload, hashlib.sha256).hexdigest()
    headers = {"Stripe-Signature": f"t={ts},v1={sig}", "Content-Type": "application/json"}
    assert client.post("/stripe/webhook", content=payload, headers={**headers, "Stripe-Signature": "t=1,v1=bad"}).status_code == 400
    r = client.post("/stripe/webhook", content=payload, headers=headers)
    assert r.status_code == 200 and r.json()["tenantId"]
    assert client.sent[0]["Destination"]["ToAddresses"] == ["owner@acme.test"]
    text = client.sent[0]["Message"]["Body"]["Text"]["Data"]
    key = next(w for w in text.split() if w.startswith("pg_"))
    assert client.post("/report", json={"url": "https://bit.ly/x", "tenantKey": key}).status_code == 200
    assert client.post("/stripe/webhook", content=payload, headers=headers).json() == {"ok": True, "duplicate": True}

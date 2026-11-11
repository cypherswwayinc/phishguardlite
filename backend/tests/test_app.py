"""Handler-level tests. Skipped automatically if FastAPI isn't installed."""
import pytest

pytest.importorskip("fastapi")
pytest.importorskip("pydantic")

import app as backend  # noqa: E402
from fakes import FakeS3  # noqa: E402
from storage import ReportStore  # noqa: E402

TOKEN = "correct-horse-battery-staple"


@pytest.fixture(autouse=True)
def fresh_store(monkeypatch):
    monkeypatch.setattr(backend, "store", ReportStore(s3_client=FakeS3(), bucket="b"))
    monkeypatch.setenv("ADMIN_TOKEN", TOKEN)


def make_report(**over):
    data = {"url": "https://bit.ly/abc", "tenantKey": "acme", "score": 20, "label": "Caution",
            "context": {"linkText": "x", "pageUrl": "https://mail.google.com", "reasons": ["URL shortener host"]}}
    data.update(over)
    return backend.ReportRequest(**data)


def test_report_is_stored_with_flat_fields_the_dashboard_needs():
    resp = backend.report_endpoint(make_report())
    assert resp.ok and resp.reportId
    saved = backend.store.get(resp.reportId)
    assert saved["reasons"] == ["URL shortener host"] and saved["score"] == 20 and saved["label"] == "Caution"
    assert saved["url"] == "https://bit.ly/abc"


def test_report_rejects_oversized_context_and_tenant():
    with pytest.raises(backend.HTTPException) as e:
        backend.report_endpoint(make_report(context={"blob": "x" * 10_000}))
    assert e.value.status_code == 413
    with pytest.raises(backend.HTTPException) as e:
        backend.report_endpoint(make_report(tenantKey="t" * 200))
    assert e.value.status_code == 422


def test_report_does_not_claim_success_when_storage_fails(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("S3 down")

    monkeypatch.setattr(backend.store, "add", boom)
    with pytest.raises(backend.HTTPException) as e:
        backend.report_endpoint(make_report())
    assert e.value.status_code == 503


def test_admin_dependency_requires_the_token(monkeypatch):
    with pytest.raises(backend.HTTPException) as e:
        backend.require_admin(None)
    assert e.value.status_code == 401
    with pytest.raises(backend.HTTPException) as e:
        backend.require_admin("Bearer nope-nope-nope-nope")
    assert e.value.status_code == 401
    assert backend.require_admin("Bearer " + TOKEN) is None
    monkeypatch.delenv("ADMIN_TOKEN")
    with pytest.raises(backend.HTTPException) as e:  # fails closed when not configured
        backend.require_admin("Bearer " + TOKEN)
    assert e.value.status_code == 503


def test_every_admin_api_route_is_protected():
    """Wiring check: each /admin/api route decorator must carry Depends(require_admin)."""
    import inspect
    lines = [l for l in inspect.getsource(backend).splitlines() if l.startswith("@app.get") and "/admin/api" in l]
    assert len(lines) == 3, lines
    assert all("Depends(require_admin)" in l for l in lines), lines


def test_public_endpoints_do_not_leak_infrastructure_details():
    assert "bucket" not in backend.root() and "bucket" not in backend.health()
    assert backend.health()["ok"] is True


def test_admin_listing_and_missing_report():
    rid = backend.report_endpoint(make_report()).reportId
    assert backend.admin_list_reports(limit=10)["items"][0]["id"] == rid
    assert backend.admin_reports_summary()["totalReports"] == 1
    with pytest.raises(backend.HTTPException) as e:
        backend.admin_get_report("00000000-0000-0000-0000-000000000000")
    assert e.value.status_code == 404

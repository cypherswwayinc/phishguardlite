import json
from datetime import datetime, timedelta, timezone

import pytest

from fakes import FakeS3
from storage import LEGACY_KEY, ReportStore

T0 = datetime(2026, 11, 11, 10, 0, 0, tzinfo=timezone.utc)


def rep(i, tenant="acme", when=T0):
    return {"id": f"{i:08d}-aaaa-bbbb-cccc-dddddddddddd", "url": f"https://bit.ly/{i}", "tenantKey": tenant,
            "reportedAt": when.isoformat().replace("+00:00", "Z")}


@pytest.fixture(params=["s3", "local"])
def make_store(request, tmp_path):
    shared = FakeS3()

    def make():
        if request.param == "s3":
            return ReportStore(s3_client=shared, bucket="b")
        return ReportStore(local_dir=tmp_path)

    make.shared = shared
    return make


def test_add_and_list_newest_first_with_limit(make_store):
    s = make_store()
    for i in range(7):
        s.add(rep(i, when=T0 + timedelta(minutes=i)), when=T0 + timedelta(minutes=i))
    got = s.list_recent(limit=4)  # > page size (3) so pagination is exercised on S3
    assert [r["url"] for r in got] == [f"https://bit.ly/{i}" for i in (6, 5, 4, 3)]


def test_two_instances_do_not_lose_each_others_reports(make_store):
    """Regression: the old design cached the list per instance and rewrote reports.json."""
    a, b = make_store(), make_store()
    a.add(rep(1), when=T0)
    b.add(rep(2), when=T0 + timedelta(seconds=1))
    a.add(rep(3), when=T0 + timedelta(seconds=2))  # `a` never saw report 2 in memory
    assert {r["url"] for r in a.list_recent()} == {"https://bit.ly/1", "https://bit.ly/2", "https://bit.ly/3"}
    assert a.summary(now=T0)["totalReports"] == 3


def test_get_by_id_and_rejects_unsafe_ids(make_store):
    s = make_store()
    s.add(rep(5), when=T0)
    assert s.get(rep(5)["id"])["url"] == "https://bit.ly/5"
    assert s.get("00000000-0000-0000-0000-000000000000") is None
    for bad in ("../../etc/passwd", "a/b", "", "x" * 200, "id; drop"):
        assert s.get(bad) is None


def test_summary_counts_today_and_tenants(make_store):
    s = make_store()
    s.add(rep(1, "acme"), when=T0)
    s.add(rep(2, "acme"), when=T0 + timedelta(hours=1))
    s.add(rep(3, None), when=T0 - timedelta(days=1))
    sm = s.summary(now=T0 + timedelta(hours=2))
    assert sm["totalReports"] == 3 and sm["todayReports"] == 2
    assert sm["tenantBreakdown"] == {"acme": 2, "unknown": 1}


def test_legacy_reports_json_is_still_visible_and_deduplicated():
    fake = FakeS3()
    legacy = [rep(90, when=T0 - timedelta(days=30)), rep(91, when=T0 - timedelta(days=29))]
    fake.objs[LEGACY_KEY] = json.dumps(legacy).encode()
    s = ReportStore(s3_client=fake, bucket="b")
    s.add(rep(92), when=T0)
    s.add(legacy[1], when=T0 - timedelta(days=29))  # same id present in both places
    urls = [r["url"] for r in s.list_recent()]
    assert urls == ["https://bit.ly/92", "https://bit.ly/91", "https://bit.ly/90"]
    assert s.get(legacy[0]["id"])["url"] == "https://bit.ly/90"


def test_corrupt_legacy_file_does_not_break_listing():
    fake = FakeS3()
    fake.objs[LEGACY_KEY] = b"{not json"
    s = ReportStore(s3_client=fake, bucket="b")
    s.add(rep(1), when=T0)
    assert len(s.list_recent()) == 1


def test_add_raises_when_storage_fails_instead_of_pretending_success():
    class Broken(FakeS3):
        def put_object(self, **kw):
            raise RuntimeError("AccessDenied")

    with pytest.raises(RuntimeError):
        ReportStore(s3_client=Broken(), bucket="b").add(rep(1), when=T0)

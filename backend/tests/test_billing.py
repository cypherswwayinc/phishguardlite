"""Stripe webhook tests: no FastAPI or Stripe library needed."""
import hashlib
import hmac
import json

import pytest

import billing
from fakes import FakeS3
from storage import ReportStore
from tenants import TenantStore

SECRET = "whsec_test_secret"
NOW = 1_800_000_000


def sign(payload: bytes, secret=SECRET, ts=NOW):
    sig = hmac.new(secret.encode(), str(ts).encode() + b"." + payload, hashlib.sha256).hexdigest()
    return f"t={ts},v1={sig}"


def checkout(session_id="cs_test_1", email="owner@acmelaw.ca", status="paid", business="Acme Law"):
    fields = [{"key": "businessname", "text": {"value": business}}] if business else []
    return json.dumps({
        "type": "checkout.session.completed",
        "data": {"object": {"id": session_id, "payment_status": status, "customer": "cus_1",
                            "subscription": "sub_1", "custom_fields": fields,
                            "customer_details": {"email": email, "name": "Pat Owner"}}},
    }).encode()


@pytest.fixture
def env():
    tenants = TenantStore(ReportStore(s3_client=FakeS3(), bucket="b").backend)
    sent = []
    return tenants, sent, lambda to, subject, text: sent.append((to, subject, text))


def run(payload, env, **over):
    tenants, _, mail = env
    kw = dict(secret=SECRET, tenants=tenants, send_mail=mail, install_url="https://example.test/ext", now=NOW)
    kw.update(over)
    return billing.handle_event(payload, kw.pop("signature", sign(payload)), **kw)


def test_paid_checkout_creates_customer_and_emails_a_working_key(env):
    tenants, sent, _ = env
    out = run(checkout(), env)
    assert out["ok"] and out["tenantId"]
    (to, subject, text), = sent
    assert to == "owner@acmelaw.ca" and "organisation key" in subject
    key = next(w for w in text.split() if w.startswith("pg_"))
    rec = tenants.lookup(key)
    assert rec["name"] == "Acme Law" and rec["stripeSubscriptionId"] == "sub_1" and rec["email"] == to
    assert "https://example.test/ext" in text


def test_stripe_retry_of_the_same_checkout_does_not_create_a_second_key(env):
    tenants, sent, _ = env
    run(checkout(), env)
    assert run(checkout(), env) == {"ok": True, "duplicate": True}
    assert len(sent) == 1 and len(tenants.list_public()) == 1


@pytest.mark.parametrize("sig", [None, "", "t=1,v1=zz", "garbage", sign(b"other body"), sign(checkout(), secret="whsec_wrong")])
def test_bad_or_missing_signature_is_rejected_and_nothing_is_created(env, sig):
    tenants, sent, _ = env
    with pytest.raises(billing.WebhookError) as e:
        run(checkout(), env, signature=sig)
    assert e.value.status == 400 and not sent and not tenants.list_public()


def test_old_signature_is_rejected_as_a_replay(env):
    payload = checkout()
    with pytest.raises(billing.WebhookError) as e:
        run(payload, env, signature=sign(payload, ts=NOW - 3600))
    assert e.value.status == 400


def test_webhook_is_disabled_without_a_secret(env):
    with pytest.raises(billing.WebhookError) as e:
        run(checkout(), env, secret="")
    assert e.value.status == 503


def test_no_key_is_created_when_email_is_not_configured(env):
    tenants, _, _ = env
    with pytest.raises(billing.WebhookError) as e:
        run(checkout(), env, send_mail=None)
    assert e.value.status == 503 and not tenants.list_public()


def test_failed_email_leaves_no_live_key_and_a_retry_succeeds(env):
    tenants, sent, mail = env

    def broken(*a):
        raise RuntimeError("SES down")

    with pytest.raises(billing.WebhookError) as e:
        run(checkout(), env, send_mail=broken)
    assert e.value.status == 503
    assert [t["active"] for t in tenants.list_public()] == [False]
    assert run(checkout(), env)["tenantId"]  # Stripe's retry
    assert len(sent) == 1 and sum(t["active"] for t in tenants.list_public()) == 1


def test_unpaid_checkout_is_ignored(env):
    tenants, sent, _ = env
    assert "ignored" in run(checkout(status="unpaid"), env)
    assert not sent and not tenants.list_public()


def test_cancelled_subscription_disables_the_key(env):
    tenants, sent, _ = env
    run(checkout(), env)
    key = next(w for w in sent[0][2].split() if w.startswith("pg_"))
    cancel = json.dumps({"type": "customer.subscription.deleted", "data": {"object": {"id": "sub_1"}}}).encode()
    assert run(cancel, env)["disabled"] == 1
    assert tenants.lookup(key) is None
    other = json.dumps({"type": "customer.subscription.deleted", "data": {"object": {"id": "sub_other"}}}).encode()
    assert run(other, env)["disabled"] == 0


def test_name_falls_back_to_payer_name_and_other_events_are_ignored(env):
    tenants, _, _ = env
    run(checkout(business=None), env)
    assert tenants.list_public()[0]["name"] == "Pat Owner"
    ping = json.dumps({"type": "invoice.paid", "data": {"object": {}}}).encode()
    assert run(ping, env) == {"ok": True, "ignored": "invoice.paid"}
    with pytest.raises(billing.WebhookError):
        run(b"not json", env)


def test_business_name_collected_by_the_payment_link_is_used(env):
    tenants, _, _ = env
    body = json.loads(checkout(business=None))
    body["data"]["object"]["collected_information"] = {"business_name": "Forret Legal Corp"}
    run(json.dumps(body).encode(), env)
    assert tenants.list_public()[0]["name"] == "Forret Legal Corp"

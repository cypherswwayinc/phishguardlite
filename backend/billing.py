"""Stripe webhook handling: a paid checkout creates a customer and emails their organisation key.

Dependency-free on purpose (no `stripe` package): the only thing needed from Stripe's library is
signature verification, which is a documented HMAC-SHA256 over "<timestamp>.<raw body>".

Events handled
  checkout.session.completed       -> create the customer, email the key (once per checkout)
  customer.subscription.deleted    -> disable that customer's key
Everything else is acknowledged and ignored.
"""

import hashlib
import hmac
import json
import logging
import time
from typing import Callable, Dict, Optional

log = logging.getLogger("phishguard.billing")

TOLERANCE_SECONDS = 300
SESSIONS_PREFIX = "stripe/sessions/"


class WebhookError(Exception):
    """Carries the HTTP status the webhook should answer with."""

    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status, self.detail = status, detail


def verify_signature(payload: bytes, header: Optional[str], secret: str, now: Optional[float] = None) -> None:
    """Raise WebhookError unless `header` is a valid, recent Stripe-Signature for `payload`."""
    if not secret:
        raise WebhookError(503, "Stripe webhook is not configured")
    if not header:
        raise WebhookError(400, "Missing signature")
    timestamp, candidates = None, []
    for part in header.split(","):
        key, _, value = part.strip().partition("=")
        if key == "t":
            timestamp = value
        elif key == "v1":
            candidates.append(value)
    if not timestamp or not timestamp.isdigit() or not candidates:
        raise WebhookError(400, "Malformed signature")
    expected = hmac.new(secret.encode(), timestamp.encode() + b"." + payload, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, c) for c in candidates):
        raise WebhookError(400, "Bad signature")
    if abs((now if now is not None else time.time()) - int(timestamp)) > TOLERANCE_SECONDS:
        raise WebhookError(400, "Signature too old")  # blocks replay of a captured request


def _business_name(session: Dict) -> str:
    """Prefer the business name collected at checkout, then the payer's name, then email."""
    for field in session.get("custom_fields") or []:
        value = ((field.get("text") or {}).get("value") or "").strip()
        if value and "business" in (field.get("key") or "").lower():
            return value
    details = session.get("customer_details") or {}
    collected = session.get("collected_information") or {}
    # "Collect business names" on a Payment Link fills business_name.
    for value in (collected.get("business_name"), details.get("business_name")):
        if isinstance(value, str) and value.strip():
            return value.strip()
    return (details.get("name") or details.get("email") or "Customer").strip()


def welcome_email(name: str, key: str, install_url: str, support_email: str) -> Dict[str, str]:
    lines = [
        f"Hi {name},",
        "",
        "Thanks for subscribing to PhishGuard Lite for Business. Your organisation key is:",
        "",
        f"    {key}",
        "",
        "Keep it private: anyone with this key can send reports under your business name.",
        "This is the only time the key is sent, so please save this email.",
        "",
        "Set up each computer (about a minute):",
    ]
    if install_url:
        lines.append(f"  1. Install PhishGuard Lite in Chrome: {install_url}")
    else:
        lines.append("  1. Install PhishGuard Lite from the Chrome Web Store.")
    lines += [
        "  2. Click the PhishGuard Lite icon to open its settings.",
        '  3. Paste the key into the "Tenant Key" box and save.',
        "",
        "From then on, links your team reports are grouped under your business.",
        "",
        f"Need help, or want us to set it up for your whole team? Reply to this email or write to {support_email}.",
        "",
        "CypherSway Inc.",
        "Vancouver, BC, Canada",
    ]
    return {"subject": "Your PhishGuard Lite organisation key", "text": "\n".join(lines)}


def handle_event(
    payload: bytes,
    signature: Optional[str],
    *,
    secret: str,
    tenants,
    send_mail: Optional[Callable[[str, str, str], None]],
    install_url: str = "",
    support_email: str = "contact@cyphersway.com",
    now: Optional[float] = None,
) -> Dict:
    """Verify and process one Stripe webhook delivery. Returns a small JSON-able result.

    Raises WebhookError; a 5xx status makes Stripe retry later (it retries for up to 3 days).
    """
    verify_signature(payload, signature, secret, now)
    try:
        event = json.loads(payload)
        kind = event["type"]
        obj = event["data"]["object"]
    except (ValueError, KeyError, TypeError):
        raise WebhookError(400, "Malformed event")

    if kind == "checkout.session.completed":
        return _checkout_completed(obj, tenants, send_mail, install_url, support_email)
    if kind == "customer.subscription.deleted":
        disabled = tenants.disable_subscription(str(obj.get("id") or ""))
        log.info("Subscription %s ended: %d key(s) disabled", obj.get("id"), disabled)
        return {"ok": True, "disabled": disabled}
    return {"ok": True, "ignored": kind}


def _checkout_completed(session, tenants, send_mail, install_url, support_email) -> Dict:
    session_id = str(session.get("id") or "")
    if not session_id.startswith("cs_"):
        raise WebhookError(400, "Malformed checkout session")
    if session.get("payment_status") not in ("paid", "no_payment_required"):
        return {"ok": True, "ignored": "unpaid checkout"}  # e.g. delayed payment methods

    email = ((session.get("customer_details") or {}).get("email") or "").strip()
    if not email or "@" not in email:
        raise WebhookError(400, "Checkout has no customer email")
    if send_mail is None:
        # Never create a key we cannot deliver: the raw key is not recoverable later.
        raise WebhookError(503, "Email sending is not configured")

    marker = SESSIONS_PREFIX + hashlib.sha256(session_id.encode()).hexdigest() + ".json"
    if tenants.backend.get(marker):
        return {"ok": True, "duplicate": True}  # Stripe delivers events at least once

    name = _business_name(session)
    tenant = tenants.create(
        name,
        extra={
            "email": email,
            "stripeCustomerId": session.get("customer"),
            "stripeSubscriptionId": session.get("subscription"),
            "source": "stripe",
        },
    )
    message = welcome_email(name, tenant["key"], install_url, support_email)
    try:
        send_mail(email, message["subject"], message["text"])
    except Exception:  # noqa: BLE001
        log.exception("Could not email the key for checkout %s", session_id)
        tenants.set_active(tenant["id"], False)  # undelivered key must not stay live
        raise WebhookError(503, "Could not send the key email; Stripe will retry")

    tenants.backend.put(marker, json.dumps({"tenantId": tenant["id"]}).encode("utf-8"))
    log.info("Customer %s created from checkout", tenant["id"])
    return {"ok": True, "tenantId": tenant["id"]}


def ses_mailer(ses_client, sender: str) -> Optional[Callable[[str, str, str], None]]:
    """Build a send(to, subject, text) function backed by Amazon SES, or None if not configured."""
    if ses_client is None or not sender:
        return None

    def send(to: str, subject: str, text: str) -> None:
        ses_client.send_email(
            Source=sender,
            Destination={"ToAddresses": [to]},
            Message={"Subject": {"Data": subject, "Charset": "UTF-8"}, "Body": {"Text": {"Data": text, "Charset": "UTF-8"}}},
        )

    return send

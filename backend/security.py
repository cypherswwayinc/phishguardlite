"""Small, dependency-free helpers for protecting the admin API."""

import hmac
from typing import Optional

MIN_TOKEN_LENGTH = 16

OK = 200
UNAUTHORIZED = 401
DISABLED = 503


def check_admin(authorization: Optional[str], expected_token: str) -> int:
    """Validate an `Authorization: Bearer <token>` header against the configured admin token.

    Fails closed:
      * DISABLED (503) when no usable token is configured, so a forgotten env var can never
        leave the admin API open;
      * UNAUTHORIZED (401) when the header is missing, malformed or wrong;
      * OK (200) otherwise.
    """
    if not expected_token or len(expected_token) < MIN_TOKEN_LENGTH:
        return DISABLED
    if not authorization:
        return UNAUTHORIZED
    scheme, _, token = authorization.strip().partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return UNAUTHORIZED
    # constant-time comparison to avoid leaking the token through timing
    if hmac.compare_digest(token.strip().encode("utf-8"), expected_token.encode("utf-8")):
        return OK
    return UNAUTHORIZED

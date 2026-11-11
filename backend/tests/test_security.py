from security import DISABLED, OK, UNAUTHORIZED, check_admin

TOKEN = "correct-horse-battery-staple"


def test_fails_closed_when_token_not_configured_or_too_short():
    assert check_admin("Bearer anything", "") == DISABLED
    assert check_admin("Bearer short", "short") == DISABLED
    assert check_admin(None, "") == DISABLED


def test_rejects_missing_or_malformed_headers():
    for header in (None, "", "Bearer", "Bearer ", "Basic " + TOKEN, TOKEN, "Token " + TOKEN):
        assert check_admin(header, TOKEN) == UNAUTHORIZED, header


def test_rejects_wrong_token():
    assert check_admin("Bearer wrong-token-value-xx", TOKEN) == UNAUTHORIZED
    assert check_admin("Bearer " + TOKEN + "x", TOKEN) == UNAUTHORIZED


def test_accepts_correct_token_case_insensitive_scheme():
    assert check_admin("Bearer " + TOKEN, TOKEN) == OK
    assert check_admin("bearer " + TOKEN, TOKEN) == OK
    assert check_admin("  Bearer   " + TOKEN + "  ", TOKEN) == OK

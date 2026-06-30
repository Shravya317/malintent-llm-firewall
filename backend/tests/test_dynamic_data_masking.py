"""
tests/test_dynamic_data_masking.py — Synthetic tool-response payloads for
sel/dynamic_data_masking.py.

Run with:  pytest tests/test_dynamic_data_masking.py -v

Note: these tests construct Presidio's AnalyzerEngine indirectly via
pii_scrubber's module-level singleton (dynamic_data_masking.py reuses it),
so the first test run in a session pays Presidio/spaCy's cold-load cost.
Subsequent runs in the same pytest session are fast.
"""

from __future__ import annotations

import pytest

from sel.dynamic_data_masking import mask, clear_session_cache


def test_phone_masking():
    response = {"customer_phone": "9876543245"}
    result = mask(response, session_id="test-session-1")
    assert result["customer_phone"] == "98******45"


def test_card_masking():
    response = {"card_number": "4111111111111243"}
    result = mask(response, session_id="test-session-1")
    assert result["card_number"] == "**** **** **** 1243"


def test_email_masking():
    response = {"contact": "tushar.dev@gmail.com"}
    result = mask(response, session_id="test-session-1")
    assert result["contact"].startswith("tu") and "@gmail.com" in result["contact"]
    # The local part before '@' must never contain the raw value verbatim.
    assert "tushar.dev" not in result["contact"]


def test_deterministic_within_session():
    """Same raw value, two separate calls, same session — must mask identically."""
    r1 = mask({"phone": "9876543245"}, session_id="session-A")
    r2 = mask({"phone": "9876543245"}, session_id="session-A")
    assert r1["phone"] == r2["phone"]


def test_non_sensitive_fields_untouched():
    response = {"order_status": "shipped", "amount": 1499}
    result = mask(response, session_id="test-session-2")
    assert result == response


def test_different_sessions_do_not_share_state_incorrectly():
    """
    Masking is deterministic WITHIN a session. Across different sessions the
    masking function for the same raw value is the same pure transformation
    (e.g. phone masking always keeps first/last two digits), so two sessions
    masking the same raw phone number will still produce the same string —
    that's expected, since the masking pattern itself is deterministic by
    design (Module 2's spec: phone -> 98******45 is a fixed transform, not a
    per-session secret). What must NOT happen is one session's cache leaking
    keys into another session's cache dict.
    """
    mask({"phone": "9876543245"}, session_id="session-X")
    mask({"phone": "9876543245"}, session_id="session-Y")

    from sel.dynamic_data_masking import _session_mask_cache  # noqa: SLF001

    assert "session-X" in _session_mask_cache
    assert "session-Y" in _session_mask_cache
    assert _session_mask_cache["session-X"] is not _session_mask_cache["session-Y"]


def test_missing_session_id_raises():
    with pytest.raises(ValueError):
        mask({"phone": "9876543245"}, session_id="")


def test_clear_session_cache_removes_entry():
    mask({"phone": "9876543245"}, session_id="session-to-clear")
    from sel.dynamic_data_masking import _session_mask_cache  # noqa: SLF001

    assert "session-to-clear" in _session_mask_cache
    clear_session_cache("session-to-clear")
    assert "session-to-clear" not in _session_mask_cache


def test_raw_value_never_persisted_as_cache_key():
    """
    The cache must key on a SHA-256 hash, never the raw value itself — this is
    the breach-resilience guarantee the module docstring promises.
    """
    raw_card = "4111111111111243"
    mask({"card": raw_card}, session_id="session-hash-check")

    from sel.dynamic_data_masking import _session_mask_cache  # noqa: SLF001

    cache = _session_mask_cache["session-hash-check"]
    assert raw_card not in cache  # not a key
    assert all(raw_card not in v for v in cache.values())  # not a value either

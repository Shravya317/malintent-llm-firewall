"""
tests/test_secret_protection.py — Synthetic credential payloads for
sel/secret_protection_engine.py.

Run with:  pytest tests/test_secret_protection.py -v
"""

from __future__ import annotations

from sel.secret_protection_engine import redact, contains_secret


def test_aws_key_redacted():
    text = "Here is the key: AKIAIOSFODNN7EXAMPLE"
    assert "AKIA" not in redact(text)
    assert "[SECRET REDACTED]" in redact(text)


def test_bearer_token_redacted():
    text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake"
    result = redact(text)
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in result
    assert "[SECRET REDACTED]" in result


def test_db_connection_string_redacted():
    text = "connecting to postgresql://admin:s3cr3tP@ss@db.internal:5432/prod"
    result = redact(text)
    assert "s3cr3tP@ss" not in result


def test_mongodb_connection_string_redacted():
    text = "mongodb+srv://dbuser:hunter2pass@cluster0.mongodb.net/prod"
    result = redact(text)
    assert "hunter2pass" not in result


def test_entropy_catches_unknown_format_key():
    # A high-entropy token with no recognisable prefix — must still be caught.
    text = "internal_key=Xk9$mPq2#vL8nR4@wZ7tY1cB6dF3gH5jK0"
    result = redact(text)
    assert "[SECRET REDACTED]" in result


def test_natural_language_untouched():
    # Natural text should never trigger entropy false positives.
    text = "Thank you so much for reaching out about your account balance today"
    assert redact(text) == text


def test_short_natural_words_untouched():
    """Short identifiers/words under the length floor must never be redacted."""
    text = "Your order ID is ORD12345 and ships tomorrow"
    assert redact(text) == text


def test_empty_and_none_passthrough():
    assert redact("") == ""
    assert redact(None) is None


def test_contains_secret_true_and_false():
    assert contains_secret("AKIAIOSFODNN7EXAMPLE") is True
    assert contains_secret("Thank you for your patience") is False


def test_multiple_secrets_in_one_string_all_redacted():
    text = (
        "AWS key AKIAIOSFODNN7EXAMPLE and bearer token "
        "Bearer abcdefghijklmnopqrstuvwxyz0123456789 were both leaked"
    )
    result = redact(text)
    assert "AKIA" not in result
    assert "abcdefghijklmnopqrstuvwxyz0123456789" not in result
    assert result.count("[SECRET REDACTED]") == 2

"""
sel/dynamic_data_masking.py — SEL Module 2: Dynamic Data Masking

Sits between an external tool's response and the LLM.  Any data returned from
a database query, API call, or filesystem read passes through here before the
LLM ever processes it.

  phone numbers  → 98******45
  card numbers   → **** **** **** 1243
  email addresses→ tu****@gmail.com

Determinism requirement (the part of this module that's actually novel):
the SAME raw value must always mask to the SAME masked value within a session,
without the raw value itself ever being stored anywhere — including in this
module's own in-memory cache.  This is what lets the LLM say "your card ending
in 1243 was charged" across multiple turns in a conversation without ever
having seen, or MalIntent ever having persisted, the full card number.

Why hash the raw value as the cache key instead of storing it directly?
This keeps the module consistent with the project's breach-resilient design
philosophy (project bible, Section 4 / Section 6 Contribution 4): even an
in-memory, never-persisted-to-disk cache should not hold raw sensitive values
longer than necessary. Hashing for lookup achieves the same determinism
without that risk — a memory dump of this process reveals SHA-256 digests and
already-masked output, never the original card or phone number.

Singleton reuse: AnalyzerEngine() is expensive to construct (it loads a spaCy
NLP pipeline) — pii_scrubber.py already pays that cost once at import time for
the Firewall Log's PII scrubbing.  Rather than constructing a second
AnalyzerEngine here (doubling memory usage and adding a second multi-second
cold start), this module imports and reuses pii_scrubber's existing instance.
This avoids redundant latency and memory overhead.

Bare-card fallback: Presidio's CREDIT_CARD recognizer is context-aware — it
weights nearby keywords like "card", "visa", "amex" when scoring a match, and
can return zero results for a digit string with no such context (e.g. a raw
"card_number" field straight out of a DB row, with no surrounding sentence).
Rather than relying on Presidio alone for this structured-data path, a narrow
regex fallback (13–19 digits, optionally space/dash separated) catches bare
card-shaped strings that Presidio misses, and routes them through the same
_mask_card / cache machinery as a normal Presidio hit. This fallback is scoped
tightly (digits-only, with optional separators) so it cannot accidentally
swallow phone numbers, emails, or arbitrary text.
"""

from __future__ import annotations

import hashlib
import logging
import re
from typing import Any, Dict

# Reuse the module-level AnalyzerEngine singleton already initialised in
# pii_scrubber.py instead of constructing a second one here.
from pii_scrubber import (
    _analyzer as _shared_analyzer,
)  # noqa: F401  (intentional reuse)

logger = logging.getLogger("malintent.sel.dynamic_data_masking")

# ── Entities this module knows how to mask ────────────────────────────────────
# A deliberately smaller set than pii_scrubber's full _ENTITY_MAP: this module
# only handles fields that come back from STRUCTURED tool responses (DB rows,
# API JSON), where phone/card/email are the realistic field types.  Names and
# locations inside free-text tool responses are out of scope here — that's
# pii_scrubber's job for prompt logging, not this module's job for tool output.
_MASKABLE_ENTITIES = ("PHONE_NUMBER", "CREDIT_CARD", "EMAIL_ADDRESS")

# Per-session cache: raw value hash → masked value.  The raw value itself is
# NEVER a key or a value in this dict — only its SHA-256 digest is used for
# lookup, and only the already-masked string is stored.
#
# NOTE: this is process-local, in-memory state. It resets on server restart
# and is not shared across multiple uvicorn worker processes. That's the
# correct behaviour currently. A shared cache (e.g. Redis) can be introduced
# if cross-worker determinism within a session becomes a requirement.
_session_mask_cache: Dict[str, Dict[str, str]] = {}


def _mask_phone(value: str) -> str:
    """98******45 — first two and last two digits visible, rest starred."""
    digits = "".join(c for c in value if c.isdigit())
    if len(digits) < 4:
        return "*" * len(value)
    return f"{digits[:2]}{'*' * (len(digits) - 4)}{digits[-2:]}"


def _mask_card(value: str) -> str:
    """**** **** **** 1243 — only the last 4 digits are ever visible."""
    digits = "".join(c for c in value if c.isdigit())
    if len(digits) < 4:
        return "**** **** **** ****"
    return f"**** **** **** {digits[-4:]}"


def _mask_email(value: str) -> str:
    """tu****@gmail.com — first 2 chars of the local part visible, domain intact."""
    if "@" not in value:
        return "****"
    local, domain = value.split("@", 1)
    visible = local[:2] if len(local) >= 2 else local
    return f"{visible}{'*' * max(len(local) - 2, 2)}@{domain}"


_MASKERS = {
    "PHONE_NUMBER": _mask_phone,
    "CREDIT_CARD": _mask_card,
    "EMAIL_ADDRESS": _mask_email,
}

# Fallback for bare card numbers (13-19 digits, optionally space/dash
# separated) that Presidio's context-aware CREDIT_CARD recognizer can miss
# when there's no surrounding keyword (e.g. "card", "visa") in the same
# string — which is the common case for a raw structured-data field like
# {"card_number": "4111111111111243"} with no sentence context at all.
_CARD_FALLBACK_RE = re.compile(r"^(?:\d[ -]?){13,19}$")


def _looks_like_bare_card(value: str) -> bool:
    """
    True only for digit strings (with optional space/dash separators) whose
    digit count falls in the standard card-number range (13-19 digits per
    ISO/IEC 7812). Deliberately narrow so it can't misfire on phone numbers
    (10-11 digits) or arbitrary text.
    """
    if not _CARD_FALLBACK_RE.match(value):
        return False
    digit_count = sum(c.isdigit() for c in value)
    return 13 <= digit_count <= 19


def _hash_raw_value(value: str) -> str:
    """
    SHA-256 digest of a raw sensitive value, used ONLY as a cache lookup key.
    Never reversible, never stored alongside the original value.
    """
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def mask(tool_response: Dict[str, Any], session_id: str) -> Dict[str, Any]:
    """
    Mask sensitive fields in a tool response before the LLM sees it.

    Deterministic within a session: the same raw value always produces the
    same masked value for the lifetime of that session_id, without the raw
    value ever being stored — only a SHA-256 hash of it is used as a cache key.

    Parameters
    ----------
    tool_response : dict
        The raw response from a database query, API call, or other external
        tool — e.g. {"customer_phone": "9876543245", "order_status": "shipped"}.
        Non-string values (ints, bools, None, nested dict/list) pass through
        unchanged; this module only inspects string fields.
    session_id : str
        Opaque session identifier scoping the determinism cache. Required —
        masking without a session scope would either (a) leak determinism
        across unrelated users/sessions if a single global cache were used, or
        (b) re-mask randomly on every call if no cache were used at all, both
        of which break the "ending in 1243" cross-turn guarantee.

    Returns
    -------
    dict
        A new dict with the same keys as tool_response. String fields that
        Presidio identifies as PHONE_NUMBER, CREDIT_CARD, or EMAIL_ADDRESS are
        replaced with their masked form. Bare card-shaped digit strings that
        Presidio misses (no surrounding context) are caught by a narrow regex
        fallback and masked the same way. All other fields are copied through
        unchanged (the original dict is never mutated in place).
    """
    if not session_id:
        # Fail loudly rather than silently degrading the determinism guarantee.
        raise ValueError(
            "dynamic_data_masking.mask() requires a non-empty session_id — "
            "masking without a session scope cannot guarantee deterministic, "
            "session-isolated output."
        )

    cache = _session_mask_cache.setdefault(session_id, {})
    masked_response: Dict[str, Any] = {}

    for field_name, value in tool_response.items():
        if not isinstance(value, str) or not value.strip():
            # Non-string / empty fields are never PII candidates here — pass through.
            masked_response[field_name] = value
            continue

        results = _shared_analyzer.analyze(
            text=value,
            entities=list(_MASKABLE_ENTITIES),
            language="en",
        )

        if not results:
            # Presidio found nothing — check the narrow bare-card fallback
            # before giving up and passing the value through unchanged.
            if _looks_like_bare_card(value):
                value_hash = _hash_raw_value(value)
                if value_hash in cache:
                    masked_response[field_name] = cache[value_hash]
                else:
                    masked_value = _mask_card(value)
                    cache[value_hash] = masked_value
                    masked_response[field_name] = masked_value
                continue

            masked_response[field_name] = value
            continue

        # Cache key: hash of the raw value — never store the raw value itself.
        value_hash = _hash_raw_value(value)
        if value_hash in cache:
            masked_response[field_name] = cache[value_hash]
            continue

        # Highest-confidence entity wins when Presidio returns multiple matches
        # for the same field (rare for these structured-data field types, but
        # handled defensively).
        best = max(results, key=lambda r: r.score)
        masker = _MASKERS.get(best.entity_type)
        masked_value = masker(value) if masker else "[MASKED]"

        cache[value_hash] = masked_value
        masked_response[field_name] = masked_value

    return masked_response


def clear_session_cache(session_id: str) -> None:
    """
    Drop the masking cache for a single session (e.g. on logout / session
    expiry).  Optional hygiene helper — the cache holds no raw values, only
    hashes and already-masked strings, so this is not a security requirement,
    only a memory-bound one for long-running servers with many sessions.
    """
    _session_mask_cache.pop(session_id, None)
    logger.debug("Cleared dynamic_data_masking cache for session_id=%s", session_id)

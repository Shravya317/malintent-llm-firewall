"""
sel/secret_protection_engine.py — SEL Module 3: Secret Protection Engine

Protects against a specific attack class: an injected prompt that causes the
LLM to inadvertently relay a secret it picked up from a tool response, config
store, or environment variable.  Any text returned from a tool — or about to
be sent to the LLM — should pass through redact() first.

Detection strategy (two passes, applied in order):
  1. Regex patterns for known secret formats (AWS access keys, generic API
     secret-key prefixes, bearer tokens, DB connection strings with embedded
     credentials).
  2. Shannon entropy scoring over remaining long alphanumeric-ish tokens, to
     catch high-randomness strings that look like secrets even without
     matching a known format — the same heuristic used by tools like
     truffleHog and GitHub's secret scanning.

Why entropy in addition to regex?
Regex only catches secrets in formats you've already anticipated. A custom
internal API key with no recognisable prefix would slip past pure pattern
matching. High Shannon entropy is a reasonable proxy for "this looks randomly
generated" — natural-language text scores well under 4.0 bits/char, while
random API keys and tokens typically score well above it.

False-positive guard:
An entropy threshold set too aggressively redacts legitimate long words, IDs,
or hashes that aren't secrets — which would break normal tool responses (e.g.
order IDs, UUIDs used as harmless reference numbers). min_length=20 and
min_entropy=4.0 were chosen so ordinary natural-language sentences NEVER trip
the entropy pass (see test_natural_language_untouched), while still catching
high-entropy 32+ character secrets. If you need to redact harmless-looking but
genuinely sensitive identifiers (e.g. internal account IDs), add an explicit
regex pattern for that format rather than lowering min_entropy — lowering the
threshold risks false-positiving on real tool output.
"""

from __future__ import annotations

import math
import re
from collections import Counter

_REDACTION = "[SECRET REDACTED]"

# ── Known secret formats ──────────────────────────────────────────────────────
# Extend this list as new formats are encountered during testing or in real
# tool integrations (Week 7+). Patterns are intentionally specific (anchored to
# known prefixes/structures) to keep this pass high-precision; the entropy pass
# below is the catch-all for anything novel.
_SECRET_PATTERNS = [
    re.compile(r"AKIA[0-9A-Z]{16}"),                            # AWS access key ID
    re.compile(r"sk-[a-zA-Z0-9]{32,}"),                         # generic "sk-" API secret key prefix
    re.compile(r"Bearer\s+[a-zA-Z0-9\-_\.]{20,}"),              # bearer / JWT-style tokens
    re.compile(r"postgres(?:ql)?://[^\s]+:[^\s]+@[^\s]+"),      # Postgres connection string w/ creds
    re.compile(r"mongodb(?:\+srv)?://[^\s]+:[^\s]+@[^\s]+"),    # MongoDB connection string w/ creds
    re.compile(r"mysql://[^\s]+:[^\s]+@[^\s]+"),                 # MySQL connection string w/ creds
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),  # PEM private key header
]

# ── Entropy pass tuning ────────────────────────────────────────────────────────
# Character class intentionally includes common "symbol-stuffed" secret
# characters (! @ # $ % ^ & *) in addition to the usual base64/token alphabet —
# real-world high-entropy secrets (especially human-generated "random-looking"
# internal keys, as opposed to base64-encoded ones) often mix in punctuation.
# A narrower class (e.g. base64-only) would fragment a secret like
# "Xk9$mPq2#vL8nR4@wZ7tY1cB6dF3gH5jK0" into sub-20-char pieces at every symbol
# and silently miss it.
_ENTROPY_TOKEN_PATTERN = re.compile(r"[A-Za-z0-9!@#$%^&*\-_\.\/+=]{20,}")
_DEFAULT_MIN_LENGTH = 20
_DEFAULT_MIN_ENTROPY = 4.0


def _shannon_entropy(s: str) -> float:
    """
    Shannon entropy in bits/character. Higher = more random-looking = more
    likely to be a machine-generated secret/key rather than natural language
    or a structured identifier with a predictable alphabet.
    """
    if not s:
        return 0.0
    counts = Counter(s)
    length = len(s)
    return -sum((c / length) * math.log2(c / length) for c in counts.values())


def _looks_like_secret(
    token: str,
    min_length: int = _DEFAULT_MIN_LENGTH,
    min_entropy: float = _DEFAULT_MIN_ENTROPY,
) -> bool:
    if len(token) < min_length:
        return False
    return _shannon_entropy(token) >= min_entropy


def redact(
    text: str,
    min_length: int = _DEFAULT_MIN_LENGTH,
    min_entropy: float = _DEFAULT_MIN_ENTROPY,
) -> str:
    """
    Replace detected secrets in ``text`` with "[SECRET REDACTED]".

    Two-pass strategy: known patterns first (regex), then an entropy-based
    catch-all over any remaining long alphanumeric-ish tokens that weren't
    already redacted by the regex pass.

    Parameters
    ----------
    text : str
        Free text to scan — typically a tool response field, or an LLM output
        string that included data retrieved from a tool/config/env source.
    min_length, min_entropy : optional
        Override the entropy-pass thresholds. Only adjust these after running
        the test suite (especially test_natural_language_untouched) — see the
        module docstring's false-positive guard note before lowering min_entropy.

    Returns
    -------
    str
        ``text`` with every detected secret replaced by "[SECRET REDACTED]".
        Returns the input unchanged (including None/empty passthrough) if no
        secrets are found.
    """
    if not text:
        return text

    redacted = text
    for pattern in _SECRET_PATTERNS:
        redacted = pattern.sub(_REDACTION, redacted)

    def _entropy_check(match: re.Match) -> str:
        token = match.group(0)
        return _REDACTION if _looks_like_secret(token, min_length, min_entropy) else token

    redacted = _ENTROPY_TOKEN_PATTERN.sub(_entropy_check, redacted)
    return redacted


def contains_secret(text: str, min_length: int = _DEFAULT_MIN_LENGTH, min_entropy: float = _DEFAULT_MIN_ENTROPY) -> bool:
    """
    Lightweight boolean check — True if redact() would change ``text``.

    Useful for the Action Audit Logger (Week 7) to record "secret_redacted: true"
    without needing to diff the before/after strings itself.
    """
    if not text:
        return False
    return redact(text, min_length, min_entropy) != text

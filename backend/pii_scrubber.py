"""
pii_scrubber.py — PII scrubbing pipeline using Microsoft Presidio.

This module is the first breach-resilient storage mechanism in MalIntent.
Before any prompt payload is written to the ThreatLog table, it passes through
scrub().  Names, email addresses, phone numbers, credit card numbers, Aadhaar
numbers, PAN numbers, and IBANs are replaced with labelled placeholder tokens.

The original text is NEVER stored — it is discarded after both the SHA-256
hash and the scrubbed text are computed.

Breach scenario: an attacker who exfiltrates the database and has access to
scrubbed_text rows sees a log like:
  "My name is [NAME_REDACTED], email [EMAIL_REDACTED], card [CARD_REDACTED]"
The actual identity, contact details, and payment information are unrecoverable
from this record.

Initialisation note: AnalyzerEngine and AnonymizerEngine are expensive to create
(they load spaCy models and NLP pipelines).  They are initialised once at module
import time and reused across all requests.  This adds ~2–3 seconds to cold start
but keeps per-request latency negligible.

Dependency: spaCy's en_core_web_lg model must be downloaded before this module
can be imported.  Run once: python -m spacy download en_core_web_lg
"""

from __future__ import annotations

import logging
from typing import Optional

from presidio_analyzer import AnalyzerEngine, RecognizerResult
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

logger = logging.getLogger("malintent.pii_scrubber")

# ── INITIALISE ENGINES ONCE ──────────────────────────────────────────────────
# These are module-level singletons.  FastAPI's lifespan has already started by
# the time any endpoint is called, so this init is safe.

try:
    _analyzer   = AnalyzerEngine()
    _anonymizer = AnonymizerEngine()
    logger.info("Presidio AnalyzerEngine and AnonymizerEngine initialised successfully.")
except Exception as exc:  # pragma: no cover
    logger.error(
        "Failed to initialise Presidio engines.  "
        "Have you run: python -m spacy download en_core_web_lg ?  Error: %s", exc
    )
    raise


# ── ENTITY → TOKEN MAP ───────────────────────────────────────────────────────
# Maps Presidio entity type strings to the placeholder token written to the log.
# Adding new entity types here is sufficient — no other code changes required.

_ENTITY_MAP: dict[str, str] = {
    "PERSON":        "[NAME_REDACTED]",
    "EMAIL_ADDRESS": "[EMAIL_REDACTED]",
    "PHONE_NUMBER":  "[PHONE_REDACTED]",
    "CREDIT_CARD":   "[CARD_REDACTED]",
    "IN_PAN":        "[PAN_REDACTED]",
    "IN_AADHAAR":    "[AADHAAR_REDACTED]",
    "IBAN_CODE":     "[IBAN_REDACTED]",
    "LOCATION":      "[LOCATION_REDACTED]",
    "DATE_TIME":     "[DATE_REDACTED]",
}

_SUPPORTED_ENTITIES = list(_ENTITY_MAP.keys())


# ── PUBLIC API ────────────────────────────────────────────────────────────────

def scrub(text: str) -> str:
    """
    Detect and replace PII in text with labelled placeholder tokens.

    Returns the scrubbed string.  The original input is never returned, stored,
    or logged by this function.

    Args:
        text: the raw prompt text received from the user.

    Returns:
        A string where all detected PII entities have been replaced with tokens
        from _ENTITY_MAP.  Non-PII content is preserved verbatim.

    Example:
        scrub("My name is Rahul, email rahul@example.com, card 4111111111111111")
        → "My name is [NAME_REDACTED], email [EMAIL_REDACTED], card [CARD_REDACTED]"

    If text is empty or whitespace-only, it is returned unchanged (no PII to scrub).
    If Presidio finds no PII, the original text is returned unchanged.
    """
    if not text or not text.strip():
        return text

    # Step 1 — Detect all PII entities present in the text
    results: list[RecognizerResult] = _analyzer.analyze(
        text=text,
        entities=_SUPPORTED_ENTITIES,
        language="en",
    )

    if not results:
        # No PII detected — return the text unchanged (fast path)
        return text

    # Step 2 — Build per-entity replacement operators
    operators: dict[str, OperatorConfig] = {
        entity_type: OperatorConfig("replace", {"new_value": token})
        for entity_type, token in _ENTITY_MAP.items()
    }

    # Step 3 — Replace each detected entity with its token
    anonymized = _anonymizer.anonymize(
        text=text,
        analyzer_results=results,
        operators=operators,
    )

    return anonymized.text


def scrub_safe(text: str) -> str:
    """
    Wrapper around scrub() that catches unexpected errors and falls back to a
    safe default rather than crashing the entire scan pipeline.

    Used in the scan router so that a Presidio failure never blocks a threat
    from being logged — it logs an error and stores a placeholder instead.

    In production this should raise an alert because scrubbing failure means
    PII may be persisted — the fallback "[PII_SCRUB_ERROR]" makes this visible
    in forensic review.
    """
    try:
        return scrub(text)
    except Exception as exc:
        logger.error(
            "PII scrubbing failed — storing safe placeholder instead of raw text.  "
            "Error: %s", exc, exc_info=True
        )
        return "[PII_SCRUB_ERROR — scrubbing failed, raw text withheld]"
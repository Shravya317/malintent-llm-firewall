"""
malintent/output_validator.py — Output Consistency Validator (Week 6)

This is the project's second novel contribution (Contribution 2 in the
research paper, project bible §Section 6): every previous detection layer
(A/B/C, Weeks 1–3) inspects the INCOMING prompt. This module inspects the
LLM's OUTGOING response instead, asking a different question — not "was the
prompt malicious," but "does this response still look like it came from the
AI we configured."

Why this catches things the input firewall can't:
  A sufficiently crafted prompt can score just under the BLOCK threshold
  (risk_scorer.SCORE_BLOCK) — low enough to ALLOW, but still nudge the LLM's
  behaviour. The output validator is the second line of defence: it doesn't
  re-score the prompt at all; it scores what the model actually said back.

Decision rule — AND, not OR (project bible, Week 6 guide Day 1):
  FLAGGED only when the response is BOTH semantically distant from the
  developer's stated system purpose AND contains a high-risk pattern
  (personal data / config disclosure / out-of-scope instruction compliance).
  Distance alone is not proof of compromise — a polite, on-brand refusal to
  an off-topic question is also "semantically distant" in vector space and
  must not be flagged. Requiring both conditions is what makes this catch
  real injections without flagging every benign refusal.

Model reuse:
  Layer C (semantic_engine.py) already loads `all-MiniLM-L6-v2` via
  sentence-transformers. OutputValidator accepts an optional pre-loaded
  model instance so the same ~90MB model resident in memory for Layer C can
  be reused here instead of being loaded a second time. If no model is
  passed in, OutputValidator lazily loads its own (so this module stays
  independently importable/testable without requiring RiskScorer to exist
  first — same lazy-import pattern semantic_engine.py uses).

PII / pattern detection reuse:
  The personal-data check reuses pii_scrubber.py's existing module-level
  AnalyzerEngine singleton (`_analyzer`) instead of constructing a second
  Presidio engine — the same "audit every other module for this mistake"
  principle dynamic_data_masking.py already applies for the same reason
  (AnalyzerEngine loads a spaCy pipeline; doing that twice doubles memory
  and cold-start cost for zero benefit).
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional

# Reuse the Firewall Log's existing Presidio singleton rather than building a
# second AnalyzerEngine (same rationale as sel/dynamic_data_masking.py).
from pii_scrubber import _analyzer as _shared_pii_analyzer  # noqa: F401  (intentional reuse)

try:
    from sentence_transformers import SentenceTransformer, util
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "OutputValidator requires sentence-transformers (already a project "
        "dependency since Week 3's Layer C).\nRun: pip install sentence-transformers"
    ) from exc

logger = logging.getLogger("malintent.output_validator")


# ── CONFIG ─────────────────────────────────────────────────────────────────

MODEL_NAME = "all-MiniLM-L6-v2"   # same model family as Layer C, per the Week 6 guide

# Calibrated starting point per the Week 6 guide's skeleton. Tune against your
# own 10 adversarial examples (Day 3) and document any change alongside the
# catch-rate in docs/output_validator_results.md — same discipline risk_scorer.py
# already applies to SCORE_BLOCK / SCORE_FLAG.
DEFAULT_SIMILARITY_THRESHOLD = 0.35

# Entities checked for "personal data" disclosure in the response text.
# Deliberately a subset of pii_scrubber's full _ENTITY_MAP — IN_PAN / IN_AADHAAR
# / IBAN_CODE included since a leaked financial identifier is exactly the kind
# of disclosure this validator exists to catch; DATE_TIME/LOCATION are excluded
# here as they are too noisy for "high risk" classification on their own.
_PII_ENTITIES = [
    "PERSON",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "CREDIT_CARD",
    "IN_PAN",
    "IN_AADHAAR",
    "IBAN_CODE",
]

# Config / system-prompt disclosure patterns — catches a response that leaks
# the deployment's own configuration, not the user's data.
_CONFIG_DISCLOSURE_PATTERNS = [
    r"system\s+prompt",
    r"system\s+context",
    r"api[_\s]?key",
    r"bearer\s+[a-zA-Z0-9_\-\.]+",
    r"database\s+(schema|connection|credentials)",
    r"connection\s+string",
    r"internal\s+instructions",
    r"\brules?\s+(i|you)\s+(usually\s+)?follow\b",
    r"\bguidelines?\s+(i|you)\s+(usually\s+)?follow\b",
]

# Out-of-scope instruction compliance — catches the response actually
# *complying* with an injected instruction, not just discussing the concept.
_OOS_INSTRUCTION_PATTERNS = [
    r"as an unrestricted ai",
    r"ignoring (my|the) (previous|earlier) instructions",
    r"here is how to (bypass|hack|exploit)",
    r"i (have|now have) no (restrictions|limitations|filters)",
    r"acting as (dan|jailbreak)",
]

# Sensitive data FORMAT disclosure — catches the "hypothetical framing" attack
# strategy from the Week 6 guide's Day 3 table: the response never states a
# real customer's actual account/card number, but reveals the *shape* of one
# (e.g. "4521-XXXX-XXXX-1187"), which is itself a disclosure the deployment
# should never make. Presidio's CREDIT_CARD recognizer requires an all-digit
# string and will not catch a partially-masked placeholder pattern like this
# — this regex exists specifically to cover that gap, the same "narrow
# fallback for a structured-data path Presidio misses" pattern already used
# in sel/dynamic_data_masking.py for bare card numbers.
_SENSITIVE_FORMAT_PATTERNS = [
    r"\b\d{4}[\s-]?[xX]{4}[\s-]?[xX]{4}[\s-]?\d{2,4}\b",   # masked card/account shape
    r"\bstarts? with\b.{0,30}\bthe rest\b",                  # "starts with X, the rest..."
]


# ── RESULT TYPE ───────────────────────────────────────────────────────────────

@dataclass
class ValidationResult:
    """
    Result of validating one LLM response against the deployment's system
    context.

    Fields
    ------
    similarity_score          : cosine similarity in [-1.0, 1.0] (practically
                                 [0.0, 1.0] for natural-language pairs) between
                                 the system context vector and the response
                                 vector. Lower = more topic drift.
    high_risk_patterns_found  : list of matched pattern descriptors, e.g.
                                 "personal_data:['EMAIL_ADDRESS']" or
                                 "config_disclosure:api[_\\s]?key". Empty list
                                 when nothing matched.
    decision                  : "PASS" or "FLAGGED".
    reason                    : human-readable explanation, mirroring the
                                 style of risk_scorer.RiskResult.explanation.
    """
    similarity_score: float
    high_risk_patterns_found: List[str] = field(default_factory=list)
    decision: str = "PASS"
    reason: str = ""


# ── VALIDATOR ─────────────────────────────────────────────────────────────────

class OutputValidator:
    """
    Stage 5 of the five-stage MalIntent pipeline (project bible §Section 1).

    Lifecycle
    ---------
    1. On __init__: encode the developer-supplied system_context description
       into a vector ONCE and cache it. Re-embedding on every request would
       be pure waste — the context string rarely changes within a deployment.
    2. On validate(response): encode the response, compute cosine similarity
       against the cached context vector, run the high-risk pattern scan, and
       apply the AND rule to decide PASS vs FLAGGED.

    If the deployment's system_context changes (e.g. an admin edits it via the
    Configuration page's Context Settings tab), call update_context() rather
    than constructing a brand-new OutputValidator — this avoids re-loading the
    sentence-transformer model for a context-only change.
    """

    def __init__(
        self,
        system_context: str,
        similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
        model: Optional["SentenceTransformer"] = None,
    ) -> None:
        """
        Parameters
        ----------
        system_context : str
            Developer-provided description of what the deployment's LLM is
            supposed to do, e.g. "You are a banking assistant. Only discuss
            account balances, transactions, and loan products." Required and
            must be non-empty — an empty context has no meaningful vector to
            compare against and would make every response trivially "PASS".
        similarity_threshold : float
            Cosine similarity below which a response is considered "topic
            drift" (only meaningful in combination with a high-risk pattern
            match — see module docstring's AND rule).
        model : Optional[SentenceTransformer]
            Pass the already-loaded Layer C model instance here to avoid a
            second ~90MB load (see callers in routers/scan.py). If omitted,
            a new SentenceTransformer is loaded — useful for standalone
            tests/scripts that don't have a RiskScorer instance handy.
        """
        if not system_context or not system_context.strip():
            raise ValueError(
                "OutputValidator requires a non-empty system_context — "
                "an empty context has no meaningful vector to validate against."
            )

        self.threshold = similarity_threshold
        self.model = model if model is not None else SentenceTransformer(MODEL_NAME)

        self._config_patterns = [re.compile(p, re.IGNORECASE) for p in _CONFIG_DISCLOSURE_PATTERNS]
        self._oos_patterns = [re.compile(p, re.IGNORECASE) for p in _OOS_INSTRUCTION_PATTERNS]
        self._format_patterns = [re.compile(p, re.IGNORECASE) for p in _SENSITIVE_FORMAT_PATTERNS]

        self.system_context: str = ""
        self.context_vector = None
        self.update_context(system_context)

    def update_context(self, system_context: str) -> None:
        """
        Recompute and cache the context vector for a new system_context
        string. Call this when the developer edits the Context Settings tab
        rather than constructing a new OutputValidator — avoids re-loading
        the sentence-transformer model for a context-only change.
        """
        if not system_context or not system_context.strip():
            raise ValueError("system_context must be a non-empty string.")
        self.system_context = system_context
        self.context_vector = self.model.encode(system_context, convert_to_tensor=True)
        logger.debug("OutputValidator context vector updated (%d chars).", len(system_context))

    def validate(self, response: str) -> ValidationResult:
        """
        Validate one LLM response against the cached system context.

        Parameters
        ----------
        response : str
            The LLM's generated response text, after it has cleared the
            input firewall and been produced by the model.

        Returns
        -------
        ValidationResult
            decision == "FLAGGED" only when similarity_score < self.threshold
            AND high_risk_patterns_found is non-empty. Otherwise "PASS".
        """
        if not response or not response.strip():
            # Nothing to leak in an empty response — trivially safe.
            return ValidationResult(
                similarity_score=1.0,
                high_risk_patterns_found=[],
                decision="PASS",
                reason="Empty response — nothing to validate.",
            )

        response_vector = self.model.encode(response, convert_to_tensor=True)
        similarity = float(util.cos_sim(self.context_vector, response_vector).item())
        patterns = self._scan_high_risk_patterns(response)

        if similarity < self.threshold and patterns:
            return ValidationResult(
                similarity_score=round(similarity, 4),
                high_risk_patterns_found=patterns,
                decision="FLAGGED",
                reason=(
                    f"Response semantically distant from system context "
                    f"(similarity={similarity:.3f}, threshold={self.threshold}) "
                    f"and contains high-risk pattern(s): {patterns}"
                ),
            )

        if patterns:
            # AND rule not satisfied: high-risk pattern(s) matched, but the
            # response is still within expected semantic scope. Distance
            # alone (or pattern alone) is not proof of compromise — surface
            # the pattern match in the reason for visibility/audit purposes
            # without changing the PASS decision.
            return ValidationResult(
                similarity_score=round(similarity, 4),
                high_risk_patterns_found=patterns,
                decision="PASS",
                reason=(
                    f"Within expected scope (similarity={similarity:.3f}, "
                    f"threshold={self.threshold}); high-risk pattern(s) detected "
                    f"({patterns}) but not flagged because similarity did not "
                    f"fall below the threshold — the AND rule requires both "
                    f"semantic distance and a high-risk pattern match."
                ),
            )

        return ValidationResult(
            similarity_score=round(similarity, 4),
            high_risk_patterns_found=patterns,
            decision="PASS",
            reason=f"Within expected scope (similarity={similarity:.3f}).",
        )

    def _scan_high_risk_patterns(self, text: str) -> List[str]:
        """
        Curated regex/keyword classifier across the three categories called
        out in the project bible (Feature 2): personal data, system config
        disclosure, out-of-scope instruction compliance.

        Presidio failures are swallowed defensively (mirrors pii_scrubber's
        scrub_safe philosophy) — a PII-scan error must never crash output
        validation; it just means that signal is unavailable for this call,
        and the regex passes still run.
        """
        found: List[str] = []

        try:
            pii_results = _shared_pii_analyzer.analyze(
                text=text, entities=_PII_ENTITIES, language="en"
            )
        except Exception:  # pragma: no cover
            logger.exception("PII scan failed inside OutputValidator — continuing without it.")
            pii_results = []

        if pii_results:
            entity_types = sorted({r.entity_type for r in pii_results})
            found.append(f"personal_data:{entity_types}")

        for pattern in self._config_patterns:
            if pattern.search(text):
                found.append(f"config_disclosure:{pattern.pattern}")

        for pattern in self._oos_patterns:
            if pattern.search(text):
                found.append(f"oos_instruction:{pattern.pattern}")

        for pattern in self._format_patterns:
            if pattern.search(text):
                found.append(f"sensitive_format_disclosure:{pattern.pattern}")

        return found
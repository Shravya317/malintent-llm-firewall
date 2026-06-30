"""
routers/scan.py — The central scan endpoints.

Endpoints in this file:
  POST /api/v1/scan/input    — main firewall (full pipeline, Week 4)
  POST /api/v1/scan/output   — output consistency validator (stub, full in Week 7)
  POST /api/v1/scan/document — RAG document pre-scanner (stub, full in Week 7)

Pipeline for /api/v1/scan/input (order is intentional and security-critical):

  1. Permission pre-check   — PermissionValidator reads session role, NOT the prompt.
                              An injected prompt cannot trick this check.
  2. Three-layer risk score — RiskScorer runs Pattern + ML + FAISS.
  3. PII scrubbing          — scrub_safe() replaces PII in the prompt with tokens.
  4. SHA-256 hash           — computed from the ORIGINAL prompt (before scrubbing).
                              Used to identify duplicate prompts in forensic review.
  5. ThreatLog write        — stores hash + metadata.  Stores scrubbed_text only if
                              privacy_mode == "full".  Raw text is NEVER written.
  6. Return ScanInputResponse to caller.

Order-of-operations note (from the project bible):
  The hash MUST be computed from the ORIGINAL prompt, not the scrubbed version.
  Hashing after scrubbing would make the hash dependent on Presidio's behaviour,
  which can change across library versions.  Hashing the original provides a
  stable, version-independent fingerprint.

Week 5 changes
--------------
1. warm_up() — a public function main.py's lifespan calls at startup so the
   first /scan/input request after a server (re)start does not pay the cold
   model-load cost.  This simply forces _get_scorer() to run once, eagerly,
   instead of waiting for the first real request to trigger it.

2. process_tool_response() — wires the two new SEL modules (dynamic_data_masking
   and secret_protection_engine) into the response path.  Any data coming back
   from an external tool call passes through here before the LLM (or the API
   caller, while real LLM tool-calling is still a Week 7 item) ever sees it.
   Order matters: structured PII fields are masked first (phone/card/email),
   then any remaining free-text fields are scanned for secrets — a tool
   response can legitimately contain both a masked card number AND a leaked
   API key in an unrelated free-text field, and both protections must apply
   independently.
"""

from __future__ import annotations

import hashlib
import logging
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ThreatLog
from pii_scrubber import scrub_safe
from schemas import (
    LayerCMatch,
    ScanDocumentResponse,
    ScanInputRequest,
    ScanInputResponse,
    ScanOutputRequest,
    ScanOutputResponse,
)
from sel.permission_validator import PermissionValidator
from sel.dynamic_data_masking import mask as sel_mask
from sel.secret_protection_engine import redact as sel_redact

logger = logging.getLogger("malintent.scan")
router = APIRouter()

# Instantiate the permission validator once — it is stateless and thread-safe.
_validator = PermissionValidator()

# ── LAZY SCORER INIT ─────────────────────────────────────────────────────────
# RiskScorer loads the PromptGuard ML model and FAISS index.  Loading happens
# once on first access (lazy) rather than at import time, so that running the
# test suite or importing this module doesn't require the full ML environment.
#
# Week 5: in production, the lifespan handler in main.py calls warm_up() below
# during startup — so "lazy" in practice still means "warm before the first
# real request," it just keeps pytest collection and standalone module imports
# cheap by not forcing the load at `import routers.scan` time.

_scorer = None


def _get_scorer():
    """Return a cached RiskScorer, loading it on first call."""
    global _scorer
    if _scorer is None:
        try:
            from malintent.risk_scorer import RiskScorer  # type: ignore[import]
            _scorer = RiskScorer()
            logger.info("RiskScorer loaded and warmed up.")
        except ImportError:
            logger.warning(
                "malintent.risk_scorer not found — using StubScorer for development.  "
                "Replace with the real implementation from Week 3."
            )
            _scorer = _StubScorer()
    return _scorer


def warm_up() -> None:
    """
    Force the RiskScorer singleton (and therefore PromptGuard-86M, via
    malintent.ml_classifier.get_classifier()) to load NOW, rather than on the
    first incoming request.

    Called once from main.py's FastAPI lifespan handler at server startup.
    Idempotent — safe to call more than once; only the first call does any
    real work, every later call just returns immediately because _scorer is
    already cached.
    """
    _get_scorer()


class _StubResult:
    """Minimal stand-in for RiskResult when the Week 3 package is not present.

    Field names mirror RiskResult exactly so that scan_input() can access
    every attribute without branching on scorer type.
    """
    def __init__(self, prompt: str):
        attack_keywords = [
            "ignore previous", "ignore all", "disregard", "forget your instructions",
            "reveal your system", "you are now", "act as", "jailbreak", "dan mode",
            "pretend you", "override", "bypass", "unrestricted",
        ]
        lower = prompt.lower()
        matched = any(kw in lower for kw in attack_keywords)

        # ── Core decision ─────────────────────────────────────────────────────
        self.risk_score       = 85 if matched else 5
        self.decision         = "BLOCK" if matched else "ALLOW"
        self.primary_category = "direct_injection" if matched else "safe"

        # ── Layer membership ──────────────────────────────────────────────────
        self.layers_triggered = ["A"] if matched else []

        # ── Layer A ───────────────────────────────────────────────────────────
        self.layer_a_fired            = matched
        self.layer_a_confidence       = 1.0 if matched else 0.0
        self.layer_a_matched_patterns = ["direct_injection"] if matched else []

        # ── Layer B ───────────────────────────────────────────────────────────
        self.layer_b_fired      = False
        self.layer_b_confidence = 0.0

        # ── Layer C ───────────────────────────────────────────────────────────
        # layer_c_top_matches must be a list of dicts: {phrase, category, similarity}
        self.layer_c_fired       = False
        self.layer_c_confidence  = 0.0
        self.layer_c_top_matches = []   # list[dict]

        # ── Metadata ──────────────────────────────────────────────────────────
        self.explanation      = (
            "Stub BLOCK: known injection keyword detected." if matched
            else "Stub ALLOW: no injection keywords detected."
        )
        self.total_latency_ms = 1.5
        self.timestamp        = ""
        self.prompt_preview   = None


class _StubScorer:
    """Stub RiskScorer for use when the Week 3 ML package is not yet available."""
    def score(self, prompt: str) -> _StubResult:  # noqa: D401
        return _StubResult(prompt)


# ── SEL: TOOL RESPONSE PROCESSING (Week 5) ────────────────────────────────────

def process_tool_response(raw_response: dict, session_id: str) -> dict:
    """
    Pass an external tool's response through SEL Modules 2 and 3 before it is
    allowed to reach the LLM (or, until real tool-calling is wired in Week 7,
    before it is returned to any caller exercising this function directly —
    e.g. a forthcoming /scan/tool-response dev endpoint or test harness).

    Order matters, and is intentional:
      1. dynamic_data_masking.mask() first — masks STRUCTURED PII fields
         (phone/card/email) using deterministic per-session patterns.
      2. secret_protection_engine.redact() second — scans the (now
         PII-masked) string fields for credentials/tokens/connection strings
         and redacts them too.

    Running redact() first would not be wrong, but masking first matches the
    project bible's Module ordering (Module 2 then Module 3) and means a field
    that happens to contain both a phone number AND an embedded secret (e.g.
    a support-ticket free-text field) gets both protections applied regardless
    of which pattern a given Presidio/regex pass happens to match first.

    Parameters
    ----------
    raw_response : dict
        The raw tool/database/API response, e.g.
        {"customer_phone": "9876543245", "support_note": "called from Bearer ..."}
    session_id : str
        Required — see dynamic_data_masking.mask() for why determinism needs
        a session scope.

    Returns
    -------
    dict
        A new dict, safe to pass to the LLM: PII fields masked, any secrets
        in free-text fields redacted.
    """
    masked = sel_mask(raw_response, session_id=session_id)
    processed: dict = {}
    for field, value in masked.items():
        if isinstance(value, str):
            processed[field] = sel_redact(value)
        else:
            processed[field] = value
    return processed


# ── ENDPOINT: POST /scan/input ────────────────────────────────────────────────

@router.post("/scan/input", response_model=ScanInputResponse, status_code=200)
async def scan_input(
    body: ScanInputRequest,
    db: Session = Depends(get_db),
) -> ScanInputResponse:
    """
    Main firewall endpoint.

    Every prompt entering a MalIntent-protected LLM application passes through
    here.  The five-stage pipeline is documented in the module docstring above.

    Returns ScanInputResponse with the full risk breakdown so the frontend can
    render the three-panel forensics view (Layer A / B / C results, risk gauge,
    decision badge).
    """
    wall_start = time.perf_counter()

    # ── Step 1: Permission pre-check ─────────────────────────────────────────
    # This check reads ONLY body.session_role and a fixed scope string.
    # It NEVER reads body.prompt — prompt content cannot influence this decision.
    permitted = _validator.check(
        role=body.session_role,
        requested_scope="scan",
    )
    if not permitted:
        logger.warning(
            "Permission denied: role=%s scope=scan", body.session_role
        )
        raise HTTPException(
            status_code=403,
            detail=f"Role '{body.session_role}' is not permitted to submit scan requests.",
        )

    # ── Step 1b: Dynamic Execution Mode Override (SEL) ───────────────────────
    if body.session_role == "employee":
        logger.info("SEL Dynamic Override: Role '%s' assigned to 'Developer' mode.", body.session_role)
        execution_mode = "Developer"
    else:
        logger.info("SEL Dynamic Override: Role '%s' assigned to 'Balanced' mode.", body.session_role)
        execution_mode = "Balanced"

    # ── Step 2: Three-layer risk scoring ─────────────────────────────────────
    scorer = _get_scorer()
    result = scorer.score(body.prompt)

    # ── Step 3: PII scrubbing (BEFORE any storage) ────────────────────────────
    # scrub_safe never crashes — it falls back to a safe placeholder on error.
    scrubbed = scrub_safe(body.prompt)

    # ── Step 4: SHA-256 hash of the ORIGINAL prompt ───────────────────────────
    # Hash is computed from the original, not the scrubbed version — see module
    # docstring for the reasoning.
    payload_hash = hashlib.sha256(body.prompt.encode("utf-8")).hexdigest()

    # ── Step 5: Write to ThreatLog ────────────────────────────────────────────
    # Determine what to store in scrubbed_text based on privacy_mode.
    # In "tokenised" mode (default), scrubbed_text is NULL — only the hash is kept.
    # In "full" mode, the PII-scrubbed text is stored for forensic review.
    store_scrubbed = scrubbed if body.privacy_mode == "full" else None

    # layer_c_top_matches is a list of dicts: [{phrase, category, similarity}]
    # (RiskResult guarantees this shape — never objects with attributes.)
    layer_c_matches_raw = getattr(result, "layer_c_top_matches", None) or []
    layer_c_matches = [
        LayerCMatch(
            phrase     = m["phrase"],
            category   = m["category"],
            similarity = float(m["similarity"]),
        )
        for m in layer_c_matches_raw
    ]

    total_latency_ms = (time.perf_counter() - wall_start) * 1000

    log_entry = ThreatLog(
        payload_hash       = payload_hash,
        payload_length     = len(body.prompt),
        scrubbed_text      = store_scrubbed,
        risk_score         = float(result.risk_score),
        decision           = result.decision,
        attack_category    = result.primary_category,
        layers_triggered   = ",".join(result.layers_triggered) if result.layers_triggered else "",
        # layer_a_fired is the correct RiskResult field (not layer_a_matched)
        layer_a_matched    = bool(result.layer_a_fired),
        layer_b_confidence = float(result.layer_b_confidence),
        user_id            = body.user_id,
        session_role       = body.session_role,
        privacy_mode       = body.privacy_mode,
        latency_ms         = total_latency_ms,
    )

    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    logger.info(
        "Scan complete: decision=%s risk=%.1f category=%s role=%s log_id=%d latency=%.1fms",
        result.decision,
        result.risk_score,
        result.primary_category,
        body.session_role,
        log_entry.id,
        total_latency_ms,
    )

    # ── Step 6: Return analysis to caller ─────────────────────────────────────
    return ScanInputResponse(
        decision            = result.decision,
        risk_score          = float(result.risk_score),
        attack_category     = result.primary_category,
        layers_triggered    = result.layers_triggered or [],
        # layer_a_fired is the correct RiskResult field (not layer_a_matched)
        layer_a_matched     = bool(result.layer_a_fired),
        layer_b_confidence  = float(result.layer_b_confidence),
        layer_c_top_matches = layer_c_matches,
        latency_ms          = round(total_latency_ms, 2),
        log_id              = log_entry.id,
    )


# ── ENDPOINT: POST /scan/output ───────────────────────────────────────────────

@router.post("/scan/output", response_model=ScanOutputResponse, status_code=200)
async def scan_output(body: ScanOutputRequest) -> ScanOutputResponse:
    """
    Output Consistency Validator — stub for Week 4.

    Full implementation in Week 7:
      - Encode system_context as a sentence-transformer embedding vector.
      - Encode llm_response as a vector.
      - Compute cosine similarity.
      - Flag responses that are semantically distant from stated system purpose
        AND contain sensitive content patterns.

    Returns consistent=True for all responses in the stub, so the frontend can
    wire to this endpoint in Weeks 5–6 without hitting a 404 or unexpected error.
    """
    return ScanOutputResponse(
        consistent=True,
        similarity_score=0.9,
        flag_reason=None,
    )


# ── ENDPOINT: POST /scan/document ─────────────────────────────────────────────

@router.post("/scan/document", status_code=200)
async def scan_document() -> dict:
    """
    RAG Document Pre-Scanner — stub for Week 4.

    Full implementation in Week 7:
      - Accept a document upload (PDF / txt / docx).
      - Detect hidden text (white-on-white, zero-font-size).
      - Detect semantic instruction patterns embedded in document body text.
      - Detect metadata-level injections.
      - Return a risk assessment for the document before it enters the RAG pipeline.
    """
    return {
        "status": "stub",
        "message": "Document scanning will be fully implemented in Week 7.",
    }

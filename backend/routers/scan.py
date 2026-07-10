"""
routers/scan.py — The central scan endpoints.

Endpoints in this file:
  POST /api/v1/scan/input    — main firewall (full pipeline, Week 4)
  POST /api/v1/scan/output   — output consistency validator (REAL implementation, Week 6)
  POST /api/v1/scan/document — RAG document pre-scanner (stub, full in Week 7)

Pipeline for /api/v1/scan/input (order is intentional and security-critical):

  1. Permission pre-check   — PermissionValidator reads session role, NOT the prompt.
                              An injected prompt cannot trick this check.
  2. Three-layer risk score — RiskScorer runs Pattern + ML + FAISS.
  3. PII scrubbing          — scrub_safe() replaces PII in the prompt with tokens.
  4. SHA-256 hash            — computed from the ORIGINAL prompt (before scrubbing).
                              Used to identify duplicate prompts in forensic review.
  5. ThreatLog write        — stores hash + metadata.  Always stores PII-scrubbed
                              text for the forensic dashboard.  Raw text is NEVER written.
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

2. process_tool_response() — wires the two SEL modules (dynamic_data_masking
   and secret_protection_engine) into the response path.  Any data coming back
   from an external tool call passes through here before the LLM (or the API
   caller, while real LLM tool-calling is still a Week 7 item) ever sees it.
   Order matters: structured PII fields are masked first (phone/card/email),
   then any remaining free-text fields are scanned for secrets — a tool
   response can legitimately contain both a masked card number AND a leaked
   API key in an unrelated free-text field, and both protections must apply
   independently.

Week 6 changes
--------------
1. POST /scan/output is now a REAL implementation, not a stub. It wraps
   malintent.output_validator.OutputValidator, which is the project's second
   novel contribution (Contribution 2 — dual-stage output consistency
   validation). Validator instances are cached per system_context string so
   the context vector is computed once and reused, per the Week 6 guide's
   explicit "don't re-embed on every request" guidance — and the underlying
   sentence-transformer model is shared with Layer C's already-loaded
   instance whenever RiskScorer has been warmed, avoiding a second ~90MB
   model load.

2. process_tool_call() — orchestrates SEL Module 1 (Tool Access Controller),
   optionally SEL Module 4 (Permission Validator) for role-scoped resources,
   and SEL Module 5 (Action Audit Logger), completing all five SEL modules
   end to end. This mirrors the existing process_tool_response() pattern
   rather than embedding DB/logging concerns inside ToolAccessController or
   PermissionValidator themselves — both of those classes are explicitly
   documented as stateless, thread-safe singletons (no mutable state, no DB
   session), and giving them a request-scoped Session would break that
   invariant and the existing tests that call them directly. This function
   is the integration point real LLM function-calling output will be routed
   through once it exists (Week 7); for Week 6 it is exercised directly by
   test_sel_end_to_end.py to prove whitelist check → decision → ActionLog
   row works correctly end to end.
"""

from __future__ import annotations

import hashlib
import logging
import time
from typing import Optional

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
from sel.tool_access_controller import ToolAccessController, ToolCallDecision
from sel.action_audit_logger import ActionAuditLogger

logger = logging.getLogger("malintent.scan")
router = APIRouter()

# Instantiate the stateless SEL singletons once — both are documented as
# thread-safe with no mutable state, so a single shared instance is correct.
_validator = PermissionValidator()
_tool_access_controller = ToolAccessController()

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
            "pretend you", "override", "bypass", "unrestricted", "repeat all",
            "api key", "hack", "tutorial", "database"
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


# ── SEL: TOOL CALL ORCHESTRATION (Week 6 — completes all five SEL modules) ────
#
# This is the integration point real LLM function-calling output will be
# routed through once it exists (Week 7). For now it's the function
# test_sel_end_to_end.py exercises directly to prove the chain works:
# whitelist check (+ optional role-scope check) → decision → ActionLog row,
# for BOTH the permitted and denied paths.

# Map of database table → the role-scope string required to query it.
# "accounts"/"products"/"faq" are generally permitted per the TAC whitelist
# (sel/tool_access_controller.py); this adds a second, role-aware gate on top
# for tables where role matters even within the whitelist. Tables not listed
# here are gated by the TAC whitelist alone (no additional per-role scope).
_DB_TABLE_SCOPES: dict[str, str] = {
    "accounts": "db:accounts",
    "users":    "db:users",
}


def process_tool_call(
    *,
    tool: str,
    operation: str,
    db: Session,
    session_role: str,
    user_id: Optional[str] = None,
    params: Optional[dict] = None,
    threat_log_id: Optional[int] = None,
) -> ToolCallDecision:
    """
    Run a simulated/real LLM tool-call attempt through SEL Module 4
    (role-scope pre-check, where applicable), SEL Module 1 (Tool Access
    Controller whitelist enforcement), and SEL Module 5 (Action Audit
    Logger) — logging EVERY decision, permitted or denied.

    Check order
    -----------
    1. Role-scope check (PermissionValidator), only when the requested
       table/tool has an entry in _DB_TABLE_SCOPES. This catches, e.g., a
       "customer"-role session attempting to query "accounts" even though
       "accounts" is in the deployment-wide TAC whitelist — the TAC whitelist
       is what's *possible* in this deployment at all; the role scope is
       what *this user* is permitted to do within that.
    2. Tool Access Controller whitelist check (deployment-wide, role-agnostic).

    Both checks are logged independently of which one denies — a request
    that fails the role-scope check never reaches the TAC, but still
    produces exactly one ActionLog row with the role-scope denial reason, so
    the audit trail always reflects the actual point of failure.

    Parameters
    ----------
    tool, operation, params : same shape as ToolAccessController.validate().
    db            : request-scoped SQLAlchemy session (FastAPI Depends(get_db)).
    session_role  : the caller's session role — read from session state, NEVER
                    parsed out of prompt text (see permission_validator.py).
    user_id       : opaque session token for the ActionLog row.
    threat_log_id : optional FK back to the ThreatLog row for this request.

    Returns
    -------
    ToolCallDecision
        permitted=True/False with denial_reason populated on denial. Same
        type whether the denial came from the role-scope check or the TAC.
    """
    audit_logger = ActionAuditLogger(db=db)

    # ── Step 1: role-scope check (SEL Module 4), where applicable ───────────
    table = (params or {}).get("table", "").lower().strip() if params else ""
    required_scope = _DB_TABLE_SCOPES.get(table) if tool == "database" else None

    if required_scope is not None:
        role_permitted = _validator.check(role=session_role, requested_scope=required_scope)
        if not role_permitted:
            reason = (
                f"Role '{session_role}' is not permitted scope '{required_scope}' "
                f"required to query table '{table}'"
            )
            logger.warning(
                "process_tool_call DENIED (role-scope): tool=%s table=%s role=%s — %s",
                tool, table, session_role, reason,
            )
            decision = ToolCallDecision(
                permitted=False, tool=tool, operation=operation,
                denial_reason=reason, params=params,
            )
            audit_logger.log(
                tool_called=tool,
                outcome="DENIED",
                session_role=session_role,
                user_id=user_id,
                query_executed=_describe_query(tool, operation, params),
                denial_reason=reason,
                threat_log_id=threat_log_id,
            )
            return decision

    # ── Step 2: Tool Access Controller whitelist check (SEL Module 1) ───────
    decision = _tool_access_controller.validate(tool=tool, operation=operation, params=params)

    # ── Step 3: log the outcome (SEL Module 5) — ALWAYS, permit or deny ─────
    audit_logger.log(
        tool_called=tool,
        outcome="PERMITTED" if decision.permitted else "DENIED",
        session_role=session_role,
        user_id=user_id,
        query_executed=_describe_query(tool, operation, params),
        denial_reason=decision.denial_reason,
        threat_log_id=threat_log_id,
    )

    return decision


def _describe_query(tool: str, operation: str, params: Optional[dict]) -> str:
    """
    Build a human-readable 'exact query / API call made' string for the
    ActionLog row, per Feature 4 / Module 5's field requirements.
    """
    if tool == "database" and params and "table" in params:
        return f"{operation} ... FROM {params['table']}"
    if params:
        return f"{tool}.{operation}({params})"
    return f"{tool}.{operation}()"


# ── OUTPUT VALIDATOR: CACHE + SHARED MODEL (Week 6) ───────────────────────────
#
# Validator instances are cached per system_context string so the context
# vector (the expensive part — one model.encode() call) is computed once and
# reused across every /scan/output call for that deployment, per the Week 6
# guide's explicit "cache this context vector — recompute only if context
# changes" instruction. A soft cap keeps this from growing unbounded if a
# caller sends many distinct context strings (e.g. misconfigured client);
# normal usage has one or a small handful of context strings per deployment.

_output_validator_cache: dict[str, "OutputValidator"] = {}  # type: ignore[name-defined]
_OUTPUT_VALIDATOR_CACHE_MAX = 64


def _get_shared_sentence_transformer():
    """
    Reuse Layer C's already-loaded SentenceTransformer model when the
    RiskScorer singleton has been warmed (the normal case once main.py's
    lifespan has run), avoiding a second ~90MB model load. Returns None if
    RiskScorer hasn't been constructed yet — OutputValidator falls back to
    loading its own model instance in that case (e.g. standalone tests that
    only exercise the output validator).
    """
    if _scorer is not None and hasattr(_scorer, "layer_c"):
        return _scorer.layer_c.model
    return None


def _get_output_validator(system_context: str):
    """
    Return a cached OutputValidator for this exact system_context string,
    constructing one (and reusing the shared model, if available) on first
    use.
    """
    from malintent.output_validator import OutputValidator

    cached = _output_validator_cache.get(system_context)
    if cached is not None:
        return cached

    if len(_output_validator_cache) >= _OUTPUT_VALIDATOR_CACHE_MAX:
        # Soft eviction: drop one arbitrary entry rather than growing forever.
        # Not LRU-precise — this is a safety valve, not a performance-critical
        # path (cache misses are rare in normal single/few-deployment usage).
        _output_validator_cache.pop(next(iter(_output_validator_cache)))

    validator = OutputValidator(
        system_context=system_context,
        model=_get_shared_sentence_transformer(),
    )
    _output_validator_cache[system_context] = validator
    return validator


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
    # Always store the PII-scrubbed text so the forensic dashboard can render
    # highlighted prompt analysis.  The text has already passed through
    # scrub_safe() — no raw PII is persisted, only redacted placeholders.
    store_scrubbed = scrubbed

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

    try:
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to write ThreatLog row: payload_hash=%s decision=%s role=%s",
            payload_hash, result.decision, body.session_role,
        )
        raise

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
        scrubbed_prompt     = store_scrubbed,
    )


# ── ENDPOINT: POST /scan/output ───────────────────────────────────────────────

@router.post("/scan/output", response_model=ScanOutputResponse, status_code=200)
async def scan_output(body: ScanOutputRequest) -> ScanOutputResponse:
    """
    Output Consistency Validator (Week 6 — Contribution 2).

    Encodes body.system_context into a (cached, reused) vector, encodes
    body.llm_response into a vector, computes cosine similarity, and runs the
    high-risk pattern classifier (personal data / config disclosure /
    out-of-scope instruction compliance). Flags only when the response is
    BOTH semantically distant from the stated system purpose AND contains a
    high-risk pattern — see malintent/output_validator.py's module docstring
    for why this is an AND, not an OR.
    """
    try:
        validator = _get_output_validator(body.system_context)
        result = validator.validate(body.llm_response)
    except Exception:
        logger.exception(
            "Output validation failed for system_context=%r",
            body.system_context,
        )
        raise HTTPException(status_code=500, detail="Output validation failed.")

    logger.info(
        "Output scan complete: decision=%s similarity=%.3f patterns=%d",
        result.decision, result.similarity_score, len(result.high_risk_patterns_found),
    )

    return ScanOutputResponse(
        consistent=result.decision == "PASS",
        similarity_score=result.similarity_score,
        flag_reason=result.reason if result.decision == "FLAGGED" else None,
        high_risk_patterns_found=result.high_risk_patterns_found,
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
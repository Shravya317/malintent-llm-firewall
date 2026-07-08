"""
schemas.py — Pydantic request and response models for the MalIntent API.

FastAPI uses these schemas for:
  1. Automatic request body validation (invalid JSON → 422, not 500)
  2. Response serialisation and OpenAPI documentation generation
  3. Contract definition for Shravya's frontend (TypeScript types mirror these)

IMPORTANT: The ScanInputResponse and StatsResponse shapes are the core integration
contract. Any field rename is a breaking change that requires syncing with the frontend.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

# ── SCAN / INPUT ──────────────────────────────────────────────────────────────


class ScanInputRequest(BaseModel):
    """
    Request body for POST /api/v1/scan/input.

    prompt        : the user's raw message — validated client-side for length.
    session_role  : the caller's role.  Used by PermissionValidator before the
                    three-layer firewall runs.  The LLM never sees this field.
    user_id       : opaque session token (not a PII value — the real user identity
                    is never sent to the firewall API).  Used for ActionLog only.
    privacy_mode  : recorded in ThreatLog for audit purposes.
                      PII-scrubbed text is always stored regardless of this
                      setting to support the forensic dashboard.
                      "tokenised" (default) / "full" — retained for metadata.
    """

    prompt: str = Field(..., min_length=1, max_length=10_000)
    session_role: str = Field(default="customer")  # admin / employee / customer
    user_id: Optional[str] = None
    privacy_mode: str = Field(default="tokenised")  # tokenised / full


class LayerCMatch(BaseModel):
    """One semantically similar attack phrase returned by the FAISS layer."""

    phrase: str
    category: str
    similarity: float


class ScanInputResponse(BaseModel):
    """
    Response body for POST /api/v1/scan/input.

    These exact field names are the contract Shravya's TypeScript will reference.
    Do not rename after the Sunday integration sync.
    """

    decision: str  # ALLOW / FLAG / BLOCK
    risk_score: float  # 0.0 – 100.0
    attack_category: Optional[str]  # primary attack type, or None if safe
    layers_triggered: List[str]  # e.g. ["A", "B"] or ["A", "B", "C"]
    layer_a_matched: bool
    layer_b_confidence: float  # 0.0 – 1.0
    layer_c_top_matches: List[LayerCMatch]  # top 3 semantically similar phrases
    latency_ms: float  # total detection time in milliseconds
    log_id: int  # ThreatLog row ID for frontend to reference


# ── SCAN / OUTPUT ─────────────────────────────────────────────────────────────


class ScanOutputRequest(BaseModel):
    """Request body for POST /api/v1/scan/output."""

    llm_response: str
    system_context: str = Field(..., description="What the LLM is supposed to do")


class ScanOutputResponse(BaseModel):
    """
    Response body for POST /api/v1/scan/output.
    """

    consistent: bool
    similarity_score: float
    flag_reason: Optional[str]
    high_risk_patterns_found: List[str] = Field(default_factory=list)


# ── SCAN / DOCUMENT ───────────────────────────────────────────────────────────


class ScanDocumentResponse(BaseModel):
    """Response body for POST /api/v1/scan/document."""

    status: str
    message: str
    risk_score: float = 0.0
    decision: str = "ALLOW"
    hidden_text_detected: bool = False


# ── LOGS ──────────────────────────────────────────────────────────────────────


class ThreatLogEntry(BaseModel):
    """
    Single row from ThreatLog serialised for the frontend.
    The PII-scrubbed prompt text is mapped to prompt_full so the forensic
    dashboard can render highlighted threat analysis.
    """

    id: int
    timestamp: datetime
    payload_hash: str
    payload_length: int
    risk_score: float
    decision: str
    attack_category: Optional[str]
    layers_triggered: Optional[str]  # comma-separated, e.g. "A,B"
    layer_a_matched: bool
    layer_b_confidence: float
    session_role: Optional[str]
    latency_ms: Optional[float]
    privacy_mode: str

    # Frontend forensic dashboard fields
    # These may be None depending on the log source.

    prompt_full: Optional[str] = None
    target_model: Optional[str] = None
    source_ip: Optional[str] = None
    client_app: Optional[str] = None
    explanation: Optional[str] = None

    # Pydantic v2 — allows .model_validate(orm_instance)
    model_config = {"from_attributes": True}


class ActionLogEntry(BaseModel):
    """
    Single row from ActionLog serialised for the frontend (SelAuditLog.jsx).
    Must exactly match these fields to avoid breaking the frontend table.
    """

    id: int
    timestamp: datetime
    session_role: str
    tool_called: str
    query_executed: Optional[str]
    fields_masked: Optional[str]  # Ideally a list, but DB stores JSON string
    raw_response: Optional[str]
    masked_response: Optional[str]
    decision: str
    denial_reason: Optional[str]

    model_config = {"from_attributes": True}


# ── STATS ─────────────────────────────────────────────────────────────────────


class HourlyBucket(BaseModel):
    """One hourly data point for the trend sparkline on the dashboard."""

    hour: str  # ISO-8601 hour string, e.g. "2026-06-29T14:00:00"
    total: int
    blocked: int


class ThreatDistributionItem(BaseModel):
    """
    One slice of the Threat Distribution doughnut chart.

    label : attack category shown in the legend
    pct   : percentage of total threats (float)
    color : frontend colour used for the chart
    """

    label: str
    pct: float
    color: str


class StatsResponse(BaseModel):
    """
    Response body for GET /api/v1/stats.
    Field names are the contract for Shravya's four metric cards.
    total_requests / total_blocked / total_flagged / total_allowed are required
    for the dashboard; confirm at Sunday sync.
    """

    total_requests: int
    total_blocked: int
    total_flagged: int
    total_allowed: int
    avg_risk_score: float
    avg_latency_ms: float
    hourly_trend: List[HourlyBucket] = Field(default_factory=list)
    threat_distribution: List[ThreatDistributionItem] = Field(default_factory=list)


# ── CONFIG ────────────────────────────────────────────────────────────────────


class ConfigSetRequest(BaseModel):
    """
    Request body for PUT /api/v1/config.
    The value is received as plaintext here and encrypted before any storage
    operation inside the router.  The plaintext value is discarded after
    encryption — it never touches disk.
    """

    key: str
    value: str  # plaintext — pgcrypto encryption is applied before storage


class ConfigSetResponse(BaseModel):
    status: str
    key: str


class ConfigGetResponse(BaseModel):
    """
    Response body for GET /api/v1/config/{key}.
    Always returns the decrypted plaintext — the API layer never exposes ciphertext.
    """

    key: str
    value: str  # decrypted plaintext — ciphertext is never returned to callers


# ── HUMAN REVIEW QUEUE ────────────────────────────────────────────────────────


class LogDecisionUpdateRequest(BaseModel):
    """
    Request body for PUT /api/v1/logs/{log_id}/decision.
    Used by the False Positive Review Queue to submit the final
    human review decision.
    """

    human_decision: str = Field(..., pattern="^(ALLOW|BLOCK|FLAG)$")


class LogDecisionUpdateResponse(BaseModel):
    """
    Response body for PUT /api/v1/logs/{log_id}/decision.
    """

    status: str
    log_id: int
    decision: str

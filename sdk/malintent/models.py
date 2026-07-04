"""
models.py — Typed response models for the MalIntent SDK.

These are plain dataclasses, not Pydantic — the SDK has zero heavy
dependencies beyond `requests`. Field names are copied EXACTLY from
MalIntent's live openapi.json (v0.5.0) so the SDK never drifts from the
real API contract. If the backend adds a field, `from_dict` below simply
ignores unknown keys rather than crashing, so additive API changes never
break existing SDK installs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


def _only_known_fields(cls, data: dict) -> dict:
    """Filter a dict down to only the keys a dataclass actually declares,
    so additive/unknown fields returned by a newer API version don't crash
    an older SDK install."""
    known = {f.name for f in cls.__dataclass_fields__.values()}  # type: ignore[attr-defined]
    return {k: v for k, v in data.items() if k in known}


@dataclass
class LayerCMatch:
    """One semantically similar attack phrase returned by the FAISS layer."""
    phrase: str
    category: str
    similarity: float

    @classmethod
    def from_dict(cls, data: dict) -> "LayerCMatch":
        return cls(**_only_known_fields(cls, data))


@dataclass
class ScanInputResponse:
    """Response body for POST /api/v1/scan/input."""
    decision: str                      # "ALLOW" | "FLAG" | "BLOCK"
    risk_score: float
    attack_category: Optional[str]
    layers_triggered: List[str]
    layer_a_matched: bool
    layer_b_confidence: float
    layer_c_top_matches: List[LayerCMatch]
    latency_ms: float
    log_id: int

    @classmethod
    def from_dict(cls, data: dict) -> "ScanInputResponse":
        payload = _only_known_fields(cls, data)
        payload["layer_c_top_matches"] = [
            LayerCMatch.from_dict(m) for m in data.get("layer_c_top_matches", [])
        ]
        return cls(**payload)

    @property
    def is_blocked(self) -> bool:
        return self.decision == "BLOCK"

    @property
    def is_flagged(self) -> bool:
        return self.decision == "FLAG"

    @property
    def is_allowed(self) -> bool:
        return self.decision == "ALLOW"


@dataclass
class ScanOutputResponse:
    """Response body for POST /api/v1/scan/output."""
    consistent: bool
    similarity_score: float
    flag_reason: Optional[str]
    high_risk_patterns_found: List[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> "ScanOutputResponse":
        return cls(**_only_known_fields(cls, data))


@dataclass
class ThreatLogEntry:
    """Single row from ThreatLog, as returned by GET /api/v1/logs."""
    id: int
    timestamp: str
    payload_hash: str
    payload_length: int
    risk_score: float
    decision: str
    attack_category: Optional[str]
    layers_triggered: Optional[str]
    layer_a_matched: bool
    layer_b_confidence: float
    session_role: Optional[str]
    latency_ms: Optional[float]
    privacy_mode: str
    prompt_full: Optional[str] = None
    target_model: Optional[str] = None
    source_ip: Optional[str] = None
    client_app: Optional[str] = None
    explanation: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict) -> "ThreatLogEntry":
        return cls(**_only_known_fields(cls, data))


@dataclass
class LogDecisionUpdateResponse:
    """Response body for PUT /api/v1/logs/{log_id}/decision."""
    status: str
    log_id: int
    decision: str

    @classmethod
    def from_dict(cls, data: dict) -> "LogDecisionUpdateResponse":
        return cls(**_only_known_fields(cls, data))


@dataclass
class HourlyBucket:
    """One hourly data point for the dashboard trend sparkline."""
    hour: str
    total: int
    blocked: int

    @classmethod
    def from_dict(cls, data: dict) -> "HourlyBucket":
        return cls(**_only_known_fields(cls, data))


@dataclass
class ThreatDistributionItem:
    """One slice of the Threat Distribution doughnut chart."""
    label: str
    pct: float
    color: str

    @classmethod
    def from_dict(cls, data: dict) -> "ThreatDistributionItem":
        return cls(**_only_known_fields(cls, data))


@dataclass
class StatsResponse:
    """Response body for GET /api/v1/stats."""
    total_requests: int
    total_blocked: int
    total_flagged: int
    total_allowed: int
    avg_risk_score: float
    avg_latency_ms: float
    hourly_trend: List[HourlyBucket] = field(default_factory=list)
    threat_distribution: List[ThreatDistributionItem] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> "StatsResponse":
        payload = _only_known_fields(cls, data)
        payload["hourly_trend"] = [
            HourlyBucket.from_dict(h) for h in data.get("hourly_trend", [])
        ]
        payload["threat_distribution"] = [
            ThreatDistributionItem.from_dict(t) for t in data.get("threat_distribution", [])
        ]
        return cls(**payload)


@dataclass
class ConfigGetResponse:
    """Response body for GET /api/v1/config/{key}. Always decrypted plaintext."""
    key: str
    value: str

    @classmethod
    def from_dict(cls, data: dict) -> "ConfigGetResponse":
        return cls(**_only_known_fields(cls, data))


@dataclass
class ConfigSetResponse:
    """Response body for PUT /api/v1/config."""
    status: str
    key: str

    @classmethod
    def from_dict(cls, data: dict) -> "ConfigSetResponse":
        return cls(**_only_known_fields(cls, data))

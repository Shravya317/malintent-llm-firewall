"""
routers/stats.py — GET /api/v1/stats

Provides aggregate statistics for Shravya's four metric cards on the main
dashboard.  The exact field names (total_requests, total_blocked, total_flagged,
total_allowed) are the integration contract confirmed at Sunday's sync — do not
rename them after that point without notifying Shravya.

Also returns an hourly_trend list for the sparkline charts on the metric cards,
covering the last 24 hours in 1-hour buckets.

Also returns a threat_distribution list for the Threat Distribution doughnut
chart, computed from attack_category counts across all ThreatLog rows.
pct is a float (1 decimal place) — see schemas.py Week 6 change (2).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import ThreatLog
from schemas import HourlyBucket, StatsResponse, ThreatDistributionItem

logger = logging.getLogger("malintent.stats")
router = APIRouter()


CATEGORY_COLOURS = {
    "direct_override": "#ef4444",
    "persona_override": "#f97316",
    "jailbreak": "#f59e0b",
    "data_exfiltration": "#3b82f6",
    "encoding_obfuscation": "#8b5cf6",
    "context_manipulation": "#10b981",
    "indirect_injection": "#06b6d4",
    "harmful_elicitation": "#ec4899",
}
DEFAULT_CATEGORY_COLOUR = "#6b7280"


@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)) -> StatsResponse:
    """
    Return aggregate scan statistics.

    Response fields (Shravya's dashboard metric cards):
      total_requests — all scans ever recorded
      total_blocked  — scans with decision=BLOCK
      total_flagged  — scans with decision=FLAG
      total_allowed  — scans with decision=ALLOW
      avg_risk_score — mean risk_score across all entries
      avg_latency_ms — mean latency_ms (full tracking in Week 7, 0.0 for now)
      hourly_trend   — list of 24 hourly buckets (total + blocked per hour)
      threat_distribution — list of attack category slices for the doughnut chart
    """
    # ── Aggregate counts ──────────────────────────────────────────────────────
    total   = db.query(func.count(ThreatLog.id)).scalar() or 0
    blocked = db.query(func.count(ThreatLog.id)).filter(ThreatLog.decision == "BLOCK").scalar() or 0
    flagged = db.query(func.count(ThreatLog.id)).filter(ThreatLog.decision == "FLAG").scalar() or 0
    allowed = db.query(func.count(ThreatLog.id)).filter(ThreatLog.decision == "ALLOW").scalar() or 0

    avg_risk    = float(db.query(func.avg(ThreatLog.risk_score)).scalar() or 0.0)
    avg_latency = float(db.query(func.avg(ThreatLog.latency_ms)).scalar() or 0.0)

    # ── Hourly trend (last 24 hours) ──────────────────────────────────────────
    cutoff = datetime.now(tz=timezone.utc) - timedelta(hours=24)
    recent_entries = (
        db.query(ThreatLog.timestamp, ThreatLog.decision)
        .filter(ThreatLog.timestamp >= cutoff)
        .all()
    )

    # Build a dict: hour_str → {"total": int, "blocked": int}
    hourly: dict[str, dict[str, int]] = {}
    for ts, decision in recent_entries:
        if ts is None:
            continue
        # Normalise to UTC naive if tz-aware
        if hasattr(ts, "tzinfo") and ts.tzinfo is not None:
            hour_key = ts.replace(minute=0, second=0, microsecond=0).isoformat()
        else:
            hour_key = ts.replace(minute=0, second=0, microsecond=0).isoformat()

        bucket = hourly.setdefault(hour_key, {"total": 0, "blocked": 0})
        bucket["total"] += 1
        if decision == "BLOCK":
            bucket["blocked"] += 1

    hourly_trend = [
        HourlyBucket(hour=h, total=v["total"], blocked=v["blocked"])
        for h, v in sorted(hourly.items())
    ]

    # ── Threat distribution (by attack_category, NULLs ignored) ───────────────
    category_rows = (
        db.query(ThreatLog.attack_category, func.count(ThreatLog.id))
        .filter(ThreatLog.attack_category.isnot(None))
        .group_by(ThreatLog.attack_category)
        .all()
    )

    category_total = sum(count for _, count in category_rows)

    threat_distribution = [
        ThreatDistributionItem(
            label=category,
            pct=round((count / category_total) * 100, 1) if category_total else 0.0,
            color=CATEGORY_COLOURS.get(category, DEFAULT_CATEGORY_COLOUR),
        )
        for category, count in category_rows
    ]

    return StatsResponse(
        total_requests = total,
        total_blocked  = blocked,
        total_flagged  = flagged,
        total_allowed  = allowed,
        avg_risk_score = round(avg_risk, 2),
        avg_latency_ms = round(avg_latency, 2),
        hourly_trend   = hourly_trend,
        threat_distribution = threat_distribution,
    )
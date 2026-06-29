"""
routers/stats.py — GET /api/v1/stats

Provides aggregate statistics for Shravya's four metric cards on the main
dashboard.  The exact field names (total_requests, total_blocked, total_flagged,
total_allowed) are the integration contract confirmed at Sunday's sync — do not
rename them after that point without notifying Shravya.

Also returns an hourly_trend list for the sparkline charts on the metric cards,
covering the last 24 hours in 1-hour buckets.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database import get_db
from models import ThreatLog
from schemas import HourlyBucket, StatsResponse

logger = logging.getLogger("malintent.stats")
router = APIRouter()


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

    return StatsResponse(
        total_requests = total,
        total_blocked  = blocked,
        total_flagged  = flagged,
        total_allowed  = allowed,
        avg_risk_score = round(avg_risk, 2),
        avg_latency_ms = round(avg_latency, 2),
        hourly_trend   = hourly_trend,
    )
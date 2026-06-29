"""
routers/logs.py — GET /api/v1/logs

Returns paginated, filterable ThreatLog entries for:
  - The Live Threat Feed on the main dashboard (last 50 entries, no filter)
  - The Threat Analysis forensics page (filtered by decision, date range, etc.)

Note: the scrubbed_text field is intentionally excluded from ThreatLogEntry.
It is available in the database for forensic review by an administrator with
direct DB access, but it should never be served over the API in the standard
logs endpoint — doing so would expose PII-scrubbed content to anyone with an
API key.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from models import ThreatLog
from schemas import ThreatLogEntry

logger = logging.getLogger("malintent.logs")
router = APIRouter()


@router.get("/logs", response_model=List[ThreatLogEntry])
async def get_logs(
    limit:    int          = Query(50,   ge=1,    le=200,  description="Max entries to return"),
    offset:   int          = Query(0,    ge=0,             description="Pagination offset"),
    decision: Optional[str] = Query(None,                  description="Filter: ALLOW / FLAG / BLOCK"),
    db:       Session      = Depends(get_db),
) -> List[ThreatLogEntry]:
    """
    Return paginated ThreatLog entries, newest first.

    Query parameters:
      limit    — max rows (1–200, default 50)
      offset   — skip this many rows (for pagination)
      decision — optional filter: ALLOW | FLAG | BLOCK

    Used by:
      - Live Threat Feed (main dashboard) — polls this endpoint every 3 seconds
      - Threat Analysis page — full filterable table
    """
    query = db.query(ThreatLog)

    if decision:
        query = query.filter(ThreatLog.decision == decision.upper())

    entries = (
        query
        .order_by(desc(ThreatLog.timestamp))
        .offset(offset)
        .limit(limit)
        .all()
    )

    logger.debug("Returning %d log entries (decision=%s)", len(entries), decision)

    return [ThreatLogEntry.model_validate(entry) for entry in entries]
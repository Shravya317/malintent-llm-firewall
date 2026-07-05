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

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from models import ThreatLog, ActionLog
from schemas import (
    ThreatLogEntry,
    LogDecisionUpdateRequest,
    LogDecisionUpdateResponse,
)

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

    result = []
    for entry in entries:
        dto = ThreatLogEntry.model_validate(entry)
        dto.prompt_full = entry.scrubbed_text  # Map the stored prompt to the frontend contract
        result.append(dto)
    return result


@router.put("/logs/{log_id}/decision", response_model=LogDecisionUpdateResponse)
async def update_log_decision(
    log_id: int,
    request: LogDecisionUpdateRequest,
    db: Session = Depends(get_db),
) -> LogDecisionUpdateResponse:
    """
    Human review endpoint used by the False Positive Review Queue.

    Allows an analyst to override the firewall's original decision after
    manual review.

    Valid decisions:
      - ALLOW
      - FLAG
      - BLOCK
    """

    log_entry = (
        db.query(ThreatLog)
        .filter(ThreatLog.id == log_id)
        .first()
    )

    if log_entry is None:
        raise HTTPException(
            status_code=404,
            detail=f"ThreatLog entry {log_id} not found.",
        )

    log_entry.decision = request.human_decision

    db.commit()
    db.refresh(log_entry)

    logger.info(
        "Human review updated ThreatLog %s → %s",
        log_id,
        request.human_decision,
    )

    return LogDecisionUpdateResponse(
        status="updated",
        log_id=log_entry.id,
        decision=log_entry.decision,
    )

@router.get("/action_logs")
async def get_action_logs(
    limit:    int          = Query(50,   ge=1,    le=200,  description="Max entries to return"),
    offset:   int          = Query(0,    ge=0,             description="Pagination offset"),
    db:       Session      = Depends(get_db),
):
    """
    Return paginated ActionLog entries for the SEL Audit page.
    """
    query = db.query(ActionLog)

    entries = (
        query
        .order_by(desc(ActionLog.timestamp))
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Return dicts directly for simplicity since schemas.py might not have ActionLogEntry yet
    return [
        {
            "id": entry.id,
            "timestamp": entry.timestamp,
            "user_id": entry.user_id,
            "session_role": entry.session_role,
            "tool_called": entry.tool_called,
            "query_executed": entry.query_executed,
            "fields_masked": entry.fields_masked,
            "decision": entry.decision,
            "denial_reason": entry.denial_reason,
            "threat_log_id": entry.threat_log_id
        }
        for entry in entries
    ]
"""
routers/logs.py — GET /api/v1/logs

Returns paginated, filterable ThreatLog entries for:
  - The Live Threat Feed on the main dashboard (last 50 entries, no filter)
  - The Threat Analysis forensics page (filtered by decision, date range, etc.)

The PII-scrubbed prompt text (scrubbed_text) is mapped to the prompt_full
response field so the forensic dashboard can render highlighted threat
analysis.  Only PII-redacted text is ever served — raw prompts are never
stored or returned.
"""

from __future__ import annotations

import logging
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db, encrypt_field, decrypt_field
from models import ThreatLog, ActionLog, Configuration
import json
from schemas import (
    ThreatLogEntry,
    LogDecisionUpdateRequest,
    LogDecisionUpdateResponse,
    ActionLogEntry,
)

logger = logging.getLogger("malintent.logs")
router = APIRouter()


@router.get("/logs", response_model=List[ThreatLogEntry])
async def get_logs(
    limit: int = Query(50, ge=1, le=200, description="Max entries to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    decision: Optional[str] = Query(None, description="Filter: ALLOW / FLAG / BLOCK"),
    db: Session = Depends(get_db),
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
        query.order_by(desc(ThreatLog.timestamp)).offset(offset).limit(limit).all()
    )

    logger.debug("Returning %d log entries (decision=%s)", len(entries), decision)

    result = []
    for entry in entries:
        dto = ThreatLogEntry.model_validate(entry)
        dto.prompt_full = entry.scrubbed_text
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

    log_entry = db.query(ThreatLog).filter(ThreatLog.id == log_id).first()

    if log_entry is None:
        raise HTTPException(
            status_code=404,
            detail=f"ThreatLog entry {log_id} not found.",
        )

    previous_decision = log_entry.decision
    log_entry.decision = request.human_decision

    if request.human_decision == "ALLOW" and previous_decision in ("FLAG", "BLOCK"):
        # False Positive Feedback Loop (Option B)
        # Add the exact prompt text to the custom rules allowlist to prevent future flags
        try:
            custom_rules_config = (
                db.query(Configuration)
                .filter(Configuration.key == "custom_rules")
                .first()
            )
            if custom_rules_config:
                custom_rules = json.loads(
                    decrypt_field(db, custom_rules_config.encrypted_value)
                )
            else:
                custom_rules = {"allowlist": [], "blocklist": []}

            # Create a regex that exactly matches this prompt (ignoring case)
            escaped_prompt = f"^{re.escape(log_entry.scrubbed_text)}$"

            if escaped_prompt not in custom_rules.setdefault("allowlist", []):
                custom_rules["allowlist"].append(escaped_prompt)

                encrypted_rules = encrypt_field(db, json.dumps(custom_rules))
                if custom_rules_config:
                    custom_rules_config.encrypted_value = encrypted_rules
                else:
                    db.add(
                        Configuration(
                            key="custom_rules", encrypted_value=encrypted_rules
                        )
                    )

                logger.info(
                    "Added false positive prompt to custom_rules allowlist (ThreatLog %s).",
                    log_id,
                )
        except Exception as e:
            logger.error(
                "Failed to update custom_rules for false positive feedback: %s", e
            )

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


@router.get("/action_logs", response_model=List[ActionLogEntry])
async def get_action_logs(
    limit: int = Query(50, ge=1, le=200, description="Max entries to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
) -> List[ActionLogEntry]:
    """
    Return paginated ActionLog entries for the SEL Audit page.
    """
    query = db.query(ActionLog)

    entries = (
        query.order_by(desc(ActionLog.timestamp)).offset(offset).limit(limit).all()
    )

    return [ActionLogEntry.model_validate(entry) for entry in entries]

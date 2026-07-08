"""
sel/action_audit_logger.py — SEL Module 5: Action Audit Logger

Completes the five-module Secure Execution Layer:
  Module 1 — Tool Access Controller
  Module 2 — Dynamic Data Masking
  Module 3 — Secret Protection Engine
  Module 4 — Permission Validator
  Module 5 — Action Audit Logger

Writes one ActionLog row per SEL decision, recording what the LLM actually
attempted to do after being allowed through the input firewall — this is the
"Action Log" half of the project's two-log audit trail described in the
project bible (Feature 4): ThreatLog answers "was this prompt malicious?",
ActionLog answers "what did the LLM do after it was allowed through?"

Design note — why this is a class that takes a Session, while
ToolAccessController and PermissionValidator are stateless singletons:
  Those two modules are explicitly documented as stateless and thread-safe so
  a single instance can be shared across all FastAPI worker threads. A
  SQLAlchemy Session is request-scoped (see database.get_db) and is NOT
  thread-safe to share across requests. So ActionAuditLogger is intentionally
  built fresh per request — exactly like ThreatLog writes already are in
  routers/scan.py's scan_input() — rather than being a process-wide singleton.

Completeness requirement:
  Every decision branch — both "allowed through" AND "denied" — must produce
  a log row. A logger that only records denials is not a complete audit
  trail; the inverse-case test in test_sel_end_to_end.py exists specifically
  to catch that mistake.
"""

from __future__ import annotations

import json
import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from models import ActionLog

logger = logging.getLogger("malintent.sel.action_audit_logger")

_VALID_OUTCOMES = ("PERMITTED", "DENIED")


class ActionAuditLogger:
    """
    Writes ActionLog rows for SEL tool-call decisions.

    Usage
    -----
        audit_logger = ActionAuditLogger(db=db_session)
        audit_logger.log(
            tool_called="database",
            outcome="DENIED",
            user_id="user_42",
            session_role="customer",
            query_executed="SELECT * FROM users",
            denial_reason="Table 'users' is not in the permitted tables list",
        )
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def log(
        self,
        *,
        tool_called: str,
        outcome: str,
        session_role: str,
        user_id: Optional[str] = None,
        query_executed: Optional[str] = None,
        fields_masked: Optional[List[str]] = None,
        masking_rule: Optional[str] = None,
        raw_response: Optional[str] = None,
        masked_response: Optional[str] = None,
        denial_reason: Optional[str] = None,
        threat_log_id: Optional[int] = None,
    ) -> ActionLog:
        """
        Persist one ActionLog row and return the committed ORM object.

        Parameters
        ----------
        tool_called    : the tool/resource name (e.g. "database", "web_search").
        outcome        : "PERMITTED" or "DENIED" — matches ActionLog.decision.
        session_role   : the caller's session role (admin/employee/customer).
        user_id        : opaque session token — never a real name/email.
        query_executed : the exact query/API call attempted, e.g. the
                         (possibly rewritten) SQL string or endpoint URL.
        fields_masked  : list of field names Dynamic Data Masking redacted in
                         this tool's response (e.g. ["phone", "email"]),
                         if this log entry is being written for a masking
                         decision rather than a TAC/permission decision.
        masking_rule   : which masking rule applied (e.g. "phone", "card",
                         "email"). ActionLog has no dedicated masking_rule
                         column (see models.py) — when provided, it is folded
                         into the fields_masked JSON payload rather than
                         silently dropped (see _serialise_masked_fields).
        denial_reason  : human-readable cause, required in spirit when
                         outcome == "DENIED" (not enforced, since an upstream
                         caller may legitimately have no further detail, but
                         omitting it weakens the forensic record).
        threat_log_id  : optional FK back to the ThreatLog row that allowed
                         this prompt through in the first place, linking the
                         two audit trails for a single request.

        Raises
        ------
        ValueError
            If outcome is not "PERMITTED" or "DENIED" — fail loudly rather
            than silently writing a malformed audit row.
        """
        if outcome not in _VALID_OUTCOMES:
            raise ValueError(
                f"outcome must be one of {_VALID_OUTCOMES}, got {outcome!r}"
            )

        entry = ActionLog(
            tool_called=tool_called,
            query_executed=query_executed,
            fields_masked=self._serialise_masked_fields(fields_masked, masking_rule),
            raw_response=raw_response,
            masked_response=masked_response,
            user_id=user_id,
            session_role=session_role,
            decision=outcome,
            denial_reason=denial_reason if outcome == "DENIED" else None,
            threat_log_id=threat_log_id,
        )

        try:
            self.db.add(entry)
            self.db.commit()
            self.db.refresh(entry)
        except Exception:
            self.db.rollback()
            logger.exception(
                "Failed to write ActionLog row: tool=%s outcome=%s role=%s user_id=%s",
                tool_called,
                outcome,
                session_role,
                user_id,
            )
            raise

        logger.info(
            "ActionLog #%s: tool=%s outcome=%s role=%s user_id=%s",
            entry.id,
            tool_called,
            outcome,
            session_role,
            user_id,
        )
        return entry

    @staticmethod
    def _serialise_masked_fields(
        fields_masked: Optional[List[str]],
        masking_rule: Optional[str],
    ) -> Optional[str]:
        """
        Serialise the masked-fields + rule into the single ActionLog.fields_masked
        Text column as JSON: {"fields": [...], "rule": "..."}.

        Returns None when there is nothing to record (e.g. a TAC/permission
        decision with no associated masking event), so the column stays NULL
        rather than storing an empty/misleading JSON blob.
        """
        if not fields_masked and not masking_rule:
            return None
        return json.dumps(
            {
                "fields": fields_masked or [],
                "rule": masking_rule or "none",
            }
        )

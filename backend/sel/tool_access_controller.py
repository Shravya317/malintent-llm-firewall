"""
sel/tool_access_controller.py — Tool call whitelist enforcement for the SEL.

The Tool Access Controller (TAC) is the SEL's second line of defence.  It sits
between the LLM and every external tool it is allowed to call (databases, APIs,
filesystem, calculators, etc.) and enforces a developer-defined whitelist.

Design principle:
  Even if a malicious prompt passes the three-layer input firewall and reaches
  the LLM, and even if the LLM follows the injected instruction and attempts a
  harmful tool call — the TAC ensures that call cannot succeed.

  "An injected prompt that commands the LLM to 'dump the users table' hits this
  wall regardless of how convincingly it was phrased." — Project Bible, §Feature 10

Week 4 scope:
  This file builds the core whitelist logic and validate() method.  Integration
  with actual LLM function-calling output (i.e. intercepting real tool call
  JSON from the LLM) happens in Week 7 when the full SEL pipeline is wired.

  The validate() method is complete and tested now.  Week 7 is wiring, not
  invention.

Tool whitelist structure:
  {
    "tool_name": {
      "allowed_operations": {"OP1", "OP2"},   # e.g. {"SELECT"} for DB
      "allowed_tables":     {"tbl1", "tbl2"},  # optional: table-level guard for DB
    }
  }

Anything NOT explicitly listed is DENIED by default.  This is a whitelist, not
a blacklist — the security posture is deny-by-default.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, Optional, Set

logger = logging.getLogger("malintent.sel.tac")


# ── TOOL WHITELIST ────────────────────────────────────────────────────────────
# Developer-defined at deployment time.  In Week 6 this will be loadable from
# the Configuration table so administrators can adjust it via the UI without a
# server restart.  For now it is hardcoded to sensible, conservative defaults.
#
# Security rationale for the database whitelist:
#   - Only SELECT is permitted (never INSERT / UPDATE / DELETE / DROP).
#   - Only "accounts", "products", and "faq" tables are accessible.
#   - "users" table is intentionally excluded — it contains personal data that
#     the LLM should never see in full.
#   - Dynamic Data Masking (Week 7) will further redact sensitive fields even in
#     the allowed tables before the LLM receives the response.

TOOL_WHITELIST: Dict[str, Dict[str, Set[str]]] = {
    "database": {
        "allowed_operations": {"SELECT"},
        "allowed_tables":     {"accounts", "products", "faq"},
        # NOT included: "users", "admin_config", "audit_log" — too sensitive
    },
    "web_search": {
        "allowed_operations": {"GET"},
        # No table restriction — web search has no table concept
    },
    "calculator": {
        "allowed_operations": {"evaluate"},
    },
    # Everything else is implicitly DENIED.
    # To add a new tool: add an entry here with its allowed_operations.
    # Never add filesystem, shell, or code_exec tools to this whitelist.
}


# ── RESULT TYPE ───────────────────────────────────────────────────────────────

@dataclass
class ToolCallDecision:
    """
    Result of a TAC validation check.

    permitted    : True → the tool call is allowed to proceed.
                   False → the call is blocked; denial_reason explains why.
    tool         : the tool name that was checked.
    operation    : the operation that was checked.
    denial_reason: human-readable explanation, populated only when permitted=False.
                   Used in ActionLog and in the API response.
    params       : the original params dict, attached for logging convenience.
    """
    permitted:     bool
    tool:          str
    operation:     str
    denial_reason: Optional[str]      = None
    params:        Optional[dict]     = field(default=None, repr=False)


# ── CONTROLLER ────────────────────────────────────────────────────────────────

class ToolAccessController:
    """
    Stateless whitelist enforcer for LLM tool calls.

    Thread-safe: contains no mutable state.  A single instance can be shared
    across all FastAPI worker threads.

    The validate() method is the single entry point.  It makes a binary
    PERMITTED / DENIED decision in O(1) time (dict lookup + set membership).

    In Week 7 this class will be called by the SEL middleware that intercepts
    the LLM's function-calling output JSON before it is dispatched to the
    actual tool.  The LLM never receives the TAC's deny response — the SEL
    handles it and returns an appropriate error to the LLM instead.
    """

    def validate(
        self,
        tool:      str,
        operation: str,
        params:    Optional[dict] = None,
    ) -> ToolCallDecision:
        """
        Check whether a tool call is permitted under the whitelist.

        Args:
            tool:      the name of the tool being called (e.g. "database").
            operation: the specific operation (e.g. "SELECT", "GET").
            params:    optional parameter dict — used only for table-level checks
                       and logging.  NOT used in the basic permit/deny decision.

        Returns:
            ToolCallDecision with permitted=True or permitted=False and a reason.

        Check sequence (fail-fast, return at first denial):
          1. Is the tool in the whitelist?   → deny with "not in whitelist"
          2. Is the operation permitted?     → deny with "operation not permitted"
          3. (DB only) Is the table allowed? → deny with "table not permitted"
          4. All checks passed              → permit
        """
        # ── Check 1: Tool in whitelist ────────────────────────────────────────
        if tool not in TOOL_WHITELIST:
            reason = f"Tool '{tool}' is not in the whitelist"
            logger.warning("TAC DENIED: tool=%s operation=%s — %s", tool, operation, reason)
            return ToolCallDecision(
                permitted=False,
                tool=tool,
                operation=operation,
                denial_reason=reason,
                params=params,
            )

        tool_config = TOOL_WHITELIST[tool]

        # ── Check 2: Operation permitted for this tool ─────────────────────────
        allowed_ops: Set[str] = tool_config.get("allowed_operations", set())
        if operation.upper() not in {op.upper() for op in allowed_ops}:
            reason = f"Operation '{operation}' not permitted for tool '{tool}'"
            logger.warning("TAC DENIED: tool=%s operation=%s — %s", tool, operation, reason)
            return ToolCallDecision(
                permitted=False,
                tool=tool,
                operation=operation,
                denial_reason=reason,
                params=params,
            )

        # ── Check 3: Table-level guard (database tool only) ───────────────────
        if tool == "database" and params:
            table: str = params.get("table", "").lower().strip()
            if table:
                allowed_tables: Set[str] = {
                    t.lower() for t in tool_config.get("allowed_tables", set())
                }
                if table not in allowed_tables:
                    reason = (
                        f"Table '{table}' is not in the permitted tables list "
                        f"(allowed: {sorted(allowed_tables)})"
                    )
                    logger.warning(
                        "TAC DENIED: tool=%s operation=%s table=%s — %s",
                        tool, operation, table, reason,
                    )
                    return ToolCallDecision(
                        permitted=False,
                        tool=tool,
                        operation=operation,
                        denial_reason=reason,
                        params=params,
                    )

        # ── All checks passed ─────────────────────────────────────────────────
        logger.debug(
            "TAC PERMITTED: tool=%s operation=%s params=%s", tool, operation, params
        )
        return ToolCallDecision(
            permitted=True,
            tool=tool,
            operation=operation,
            params=params,
        )

    def get_whitelist_summary(self) -> dict:
        """
        Return a JSON-serialisable summary of the whitelist.
        Used by the Permission Roles tab in the frontend (Week 6) to display
        which tools are enabled and their permitted operations.
        """
        return {
            tool: {
                "allowed_operations": sorted(cfg.get("allowed_operations", set())),
                "allowed_tables":     sorted(cfg.get("allowed_tables", set())),
            }
            for tool, cfg in TOOL_WHITELIST.items()
        }
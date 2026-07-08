"""
backend/tests/test_sel_end_to_end.py — the single most important test
for the SEL.

Proves the full SEL chain works together, not just each module in isolation:

  1. A simulated LLM tool-call attempt for an unpermitted resource
     ("customer" role querying the "users" table) is DENIED.
  2. The denial is recorded in ActionLog with every required field populated
     (Feature 4 / Module 5 in the project bible: tool called, exact query,
     user ID, session role, timestamp, outcome).
  3. The inverse case — a PERMITTED call for the same role — is ALSO logged,
     proving the Action Audit Logger is a complete audit trail and not a
     denial-only logger.

This exercises routers.scan.process_tool_call(), the orchestration
function that ties together SEL Module 4 (role-scope check, where
applicable), SEL Module 1 (Tool Access Controller whitelist), and SEL
Module 5 (Action Audit Logger) — see that function's docstring for why the
logging call lives there rather than inside the stateless TAC/Permission
Validator classes themselves.

Self-contained DB fixture: this file builds its own in-memory SQLite session
via models.Base rather than assuming a project-wide `db_session` fixture
exists in conftest.py, so it runs correctly regardless of what earlier
conftest.py does or doesn't define. If your project already has a
shared `db_session` fixture, swap the local one below for that — the test
bodies don't need to change either way.
"""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import ActionLog
from routers.scan import process_tool_call
from sel.tool_access_controller import ToolAccessController


@pytest.fixture()
def db_session():
    """
    Fresh in-memory SQLite database per test — fast, isolated, no cross-test
    state leakage. Mirrors the schema in models.py exactly via Base.metadata.
    """
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


# ── THE CORE TEST — unpermitted tool call denied and logged ──────────────────


def test_unpermitted_tool_call_is_denied_and_logged(db_session):
    """
    Simulated injected instruction: an LLM, having somehow been steered by a
    prompt that passed the input firewall, attempts `SELECT * FROM users` as
    a "customer"-role session. "users" is excluded from the TAC whitelist
    (sel/tool_access_controller.py) specifically because it contains personal
    data the LLM should never see in full — this is precisely the wall the
    project bible says an injected prompt "hits ... regardless of how
    convincingly it was phrased."
    """
    logger_entries_before = db_session.query(ActionLog).count()

    decision = process_tool_call(
        tool="database",
        operation="SELECT",
        db=db_session,
        session_role="customer",
        user_id="test_user_42",
        params={"table": "users"},
    )

    # ── (1) The Tool Access Controller stopped it ────────────────────────────
    assert decision.permitted is False
    assert "users" in (decision.denial_reason or "")

    # ── (2) Exactly one new ActionLog row was written ────────────────────────
    logger_entries_after = db_session.query(ActionLog).count()
    assert logger_entries_after == logger_entries_before + 1

    # ── (3) Every required field is populated correctly ──────────────────────
    latest = db_session.query(ActionLog).order_by(ActionLog.id.desc()).first()
    assert latest.id is not None
    assert latest.decision == "DENIED"
    assert latest.tool_called == "database"
    assert latest.user_id == "test_user_42"
    assert latest.session_role == "customer"
    assert latest.timestamp is not None
    assert latest.denial_reason is not None and "users" in latest.denial_reason
    assert latest.query_executed is not None and "users" in latest.query_executed


def test_unpermitted_tool_call_denied_by_role_scope_before_reaching_tac(db_session):
    """
    A subtler case: "accounts" IS in the TAC whitelist (deployment-wide), but
    the "customer" role has no db:accounts scope under PermissionValidator
    (sel/permission_validator.py — only "scan" is granted to customers). This
    proves SEL Module 4's role-scope check is actually wired into the chain,
    not just the deployment-wide TAC whitelist — a customer should not reach
    "accounts" even though "accounts" is a generally-permitted table.
    """
    decision = process_tool_call(
        tool="database",
        operation="SELECT",
        db=db_session,
        session_role="customer",
        user_id="test_user_77",
        params={"table": "accounts"},
    )

    assert decision.permitted is False
    assert "scope" in (decision.denial_reason or "").lower()

    latest = db_session.query(ActionLog).order_by(ActionLog.id.desc()).first()
    assert latest.id is not None
    assert latest.decision == "DENIED"
    assert latest.session_role == "customer"
    assert "db:accounts" in (latest.denial_reason or "")


# ── THE INVERSE CASE — a permitted call is logged too ─────────────────────────


def test_permitted_tool_call_is_logged_too(db_session):
    """
    A logger that only logs denials is not a complete audit trail.
    "employee" has db:accounts scope
    (sel/permission_validator.py) and "accounts" is TAC-whitelisted for
    SELECT — this call should be permitted AND logged.
    """
    logger_entries_before = db_session.query(ActionLog).count()

    decision = process_tool_call(
        tool="database",
        operation="SELECT",
        db=db_session,
        session_role="employee",
        user_id="test_user_emp_1",
        params={"table": "accounts"},
    )

    assert decision.permitted is True

    logger_entries_after = db_session.query(ActionLog).count()
    assert logger_entries_after == logger_entries_before + 1

    latest = db_session.query(ActionLog).order_by(ActionLog.id.desc()).first()
    assert latest.id is not None
    assert latest.decision == "PERMITTED"
    assert latest.tool_called == "database"
    assert latest.user_id == "test_user_emp_1"
    assert latest.session_role == "employee"
    assert latest.denial_reason is None
    assert latest.timestamp is not None


def test_admin_permitted_for_users_table_scope_but_still_denied_by_tac(db_session):
    """
    Edge case worth pinning down explicitly: "admin" DOES have db:users scope
    under PermissionValidator, but "users" is still excluded from the TAC's
    deployment-wide whitelist entirely (sel/tool_access_controller.py — "too
    sensitive" regardless of role). This proves the two gates are genuinely
    independent layers: passing the role-scope check does not bypass the
    TAC. Defence in depth only works if neither check can substitute for
    the other.
    """
    decision = process_tool_call(
        tool="database",
        operation="SELECT",
        db=db_session,
        session_role="admin",
        user_id="test_admin_1",
        params={"table": "users"},
    )

    assert decision.permitted is False
    # Denied by the TAC (table not in TOOL_WHITELIST's allowed_tables), not
    # by the role-scope check this time — admin has db:users scope.
    assert "permitted tables" in (decision.denial_reason or "").lower()

    latest = db_session.query(ActionLog).order_by(ActionLog.id.desc()).first()
    assert latest.id is not None
    assert latest.decision == "DENIED"
    assert latest.session_role == "admin"


# ── SANITY: the TAC itself still behaves correctly in isolation ──────────────
# (Not a SEL-chain test — confirms the module wasn't broken by the
# orchestration layer sitting on top of it.)


def test_tool_access_controller_standalone_still_works():
    tac = ToolAccessController()
    permitted = tac.validate(
        tool="database", operation="SELECT", params={"table": "accounts"}
    )
    denied = tac.validate(
        tool="database", operation="DELETE", params={"table": "accounts"}
    )

    assert permitted.permitted is True
    assert denied.permitted is False

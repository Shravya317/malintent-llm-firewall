"""
backend/tests/conftest.py
=========================
Pytest fixtures for the MalIntent test suite.

Week 7 change: replaced the in-memory SQLite engine with a real PostgreSQL
connection.  Tests run against the same engine (postgres:16) as both the local
Docker dev environment and Supabase production, eliminating the entire class of
"works in tests, breaks in prod" bugs caused by SQLite dialect differences.

Requirements
------------
The local postgres:16 container must be running before the test session starts:

    docker compose up db -d          # start only the db service
    pytest backend/tests/ -v         # run the full suite

Or, inside the running compose stack:

    docker compose exec backend pytest tests/ -v --tb=short

Environment variable
--------------------
DATABASE_URL defaults to the local Docker compose Postgres URL.
Set it to a separate test database URL if you want to isolate test data
from your dev database.

Test isolation strategy
-----------------------
Each test function gets its own connection and transaction.  After the test
completes, the transaction is rolled back — no state leaks between tests,
no cleanup teardown needed, and the session-scoped engine table creation
only runs once per test session.
"""

from __future__ import annotations

import os
import hashlib
from datetime import datetime, timedelta
from typing import Generator

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from models import Base, ThreatLog, ActionLog, Configuration
from database import PG_CRYPTO_KEY, encrypt_field, decrypt_field

# ---------------------------------------------------------------------------
# Database URL for tests
# ---------------------------------------------------------------------------

TEST_DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://malintent:password@localhost:5432/malintent",
)
"""
Use the same DATABASE_URL env var as the application.
Point it at a dedicated test database if you want full isolation:
    TEST_DATABASE_URL=postgresql://malintent:password@localhost:5432/malintent_test
"""

# ---------------------------------------------------------------------------
# Session-scoped engine — created once per pytest session
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def engine():
    """
    Create a SQLAlchemy engine connected to the test Postgres database.
    Creates all tables at session start and drops them at session end.
    """
    eng = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)

    # Verify pgcrypto is available before the test session starts.
    with eng.connect() as conn:
        result = conn.execute(
            text(
                "SELECT pgp_sym_decrypt("
                "  pgp_sym_encrypt('test', 'key'), 'key'"
                ") AS check"
            )
        )
        assert result.scalar() == "test", (
            "pgcrypto smoke test failed — run migrations/007_enable_pgcrypto.sql "
            "against your test database."
        )

    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)


# ---------------------------------------------------------------------------
# Function-scoped session — each test gets its own rolled-back transaction
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def db(engine) -> Generator[Session, None, None]:
    """
    Yield a SQLAlchemy session wrapped in a transaction that is rolled back
    after each test function.  This keeps tests fully isolated without
    requiring explicit teardown.
    """
    connection = engine.connect()
    transaction = connection.begin()
    TestingSession = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    session = TestingSession()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# Helper fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_threat_log(db: Session) -> ThreatLog:
    """A minimal ThreatLog row committed to the test transaction."""
    log = ThreatLog(
        timestamp=datetime.utcnow(),
        payload_hash=hashlib.sha256(b"test prompt").hexdigest(),
        risk_score=85,
        decision="BLOCK",
        attack_category="direct_injection",
        triggered_layers=["A", "B"],
        layer_a_score=0.9,
        layer_b_score=0.95,
        layer_c_score=0.88,
        payload_length=42,
        latency_ms=73,
    )
    db.add(log)
    db.flush()
    return log


@pytest.fixture
def sample_allow_log(db: Session) -> ThreatLog:
    """A ThreatLog row with an ALLOW decision."""
    log = ThreatLog(
        timestamp=datetime.utcnow() - timedelta(minutes=5),
        payload_hash=hashlib.sha256(b"safe prompt").hexdigest(),
        risk_score=12,
        decision="ALLOW",
        attack_category=None,
        triggered_layers=[],
        payload_length=18,
        latency_ms=55,
    )
    db.add(log)
    db.flush()
    return log


@pytest.fixture
def sample_action_log(db: Session, sample_allow_log: ThreatLog) -> ActionLog:
    """An ActionLog row linked to a ALLOW ThreatLog."""
    action = ActionLog(
        timestamp=datetime.utcnow(),
        threat_log_id=sample_allow_log.id,
        user_id="user-hash-abc123",
        user_role="Customer",
        tool_name="database_query",
        query_executed="SELECT balance FROM accounts WHERE user_id = 'user-hash-abc123'",
        masked_fields=[{"field": "phone", "rule": "partial_mask"}],
        permission_granted=True,
        outcome="PERMITTED",
        latency_ms=12,
    )
    db.add(action)
    db.flush()
    return action


@pytest.fixture
def encrypted_config(db: Session) -> Configuration:
    """A Configuration row with a pgcrypto-encrypted value."""
    ciphertext = encrypt_field(db, "sk-test-openai-key-abc123")
    config = Configuration(
        key_name="test_api_key",
        value_encrypted=ciphertext,
        updated_at=datetime.utcnow(),
    )
    db.add(config)
    db.flush()
    return config
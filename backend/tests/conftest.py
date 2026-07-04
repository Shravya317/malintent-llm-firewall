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

Field-name note (fixed after Week 7 review)
--------------------------------------------
These fixtures were originally written against field names that did not
match the real models.py schema (e.g. "triggered_layers" instead of
"layers_triggered", "key_name" instead of "key", "user_role" instead of
"session_role"). They have been corrected to match models.py exactly.

Schema-drift fix (post Week 7 review)
--------------------------------------
The session-scoped `engine` fixture previously only called
Base.metadata.create_all(eng). SQLAlchemy's create_all() is additive-only:
if a table from an older schema version is already sitting in the local
Docker volume (e.g. a "configuration" table without the "key" column),
create_all() leaves it untouched and every test that depends on the
current schema fails with errors like:

    psycopg2.errors.UndefinedColumn: column "key" of relation
    "configuration" does not exist

We now call drop_all() immediately before create_all() at session start,
so every test run gets a byte-for-byte fresh schema regardless of what
was left over in the volume from a previous run. This only ever touches
TEST_DATABASE_URL (the local Docker Postgres on 127.0.0.1:5433) — it has
no effect on Supabase/production, which is addressed via a separate
DATABASE_URL and is never used by this fixture.
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
    "postgresql://malintent:MalIntent_PromptInjectionFirewall@127.0.0.1:5433/malintent",
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

    Drops and recreates all tables at session start (guarding against
    schema drift from a stale Docker volume), and drops them again at
    session end.
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

    # Always start from a known-clean schema. create_all() alone is not
    # enough here: it will not alter an existing table left over from an
    # older model version, which is exactly what caused the Week 7
    # "column does not exist" failures.
    Base.metadata.drop_all(eng)
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
        payload_length=42,
        risk_score=85,
        decision="BLOCK",
        attack_category="direct_injection",
        layers_triggered="A,B",
        layer_a_matched=True,
        layer_b_confidence=0.95,
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
        payload_length=18,
        risk_score=12,
        decision="ALLOW",
        attack_category=None,
        layers_triggered="",
        layer_a_matched=False,
        layer_b_confidence=0.0,
        latency_ms=55,
    )
    db.add(log)
    db.flush()
    return log


@pytest.fixture
def sample_action_log(db: Session, sample_allow_log: ThreatLog) -> ActionLog:
    """An ActionLog row linked to an ALLOW ThreatLog."""
    action = ActionLog(
        timestamp=datetime.utcnow(),
        threat_log_id=sample_allow_log.id,
        user_id="user-hash-abc123",
        session_role="customer",
        tool_called="database_query",
        query_executed="SELECT balance FROM accounts WHERE user_id = 'user-hash-abc123'",
        fields_masked='[{"field": "phone", "rule": "partial_mask"}]',
        decision="PERMITTED",
    )
    db.add(action)
    db.flush()
    return action


@pytest.fixture
def encrypted_config(db: Session) -> Configuration:
    """A Configuration row with a pgcrypto-encrypted value."""
    ciphertext = encrypt_field(db, "sk-test-openai-key-abc123")
    config = Configuration(
        key="test_api_key",
        encrypted_value=ciphertext,
        updated_at=datetime.utcnow(),
    )
    db.add(config)
    db.flush()
    return config
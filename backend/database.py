"""
backend/database.py
=======================
Uses a single PostgreSQL engine across dev (local Docker) and prod (Supabase).

Environment variables required
-------------------------------
DATABASE_URL   - SQLAlchemy-compatible Postgres URL.
                 Dev:  postgresql://malintent:<password>@localhost:5432/malintent
                 Prod: Supabase Transaction Pooler URL (port 6543)
PG_CRYPTO_KEY  - 32-byte hex secret for pgcrypto field-level encryption on the
                 configuration table.

Encryption layers
-----------------
Layer (DB-layer): pgcrypto pgp_sym_encrypt / pgp_sym_decrypt on the
                       configuration.value_encrypted bytea column.

An attacker would need the PG_CRYPTO_KEY, which is an environment-only secret
that never touches disk.
"""

import os
import logging
from contextlib import contextmanager

from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session, declarative_base

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SQLAlchemy declarative base — all ORM models (models.py) inherit from this.
# Must be defined here (not in models.py) to avoid circular imports:
#   database.py defines Base  ->  models.py imports Base  ->  database.init_db()
#   imports models to populate Base.metadata.
# ---------------------------------------------------------------------------
Base = declarative_base()

# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------

_raw_db_url: str = os.environ.get("DATABASE_URL", "")

if not _raw_db_url:
    raise RuntimeError(
        "DATABASE_URL environment variable is empty or not set. "
        "Set it in Render -> Environment -> Environment Variables."
    )

# Guard against accidental "DATABASE_URL=postgresql://..." in the value
# (Render env var value should NOT include the key name).
if _raw_db_url.startswith("DATABASE_URL="):
    _raw_db_url = _raw_db_url[len("DATABASE_URL=") :]

# Fix Render/Supabase postgres:// -> postgresql:// for SQLAlchemy 1.4+
_raw_db_url = _raw_db_url.replace("postgres://", "postgresql://", 1)

DATABASE_URL: str = _raw_db_url
"""
Full Postgres connection URL.
Dev example:  postgresql://malintent:password@localhost:5432/malintent
Prod example: postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
"""

PG_CRYPTO_KEY: str = os.environ["PG_CRYPTO_KEY"]
"""
Key used by pgcrypto's pgp_sym_encrypt / pgp_sym_decrypt for field-level
column encryption on the configuration table.
Generate once with: python -c "import secrets; print(secrets.token_hex(32))"
Never reuse the dev key in production.
"""

# ---------------------------------------------------------------------------
# SQLAlchemy engine
# ---------------------------------------------------------------------------

engine = create_engine(
    DATABASE_URL,
    # pool_pre_ping reconnects transparently after Supabase connection pooler
    # drops idle connections (common on the free tier).
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    # Echo SQL only in DEBUG mode to avoid leaking query content to logs in prod.
    echo=os.getenv("SQLALCHEMY_ECHO", "false").lower() == "true",
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------


def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy session and guarantees cleanup.

    Usage in a route:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context-manager version for use outside FastAPI (scripts, tests, etc.).

    Usage:
        with get_db_context() as db:
            db.execute(...)
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# pgcrypto field-level encryption helpers
# ---------------------------------------------------------------------------


def encrypt_field(session: Session, plaintext: str) -> bytes:
    """
    Encrypt a plaintext string with pgcrypto's pgp_sym_encrypt using PG_CRYPTO_KEY.

    Returns the ciphertext as a bytes object suitable for storage in a
    LargeBinary (bytea) column.

    This call executes inside the caller's session/transaction — the caller
    is responsible for committing or rolling back.

    Example
    -------
    >>> ciphertext = encrypt_field(db, "sk-openai-secret-key")
    >>> config_row.value_encrypted = ciphertext
    >>> db.commit()
    """
    result = session.execute(
        text("SELECT pgp_sym_encrypt(:val, :key)"),
        {"val": plaintext, "key": PG_CRYPTO_KEY},
    )
    return result.scalar()


def decrypt_field(session: Session, ciphertext: bytes) -> str:
    """
    Decrypt a pgcrypto-encrypted bytea value using PG_CRYPTO_KEY.

    Raises a sqlalchemy.exc.DBAPIError (wrapping a Postgres ERROR) if the
    key is wrong or the ciphertext is corrupt — this is the intended behaviour
    and is what proves the encryption is active in verification tests.

    Example
    -------
    >>> plaintext = decrypt_field(db, config_row.value_encrypted)
    """
    result = session.execute(
        text("SELECT pgp_sym_decrypt(:val, :key)"),
        {"val": ciphertext, "key": PG_CRYPTO_KEY},
    )
    return result.scalar()


def verify_pgcrypto(session: Session) -> bool:
    """
    Smoke-test that the pgcrypto extension is installed and that a round-trip
    encrypt -> decrypt returns the original value.

    Call this at application startup to fail fast if the migration has not
    been applied to this database.

    Returns True on success, raises RuntimeError on failure.
    """
    try:
        result = session.execute(
            text(
                "SELECT pgp_sym_decrypt("
                "  pgp_sym_encrypt('malintent-pgcrypto-ok', 'probe-key'),"
                "  'probe-key'"
                ") AS round_trip"
            )
        )
        value = result.scalar()
        if value != "malintent-pgcrypto-ok":
            raise RuntimeError(f"pgcrypto round-trip mismatch: got {value!r}")
        logger.info("pgcrypto verification: OK")
        return True
    except Exception as exc:
        raise RuntimeError(
            "pgcrypto is not available on this database. "
            "Run migrations/007_enable_pgcrypto.sql and try again."
        ) from exc


# ---------------------------------------------------------------------------
# Startup helper (called from main.py lifespan)
# ---------------------------------------------------------------------------


def init_db() -> None:
    """
    Import all models so that Base.metadata is populated, then create any
    missing tables.  In production the migration files are the authoritative
    schema source; create_all() is a safety net for the dev container's
    first boot.
    """
    # Local import to avoid circular imports at module load time.
    from models import Base  # noqa: F401 — side-effect: registers all models

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified / created.")

    # Verify pgcrypto is available before accepting traffic.
    with get_db_context() as db:
        verify_pgcrypto(db)

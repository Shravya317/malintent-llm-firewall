"""
database.py — SQLAlchemy engine and session factory.

Uses SQLite in development (malintent.db in the backend/ directory).
The engine is configured with check_same_thread=False, which is required when
using SQLite with FastAPI's async request handling (different threads may hold
the same connection). This is safe here because SQLAlchemy's session factory
handles thread-local session management internally.

In production this file is swapped for a PostgreSQL+pgcrypto configuration;
the application code above this layer does not change.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

# Allow the database URL to be overridden by environment variable for production.
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./malintent.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite with FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base — all ORM models inherit from this."""
    pass


def get_db():
    """
    FastAPI dependency — yields a scoped database session and closes it
    after the request completes, whether it succeeded or raised an exception.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
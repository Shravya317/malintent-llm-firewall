"""
models.py — SQLAlchemy ORM models for MalIntent's three-table database schema.

Design principle: this schema is breach-resilient by construction.
  - ThreatLog  never stores the raw prompt text.  It stores either a PII-scrubbed
    summary (Full Logging mode) or only a SHA-256 hash (Tokenised Logging mode).
  - Configuration stores only Fernet ciphertext — never plaintext API keys or
    system context strings.
  - ActionLog records SEL tool-call decisions without echoing prompt content.

An attacker who exfiltrates the database file gets hashed payloads, redacted
metadata, and encrypted configuration values — no raw user data.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func

from database import Base


class ThreatLog(Base):
    """
    Firewall Log — one row per prompt that passes through the three-layer engine.

    Storage rules (enforced in routers/scan.py before every INSERT):
      - payload_hash  : SHA-256 hex digest of the ORIGINAL prompt.  Always stored.
      - scrubbed_text : PII-scrubbed text.  Stored only in Full Logging mode;
                        NULL in Tokenised Logging mode.
      - Raw prompt text is NEVER written to this table under any logging mode.
    """

    __tablename__ = "threat_log"

    id               = Column(Integer, primary_key=True, index=True)
    timestamp        = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Breach-resilient payload fields
    payload_hash     = Column(String(64),  nullable=False)   # SHA-256 hex digest (always)
    payload_length   = Column(Integer,     nullable=False)   # char count of original
    scrubbed_text    = Column(Text,        nullable=True)    # NULL in tokenised mode

    # Detection results
    risk_score       = Column(Float,       nullable=False)
    decision         = Column(String(10),  nullable=False)   # ALLOW / FLAG / BLOCK
    attack_category  = Column(String(64),  nullable=True)    # e.g. "jailbreak"
    layers_triggered = Column(String(32),  nullable=True)    # e.g. "A,B" or "A,B,C"
    layer_a_matched  = Column(Boolean,     nullable=False, default=False)
    layer_b_confidence = Column(Float,     nullable=False, default=0.0)

    # Session metadata (no PII — user_id is an opaque session token, not a name)
    user_id          = Column(String(128), nullable=True)
    session_role     = Column(String(32),  nullable=True)    # admin / employee / customer

    # Logging mode used for this entry
    privacy_mode     = Column(String(16),  nullable=False, default="tokenised")

    # Latency for the full three-layer scan (milliseconds)
    latency_ms       = Column(Float,       nullable=True)


class ActionLog(Base):
    """
    SEL Action Log — one row per tool call the LLM attempts after being allowed
    through the firewall.

    Separate from ThreatLog by explicit design:
      - ThreatLog answers "was this prompt malicious?"
      - ActionLog answers "what did the LLM do after it was allowed through?"

    This table is used for operational forensics — understanding runtime behaviour
    rather than input classification.  Mixing these concerns in one table makes
    forensic querying harder and blurs the audit trail.
    """

    __tablename__ = "action_log"

    id              = Column(Integer,      primary_key=True, index=True)
    timestamp       = Column(DateTime(timezone=True), server_default=func.now())

    # Opaque session identifiers — never store PII in these columns
    user_id         = Column(String(128),  nullable=True)
    session_role    = Column(String(32),   nullable=False)   # admin / employee / customer

    # What the LLM tried to do
    tool_called     = Column(String(128),  nullable=False)
    query_executed  = Column(Text,         nullable=True)    # parameterised query or URL
    fields_masked   = Column(Text,         nullable=True)    # JSON list: ["phone", "email"]

    # SEL decision
    decision        = Column(String(10),   nullable=False)   # PERMITTED / DENIED
    denial_reason   = Column(String(256),  nullable=True)    # human-readable denial cause

    # Reference back to the originating firewall log entry
    threat_log_id   = Column(Integer,      nullable=True)    # FK to ThreatLog.id (loose)


class Configuration(Base):
    """
    Encrypted key-value config store for all deployment settings.

    ALL values are Fernet-encrypted by config_encryption.encrypt() BEFORE
    being written here, and decrypted by config_encryption.decrypt() AFTER
    being read.  The application layer handles encryption transparently;
    the database layer only ever sees ciphertext.

    A raw inspection of the database file (e.g. `strings malintent.db`) must
    reveal no plaintext API keys, system context strings, or other secrets.
    This is verified by test_week4.py::test_fernet_raw_db_contains_no_plaintext.
    """

    __tablename__ = "configuration"

    id              = Column(Integer,      primary_key=True, index=True)
    key             = Column(String(128),  unique=True, nullable=False)
    encrypted_value = Column(Text,         nullable=False)   # Fernet ciphertext — never plaintext
    updated_at      = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
"""
routers/config.py — PUT /api/v1/config and GET /api/v1/config/{key}

Manages the encrypted Configuration table.  Every value is Fernet-encrypted
before storage and decrypted after retrieval.  Plaintext values are held only in
Python memory during a request — they are never written to disk, never logged,
and never returned as ciphertext to the caller.

Security guarantee: a raw binary dump of malintent.db must reveal no plaintext
API keys, system context strings, or other deployment secrets.  This is verified
by test_week4.py::test_fernet_raw_db_contains_no_plaintext.

Common config keys (used by the frontend Configuration page):
  system_context    — what the LLM is supposed to do (shown in Context Settings tab)
  context_mode      — strict / balanced / developer / custom
  output_validation — "true" / "false" toggle
  api_key           — LLM provider key (stored encrypted, never shown after write)
"""

from __future__ import annotations

import logging

from cryptography.fernet import InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config_encryption import decrypt, encrypt
from database import get_db
from models import Configuration
from schemas import ConfigGetResponse, ConfigSetRequest, ConfigSetResponse

logger = logging.getLogger("malintent.config")
router = APIRouter()


@router.put("/config", response_model=ConfigSetResponse, status_code=200)
async def set_config(
    body: ConfigSetRequest,
    db:   Session = Depends(get_db),
) -> ConfigSetResponse:
    """
    Write an encrypted config value.

    The plaintext value in body.value is encrypted with Fernet before any
    database operation.  The encrypted token is what is stored; body.value is
    discarded from memory immediately after encryption.

    Behaviour: upsert — creates the row if the key does not exist, overwrites
    encrypted_value if it does.
    """
    try:
        encrypted = encrypt(body.value)
    except RuntimeError as exc:
        # FERNET_KEY not set — surface a readable 500 rather than a cryptic crash
        logger.error("Fernet key not configured: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: encryption key not available.",
        ) from exc

    existing = (
        db.query(Configuration)
        .filter(Configuration.key == body.key)
        .first()
    )

    if existing:
        existing.encrypted_value = encrypted
        logger.info("Config key '%s' updated.", body.key)
    else:
        db.add(Configuration(key=body.key, encrypted_value=encrypted))
        logger.info("Config key '%s' created.", body.key)

    db.commit()
    return ConfigSetResponse(status="ok", key=body.key)


@router.get("/config/{key}", response_model=ConfigGetResponse, status_code=200)
async def get_config(
    key: str,
    db:  Session = Depends(get_db),
) -> ConfigGetResponse:
    """
    Read a decrypted config value.

    Returns the plaintext value — ciphertext is never exposed to the caller.
    Returns 404 if the key does not exist.
    Returns 500 if the Fernet key is missing or the ciphertext has been tampered with.
    """
    row = db.query(Configuration).filter(Configuration.key == key).first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"Config key '{key}' not found.",
        )

    try:
        plaintext = decrypt(row.encrypted_value)
    except RuntimeError as exc:
        logger.error("Fernet key not configured when reading key '%s': %s", key, exc)
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: encryption key not available.",
        ) from exc
    except InvalidToken as exc:
        logger.error(
            "Fernet decryption failed for key '%s' — ciphertext may have been tampered with.",
            key,
        )
        raise HTTPException(
            status_code=500,
            detail="Decryption failed: the stored value may have been corrupted or tampered with.",
        ) from exc

    return ConfigGetResponse(key=key, value=plaintext)
"""
routers/config.py — PUT /api/v1/config and GET /api/v1/config/{key}

Manages the encrypted Configuration table.  Every value is pgcrypto-encrypted
before storage and decrypted after retrieval.  Plaintext values are held only in
Python memory during a request — they are never written to disk, never logged,
and never returned as ciphertext to the caller.

Security guarantee: a raw binary dump of malintent.db must reveal no plaintext
API keys, system context strings, or other deployment secrets.  This is verified
by database encryption tests.

Common config keys (used by the frontend Configuration page):
  system_context    — what the LLM is supposed to do (shown in Context Settings tab)
  context_mode      — strict / balanced / developer / custom
  output_validation — "true" / "false" toggle
  api_key           — LLM provider key (stored encrypted, never shown after write)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, encrypt_field, decrypt_field
from models import Configuration
from schemas import ConfigGetResponse, ConfigSetRequest, ConfigSetResponse

logger = logging.getLogger("malintent.config")
router = APIRouter()


@router.put("/config", response_model=ConfigSetResponse, status_code=200)
async def set_config(
    body: ConfigSetRequest,
    db: Session = Depends(get_db),
) -> ConfigSetResponse:
    """
    Write an encrypted config value.

    The plaintext value in body.value is encrypted with pgcrypto before any
    database operation.  The encrypted token is what is stored; body.value is
    discarded from memory immediately after encryption.

    Behaviour: upsert — creates the row if the key does not exist, overwrites
    encrypted_value if it does.
    """
    try:
        encrypted = encrypt_field(db, body.value)
    except Exception as exc:
        logger.error("Database encryption failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: database encryption failed.",
        ) from exc

    existing = db.query(Configuration).filter(Configuration.key == body.key).first()

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
    db: Session = Depends(get_db),
) -> ConfigGetResponse:
    """
    Read a decrypted config value.

    Returns the plaintext value — ciphertext is never exposed to the caller.
    Returns 404 if the key does not exist.
    Returns 500 if the encryption key is missing or the ciphertext has been tampered with.
    """
    row = db.query(Configuration).filter(Configuration.key == key).first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"Config key '{key}' not found.",
        )

    try:
        plaintext = decrypt_field(db, row.encrypted_value)
    except Exception as exc:
        logger.error("Database decryption failed for key '%s': %s", key, exc)
        raise HTTPException(
            status_code=500,
            detail="Decryption failed: the stored value may have been corrupted or tampered with.",
        ) from exc

    return ConfigGetResponse(key=key, value=plaintext)

"""
config_encryption.py — Fernet symmetric encryption for the Configuration table.

Every value written to the Configuration table is encrypted with Fernet before
it is passed to SQLAlchemy.  Values are decrypted in memory when they are read
back.  The raw database file therefore never contains plaintext API keys, system
context strings, or any other deployment secrets.

Security properties:
  - Fernet provides AES-128-CBC encryption with PKCS7 padding and an HMAC-SHA256
    authentication tag.  It detects tampering as well as providing confidentiality.
  - The encryption key is loaded exclusively from the FERNET_KEY environment
    variable.  It is never written to source code, configuration files, or the
    database itself.
  - Decrypted values are held only in Python memory during a request.  They are
    never logged or written to disk.

Breach scenario: an attacker who copies the malintent.db file without the key
receives a collection of base64-encoded ciphertext blobs — unreadable without
FERNET_KEY.

Generating a key (run once, save to backend/.env):
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from __future__ import annotations

import os
from cryptography.fernet import Fernet, InvalidToken


def _get_key() -> bytes:
    """
    Load the Fernet key from the FERNET_KEY environment variable.

    Crashes loudly with a descriptive RuntimeError if the variable is not set,
    rather than failing cryptically later.  This surfaces a misconfiguration
    immediately at the point of use rather than at import time (which would
    prevent the server from starting at all, even on endpoints that don't touch
    the config table).
    """
    key = os.getenv("FERNET_KEY")
    if not key:
        raise RuntimeError(
            "FERNET_KEY environment variable is not set.  "
            "Generate one with: "
            'python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" '
            "and add it to backend/.env"
        )
    return key.encode()


def encrypt(plaintext: str) -> str:
    """
    Encrypt a plaintext string and return the Fernet token as a UTF-8 string.

    The token is a base64url-encoded byte string that encodes the ciphertext,
    IV, and HMAC tag.  It is safe to store in a TEXT column.

    Args:
        plaintext: the value to encrypt (e.g. an API key or system context string)

    Returns:
        A Fernet token string (base64url, ~120–200 chars for typical values)

    Raises:
        RuntimeError: if FERNET_KEY is not set
    """
    f = Fernet(_get_key())
    return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt(token: str) -> str:
    """
    Decrypt a Fernet token back to the original plaintext string.

    Args:
        token: a Fernet token previously produced by encrypt()

    Returns:
        The original plaintext string

    Raises:
        RuntimeError: if FERNET_KEY is not set
        cryptography.fernet.InvalidToken: if the token has been tampered with
            or was encrypted with a different key.  The caller (router) should
            catch this and return an appropriate HTTP 500.
    """
    f = Fernet(_get_key())
    return f.decrypt(token.encode("utf-8")).decode("utf-8")
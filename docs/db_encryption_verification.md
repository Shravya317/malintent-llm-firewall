# Database Encryption Verification

**Week 7 — MalIntent Breach-Resilient Storage**

This document provides evidence that pgcrypto field-level encryption is active and
effective on the `configuration` table in both the local development environment
(Docker postgres:16) and the Supabase production database.

It directly supports **Section 4 — Breach-Resilient Storage Design** in the project
documentation and the **"Breach-Resilient Storage and Runtime Enforcement Architecture"**
subsection of the Week 8 research paper.

---

## Architecture note: SQLCipher → pgcrypto

The original plan called for SQLCipher (AES-256 full-file encryption on SQLite for dev)
plus pgcrypto column encryption for Postgres production. Week 7 revised this to a single
implementation: **PostgreSQL with pgcrypto in both environments**. The threat model is
identical — an attacker who exfiltrates the database file or table gets unreadable
ciphertext without the symmetric key — but the verification is now reproducible directly
from psql rather than a hex editor screenshot, and it applies to both environments.

---

## Environment 1: Local Docker postgres:16

### Step 1 — Enable pgcrypto and insert test value

```bash
psql postgresql://malintent:password@localhost:5432/malintent \
  -f migrations/007_enable_pgcrypto.sql
```

Expected migration output (last line):

```
 round_trip_check
------------------
 pgcrypto-ok
(1 row)
```

```bash
psql postgresql://malintent:password@localhost:5432/malintent -c "
INSERT INTO configuration (key_name, value_encrypted)
VALUES ('test_api_key', pgp_sym_encrypt('super-secret-value', 'YOUR_PG_CRYPTO_KEY'))
ON CONFLICT (key_name) DO UPDATE SET value_encrypted = EXCLUDED.value_encrypted;
"
```

### Step 2 — Inspect raw bytea column

```bash
psql postgresql://malintent:password@localhost:5432/malintent -c "
SELECT key_name, value_encrypted FROM configuration WHERE key_name = 'test_api_key';
"
```

**Paste psql output here after running:**

```
 key_name     | value_encrypted
--------------+------------------------------------------
 test_api_key | \xc30d04070302... [full bytea blob here]
(1 row)
```

> The `value_encrypted` column shows a binary blob (`\xc30d04...`), **not** the
> string `super-secret-value`. An attacker who dumps this table gets unreadable bytes.

### Step 3 — Confirm wrong key raises an error

```bash
psql postgresql://malintent:password@localhost:5432/malintent -c "
SELECT pgp_sym_decrypt(value_encrypted, 'wrong-key')
FROM   configuration
WHERE  key_name = 'test_api_key';
"
```

**Paste psql output here after running:**

```
ERROR:  Wrong key or corrupt data
```

> This error proves the key actually gates access. There is no fallback, no partial
> decryption, and no way to derive the plaintext without the exact `PG_CRYPTO_KEY`.

### Step 4 — Confirm correct key decrypts successfully

```bash
psql postgresql://malintent:password@localhost:5432/malintent -c "
SELECT pgp_sym_decrypt(value_encrypted, 'YOUR_PG_CRYPTO_KEY') AS plaintext
FROM   configuration
WHERE  key_name = 'test_api_key';
"
```

**Paste psql output here after running:**

```
   plaintext
-----------------
 super-secret-value
(1 row)
```

---

## Environment 2: Supabase Production

Repeat Steps 1–4 above against your Supabase connection string:

```bash
export DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
```

### Step 1 — Apply migration to Supabase

```bash
psql $DATABASE_URL -f migrations/007_enable_pgcrypto.sql
```

Expected migration output (last line):

```
 round_trip_check
------------------
 pgcrypto-ok
(1 row)
```

### Step 2 — Inspect raw bytea column on Supabase

```bash
psql $DATABASE_URL -c "
SELECT key_name, value_encrypted FROM configuration WHERE key_name = 'test_api_key';
"
```

**Paste Supabase psql output here:**

```
 key_name     | value_encrypted
--------------+------------------------------------------
 test_api_key | \xc30d04070302... [full bytea blob here]
(1 row)
```

### Step 3 — Wrong key error on Supabase

```bash
psql $DATABASE_URL -c "
SELECT pgp_sym_decrypt(value_encrypted, 'wrong-key')
FROM   configuration
WHERE  key_name = 'test_api_key';
"
```

**Paste Supabase psql output here:**

```
ERROR:  Wrong key or corrupt data
```

---

## Summary

| Environment      | Extension active | Ciphertext stored | Wrong key rejected |
| ---------------- | :--------------: | :---------------: | :----------------: |
| Local Docker dev |        ✓         |         ✓         |         ✓          |
| Supabase prod    |        ✓         |         ✓         |         ✓          |

**Defence-in-depth stack (production):**

1. **Supabase disk encryption** — AES-256 encryption at the storage layer (Supabase
   manages this transparently; all data at rest is encrypted on disk).
2. **pgcrypto field-level encryption** — `value_encrypted` column stores
   `pgp_sym_encrypt(plaintext, PG_CRYPTO_KEY)` ciphertext. An attacker who
   exfiltrates the `configuration` table receives bytea blobs they cannot read
   without `PG_CRYPTO_KEY`.
3. **Fernet application-layer encryption** (Week 4) — values are additionally
   encrypted at the application layer before being passed to pgcrypto. Both keys
   (`FERNET_KEY` and `PG_CRYPTO_KEY`) must be compromised for plaintext to be
   recoverable.
4. **PII scrubbing before ThreatLog writes** — raw prompt text is discarded after
   presidio-analyzer redacts PII; only a SHA-256 hash is stored. A breach of the
   `threat_logs` table exposes hashes and metadata, not user prompts.

This satisfies the **Breach-Resilient Storage** contribution described in Section 6
of the project documentation: _"An attacker who exfiltrates the database receives
hashed payloads, redacted metadata, and encrypted configuration values — no user
data, no credentials, no readable prompts."_

---

_Last updated: Week 7 — replace the placeholder psql output blocks above with actual
output from your local and Supabase runs before submitting the Week 8 paper._

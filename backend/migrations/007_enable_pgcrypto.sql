-- =============================================================================
-- migrations/007_enable_pgcrypto.sql
-- =============================================================================
-- Week 7: Enable pgcrypto extension and ensure the configuration table's
-- sensitive column stores bytea (ciphertext), not plaintext.
--
-- Apply to BOTH environments:
--   Local dev:   psql $DEV_DATABASE_URL  -f migrations/007_enable_pgcrypto.sql
--   Supabase:    psql $DATABASE_URL      -f migrations/007_enable_pgcrypto.sql
--
-- This migration is idempotent — safe to re-run.
-- =============================================================================

-- 1. Enable the pgcrypto extension.
--    Supabase free tier has pgcrypto available but not enabled by default.
--    CREATE EXTENSION IF NOT EXISTS is idempotent.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Confirm the extension is active (returns one row on success).
SELECT extname, extversion
FROM   pg_extension
WHERE  extname = 'pgcrypto';

-- 3. Ensure the configuration table exists.
--    This migration is designed to run after the table has been created by
--    SQLAlchemy's Base.metadata.create_all() or a prior migration.
--    If for any reason it doesn't exist yet, create it now.
CREATE TABLE IF NOT EXISTS configuration (
    id              SERIAL       PRIMARY KEY,
    key_name        VARCHAR(128) NOT NULL UNIQUE,
    value_encrypted BYTEA        NOT NULL,
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 4. Ensure value_encrypted is bytea (required to store pgcrypto output).
--    If it was previously TEXT (e.g. from an earlier schema), cast it.
--    This ALTER is safe to run even if the column is already BYTEA.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM   information_schema.columns
        WHERE  table_name  = 'configuration'
        AND    column_name = 'value_encrypted'
        AND    data_type   != 'bytea'
    ) THEN
        ALTER TABLE configuration
            ALTER COLUMN value_encrypted TYPE BYTEA
            USING value_encrypted::BYTEA;
        RAISE NOTICE 'value_encrypted column converted to BYTEA.';
    ELSE
        RAISE NOTICE 'value_encrypted is already BYTEA — no change needed.';
    END IF;
END
$$;

-- 5. Round-trip smoke test — confirm encrypt/decrypt works.
--    A result of 'pgcrypto-ok' proves the extension is functional.
SELECT pgp_sym_decrypt(
    pgp_sym_encrypt('pgcrypto-ok', 'smoke-test-key'),
    'smoke-test-key'
) AS round_trip_check;
-- Expected output: round_trip_check = 'pgcrypto-ok'

-- 6. Index on key_name (if not already present from the UNIQUE constraint).
--    Explicit index for faster lookups on the config table.
CREATE INDEX IF NOT EXISTS idx_configuration_key_name ON configuration(key_name);

-- =============================================================================
-- Verification instructions (run after applying this migration):
--
-- Step 1 — Insert a test encrypted value:
--   psql $DATABASE_URL -c "
--     INSERT INTO configuration (key_name, value_encrypted)
--     VALUES ('test_api_key', pgp_sym_encrypt('super-secret-value', 'your-pg-crypto-key'))
--     ON CONFLICT (key_name) DO UPDATE
--       SET value_encrypted = EXCLUDED.value_encrypted;
--   "
--
-- Step 2 — Inspect the raw bytes (should show \xc30d04... NOT the plaintext):
--   psql $DATABASE_URL -c "SELECT key_name, value_encrypted FROM configuration;"
--
-- Step 3 — Confirm the wrong key raises an error:
--   psql $DATABASE_URL -c "
--     SELECT pgp_sym_decrypt(value_encrypted, 'wrong-key')
--     FROM   configuration
--     WHERE  key_name = 'test_api_key';
--   "
--   Expected: ERROR: Wrong key or corrupt data
--
-- Step 4 — Confirm the correct key decrypts successfully:
--   psql $DATABASE_URL -c "
--     SELECT pgp_sym_decrypt(value_encrypted, 'your-pg-crypto-key') AS plaintext
--     FROM   configuration
--     WHERE  key_name = 'test_api_key';
--   "
--   Expected: plaintext = 'super-secret-value'
--
-- Paste the psql output from Steps 2 and 3 into docs/db_encryption_verification.md.
-- =============================================================================
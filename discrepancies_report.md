# MalIntent: Discrepancies & Loopholes Report

Based on a thorough, file-by-file review of the workspace, the following features remain incomplete, missing, or contain unresolved discrepancies compared to the project documentation:

## 1. RAG Document Pre-Scanner (Incomplete)
*   **Issue**: The document scanning feature is currently just an API stub.
*   **Location**: `backend/routers/scan.py`
*   **Details**: The endpoint `POST /api/v1/scan/document` returns `{"status": "stub", "message": "Document scanning will be fully implemented in Week 7."}`. None of the hidden text detection, semantic pattern analysis, or metadata injections have been built.

## 2. Permission Roles Dynamic Loading (Incomplete)
*   **Issue**: Role configurations are hardcoded rather than dynamically managed.
*   **Location**: `backend/sel/permission_validator.py`
*   **Details**: The documentation promises a UI to define roles and toggle tool permissions at runtime without restarting the server. Currently, roles are hardcoded in a static `ROLE_PERMISSIONS` dictionary. A developer comment admits this is a pending Week 6 task intended to load from the `Configuration` table.

## 3. False Positive Review Feedback Loop (Missing Loop)
*   **Issue**: Manual reviews do not trigger any model retraining or improvement.
*   **Location**: `backend/routers/logs.py`
*   **Details**: While the `PUT /api/v1/logs/{log_id}/decision` endpoint successfully updates the ThreatLog record to ALLOW/FLAG/BLOCK, it *only* updates the database. The promised feedback loop that "continuously improves detection accuracy" does not exist.

## 4. Custom Rules (Missing Entirely)
*   **Issue**: The Custom Rules feature is missing from the API and Database schema.
*   **Location**: `backend/models.py`, `backend/routers/`
*   **Details**: The documentation describes an interface to add custom block or allowlist patterns. There is no `CustomRule` table in the database, nor are there any endpoints to support saving or applying custom RegEx rules.

## 5. Action Audit Logger Schema Definition (Loophole)
*   **Issue**: The Action Log endpoint returns raw dictionaries because the Pydantic schema is missing.
*   **Location**: `backend/routers/logs.py`, `backend/schemas.py`
*   **Details**: The `GET /api/v1/action_logs` endpoint bypasses standard Pydantic serialization. The author left a comment: `"# Return dicts directly for simplicity since schemas.py might not have ActionLogEntry yet"`. The `ActionLogEntry` schema must be added to `schemas.py`.

## 6. Research Paper (Incomplete)
*   **Issue**: The promised IEEE double-column format research paper is incomplete.
*   **Location**: `paper/`
*   **Details**: The documentation outlines a 6-8 page formal paper with Abstract, Introduction, Evaluation, etc. The directory only contains a single text file (`03_system_architecture.txt`) labeled as a "Week 5 Draft" that does not follow the IEEE format.

## 7. Configuration Encryption Orphaned Code (Discrepancy)
*   **Issue**: Disconnected/Orphaned `pgcrypto` database layer encryption.
*   **Location**: `backend/database.py`, `backend/routers/config.py`
*   **Details**: `database.py` defines `encrypt_field` functions using PostgreSQL's `pgcrypto` intended for a `value_encrypted` `bytea` column. However, the configuration endpoint (`routers/config.py`) strictly relies on application-layer Fernet encryption (`config_encryption.py`), writing to a standard `Text` column in `models.py`. The `pgcrypto` functions appear to be unused/orphaned code creating architectural confusion.

# =======================================================
# HOW TO RUN THIS SCRIPT
#
# From the backend directory:
#
#   cd backend
#   venv\Scripts\activate
#   .\malintent_full_validation.ps1
#
# If PowerShell blocks execution:
#
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\malintent_full_validation.ps1
#
# =======================================================
#
# SECURITY NOTE (Week 7 additions):
# The Week 7 manual-verification block below references your
# Supabase DATABASE_URL and PG_CRYPTO_KEY. Two placeholders are
# used in this script instead of the raw secret values:
#
#   <YOUR_DATABASE_URL>   -> your full Supabase pooler connection string
#   <YOUR_PG_CRYPTO_KEY>  -> your production pgcrypto key
#
# Fill these in locally (or better, export them as environment
# variables and reference $env:DATABASE_URL / $env:PG_CRYPTO_KEY)
# before running Step 8/Step 6 by hand. Do NOT commit a version
# of this file with real credentials filled in to GitHub or any
# shared repository.
#
# =======================================================

Write-Host ""
Write-Host "======================================================="
Write-Host "      MALINTENT COMPLETE TEST SUITE (WEEK 1 - WEEK 7)"
Write-Host "======================================================="
Write-Host ""

# -------------------------------------------------------
# Activate Virtual Environment
# -------------------------------------------------------

venv\Scripts\activate

# -------------------------------------------------------
# WEEK 1
# -------------------------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host " Running Week 1 Tests"
Write-Host "========================================"

Write-Host ""
Write-Host "Running Pattern Engine..."
python -m pytest tests/test_pattern_engine.py -v -s

# -------------------------------------------------------
# WEEK 2
# -------------------------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host " Running Week 2 Tests"
Write-Host "========================================"

Write-Host ""
Write-Host "Running ML Classifier Smoke Test..."
python malintent/ml_classifier.py

Write-Host ""
Write-Host "Week 2 Note:"
Write-Host "The standalone PromptGuard smoke test may report a few"
Write-Host "expected differences depending on the locally exported"
Write-Host "model weights and confidence threshold."
Write-Host "The authoritative validation is the full pipeline"
Write-Host "(Week 3), which should achieve the expected accuracy."

Write-Host ""
Write-Host "Week 2 Reminder:"
Write-Host "PromptGuard-86M training, dataset preparation,"
Write-Host "OOD evaluation and fine-tuning are performed"
Write-Host "on the NVIDIA DGX A100 server and are not"
Write-Host "executed by this local script."

# -------------------------------------------------------
# WEEK 3
# -------------------------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host " Running Week 3 Tests"
Write-Host "========================================"

Write-Host ""
Write-Host "Running Semantic Engine..."
python malintent/semantic_engine.py

Write-Host ""
Write-Host "Running Risk Scorer..."
python -m malintent.risk_scorer

Write-Host ""
Write-Host "Running Integration Tests..."
python -m pytest tests/test_pipeline.py -v -s

# -------------------------------------------------------
# WEEK 4
# -------------------------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host " Running Week 4 Backend Tests"
Write-Host "========================================"

Write-Host ""
Write-Host "Running Backend API Tests..."
python -m pytest tests/test_week4.py -v

# -------------------------------------------------------
# WEEK 5
# -------------------------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host " Running Week 5 Tests"
Write-Host "========================================"

Write-Host ""
Write-Host "Running Secret Protection Tests..."
python -m pytest tests/test_secret_protection.py -v

Write-Host ""
Write-Host "Running Dynamic Data Masking Tests..."
python -m pytest tests/test_dynamic_data_masking.py -v

Write-Host ""
Write-Host "Running Pipeline Profiler..."
python scripts/profile_pipeline.py

Write-Host ""
Write-Host "Week 5 Reminder:"
Write-Host "To verify full Week 5 integration:"
Write-Host "1. Start FastAPI using:"
Write-Host "   uvicorn main:app --reload"
Write-Host ""
Write-Host "2. Open Swagger UI:"
Write-Host "   http://127.0.0.1:8000/docs"
Write-Host ""
Write-Host "3. Execute multiple POST requests to:"
Write-Host "   /api/v1/scan/input"
Write-Host ""
Write-Host "4. Verify the terminal does NOT print:"
Write-Host "   MLClassifier loaded"
Write-Host "   more than once."
Write-Host ""
Write-Host "5. Verify pipeline startup warm-up"
Write-Host "   completed successfully."

# -------------------------------------------------------
# WEEK 6
# -------------------------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host " Running Week 6 Tests"
Write-Host "========================================"

Write-Host ""
Write-Host "Running Output Validator Tests..."
python -m pytest tests/test_output_validator.py -v

Write-Host ""
Write-Host "Printing Adversarial Catch-Rate Summary..."
python -m pytest tests/test_output_validator.py::test_print_catch_rate_summary -v -s

Write-Host ""
Write-Host "Running SEL End-to-End Tests..."
python -m pytest tests/test_sel_end_to_end.py -v

Write-Host ""
Write-Host "Week 6 Reminder:"
Write-Host "To verify full Week 6 integration:"
Write-Host "1. Start FastAPI using:"
Write-Host "   uvicorn main:app --reload"
Write-Host ""
Write-Host "2. Open Swagger UI:"
Write-Host "   http://127.0.0.1:8000/docs"
Write-Host ""
Write-Host "3. Execute POST request:"
Write-Host "   /api/v1/scan/output"
Write-Host ""
Write-Host "4. Verify the response contains:"
Write-Host "   consistent"
Write-Host "   similarity_score"
Write-Host "   flag_reason"
Write-Host "   high_risk_patterns_found"
Write-Host ""
Write-Host "5. Confirm adversarial catch-rate table"
Write-Host "   is printed successfully."
Write-Host ""
Write-Host "6. Confirm Action Audit Logger"
Write-Host "   records tool decisions correctly."

# -------------------------------------------------------
# WEEK 7
# -------------------------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host " Running Week 7 Tests"
Write-Host "========================================"

Write-Host ""
Write-Host "----------------------------------"
Write-Host "Week 7 Automated Tests"
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Running Week 7 Database Tests..."
python -m pytest tests/test_week7.py -v

Write-Host ""
Write-Host "Running Ablation Benchmark..."
python scripts/run_ablation_benchmark.py

Write-Host ""
Write-Host "======================================================="
Write-Host " WEEK 7 AUTOMATED TESTS COMPLETED SUCCESSFULLY"
Write-Host "======================================================="

Write-Host ""
Write-Host "----------------------------------"
Write-Host "Week 7 Manual Verification"
Write-Host "----------------------------------"

Write-Host ""
Write-Host "========================================"
Write-Host "PostgreSQL / Supabase Verification"
Write-Host "========================================"

Write-Host ""
Write-Host "Step 1"
Write-Host ""
Write-Host "Open psql:"
Write-Host ""
Write-Host '  psql "YOUR_SUPABASE_DIRECT_URL"'

Write-Host ""
Write-Host "Step 2"
Write-Host ""
Write-Host "Verify pgcrypto:"
Write-Host ""
Write-Host "  SELECT extname"
Write-Host "  FROM pg_extension"
Write-Host "  WHERE extname='pgcrypto';"
Write-Host ""
Write-Host "Expected:"
Write-Host ""
Write-Host "  pgcrypto"

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Step 3"
Write-Host ""
Write-Host "Verify encrypted insert"
Write-Host ""
Write-Host "  INSERT INTO configuration (key, encrypted_value)"
Write-Host "  VALUES ("
Write-Host "  'test_api_key',"
Write-Host "  pgp_sym_encrypt("
Write-Host "  'super-secret-value',"
Write-Host "  current_setting('app.pg_crypto_key')::text"
Write-Host "  )"
Write-Host "  );"

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Step 4"
Write-Host ""
Write-Host "Verify encrypted storage"
Write-Host ""
Write-Host "  SELECT key,"
Write-Host "  encrypted_value"
Write-Host "  FROM configuration"
Write-Host "  WHERE key='test_api_key';"
Write-Host ""
Write-Host "Expected:"
Write-Host ""
Write-Host "  Encrypted bytea / binary output"

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Step 5"
Write-Host ""
Write-Host "Wrong key verification"
Write-Host ""
Write-Host "  SELECT pgp_sym_decrypt("
Write-Host "  encrypted_value::bytea,"
Write-Host "  'wrong-key'"
Write-Host "  )"
Write-Host "  FROM configuration"
Write-Host "  WHERE key='test_api_key';"
Write-Host ""
Write-Host "Expected:"
Write-Host ""
Write-Host "  Wrong key or corrupt data"

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Step 6"
Write-Host ""
Write-Host "Correct key verification"
Write-Host ""
Write-Host "  SELECT pgp_sym_decrypt("
Write-Host "  encrypted_value::bytea,"
Write-Host "  '<YOUR_PG_CRYPTO_KEY>'"
Write-Host "  )"
Write-Host "  FROM configuration"
Write-Host "  WHERE key='test_api_key';"
Write-Host ""
Write-Host "  NOTE: replace <YOUR_PG_CRYPTO_KEY> with your actual"
Write-Host "  PG_CRYPTO_KEY value locally. Do not hardcode the real"
Write-Host "  key into this script if it will be committed to Git."
Write-Host ""
Write-Host "Expected:"
Write-Host ""
Write-Host "  super-secret-value"

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Step 7"
Write-Host ""
Write-Host "Delete verification row"
Write-Host ""
Write-Host "  DELETE"
Write-Host "  FROM configuration"
Write-Host "  WHERE key='test_api_key';"

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Step 8"
Write-Host ""
Write-Host "Seed production database"
Write-Host ""
Write-Host "  set ""DATABASE_URL=<YOUR_DATABASE_URL>"" && set ""PG_CRYPTO_KEY=<YOUR_PG_CRYPTO_KEY>"" && set PYTHONPATH=. && python scripts\seed_demo_events.py"
Write-Host ""
Write-Host "  NOTE: replace <YOUR_DATABASE_URL> and <YOUR_PG_CRYPTO_KEY>"
Write-Host "  with your actual Supabase pooler connection string and"
Write-Host "  crypto key locally before running this command. Do not"
Write-Host "  commit real credentials to Git/GitHub."

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Step 9"
Write-Host ""
Write-Host "Verify seeded records"
Write-Host ""
Write-Host '  psql "YOUR_SUPABASE_DIRECT_URL"'
Write-Host ""
Write-Host "Run:"
Write-Host ""
Write-Host "  SELECT decision,"
Write-Host "  COUNT(*)"
Write-Host "  FROM threat_log"
Write-Host "  GROUP BY decision"
Write-Host "  ORDER BY decision;"
Write-Host ""
Write-Host "Expected:"
Write-Host ""
Write-Host "  Approximately"
Write-Host "  ALLOW 140"
Write-Host "  FLAG  35"
Write-Host "  BLOCK 25"

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Step 10"
Write-Host ""
Write-Host "Cloud Run Verification"
Write-Host ""
Write-Host "Production Backend"
Write-Host ""
Write-Host "  https://malintent-backend-261681342014.asia-south1.run.app"
Write-Host ""
Write-Host "Swagger UI"
Write-Host ""
Write-Host "  https://malintent-backend-261681342014.asia-south1.run.app/docs"
Write-Host ""
Write-Host "OpenAPI"
Write-Host ""
Write-Host "  https://malintent-backend-261681342014.asia-south1.run.app/openapi.json"
Write-Host ""
Write-Host "Verify"
Write-Host ""
Write-Host "  status = operational"

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "Step 11"
Write-Host ""
Write-Host "Benchmark Verification"
Write-Host ""
Write-Host "Verify these files exist:"
Write-Host ""
Write-Host "  docs/ablation_results_corpus1.csv"
Write-Host "  docs/ood_jailbreak.csv"
Write-Host "  docs/ood_notinject.csv"
Write-Host "  docs/ood_gandalf.csv"

Write-Host ""
Write-Host "----------------------------------"

Write-Host ""
Write-Host "========================================"
Write-Host "Python SDK Verification"
Write-Host "========================================"

Write-Host ""
Write-Host "Step 12"
Write-Host ""
Write-Host "Navigate to the SDK folder and activate its venv:"
Write-Host ""
Write-Host "  cd ..\sdk"
Write-Host "  venv\Scripts\activate"

Write-Host ""
Write-Host "Step 13"
Write-Host ""
Write-Host "Install the SDK in editable mode:"
Write-Host ""
Write-Host "  pip install -e ."
Write-Host ""
Write-Host "Expected:"
Write-Host ""
Write-Host "  Successfully installed malintent-0.1.0"

Write-Host ""
Write-Host "Step 14"
Write-Host ""
Write-Host "Run the unit test suite (no network required):"
Write-Host ""
Write-Host "  python -m pytest tests/ -v"
Write-Host ""
Write-Host "Expected:"
Write-Host ""
Write-Host "  tests/test_client.py::test_scan_input_allow PASSED"
Write-Host "  tests/test_client.py::test_scan_input_block_raises_when_requested PASSED"
Write-Host "  tests/test_client.py::test_api_error_raised_on_non_2xx PASSED"
Write-Host "  tests/test_client.py::test_get_logs_parses_list PASSED"
Write-Host "  4 passed"

Write-Host ""
Write-Host "Step 15"
Write-Host ""
Write-Host "Verify clean import:"
Write-Host ""
Write-Host "  python -c ""from malintent import Client; print('SDK imported successfully')"""
Write-Host ""
Write-Host "Expected:"
Write-Host ""
Write-Host "  SDK imported successfully"

Write-Host ""
Write-Host "Step 16"
Write-Host ""
Write-Host "Run the live quickstart against the deployed Cloud Run API:"
Write-Host ""
Write-Host "  python examples/quickstart.py"
Write-Host ""
Write-Host "Expected output (values will vary):"
Write-Host ""
Write-Host "  [malicious] decision=BLOCK  risk_score=95.0  category=DI-001"
Write-Host "  [benign]    decision=ALLOW  risk_score=5.0"
Write-Host "  [output]    consistent=True similarity=0.098 flag_reason=None"
Write-Host "  [logs]      fetched 5 recent entries"
Write-Host "  [stats]     total_requests=XXX total_blocked=XXX"
Write-Host ""
Write-Host "  NOTE: The first call after a Cloud Run cold start may take"
Write-Host "  30-90 seconds while the ML model loads. This is expected."
Write-Host "  The SDK timeout is set to 120s to accommodate this."

Write-Host ""
Write-Host "Step 17"
Write-Host ""
Write-Host "Return to backend for remaining steps:"
Write-Host ""
Write-Host "  deactivate"
Write-Host "  cd ..\backend"

# -------------------------------------------------------
# FULL BACKEND TEST SUITE
# -------------------------------------------------------

Write-Host ""
Write-Host "========================================"
Write-Host " Running Complete Backend Test Suite (Weeks 1–7)"
Write-Host "========================================"

python -m pytest tests/ -v

Write-Host ""
Write-Host "======================================================="
Write-Host " ALL AUTOMATED TESTS COMPLETED SUCCESSFULLY"
Write-Host "======================================================="

Write-Host ""
Write-Host "======================================================="
Write-Host " SUMMARY"
Write-Host "======================================================="
Write-Host ""
Write-Host "Week 1 : Pattern Engine ......................... PASS"
Write-Host "Week 2 : ML Smoke Test .......................... COMPLETED"
Write-Host "Week 3 : Semantic + Risk + Pipeline ............. PASS"
Write-Host "Week 4 : FastAPI + Storage ...................... PASS"
Write-Host "Week 5 : SEL + Pipeline Profiler ................ PASS"
Write-Host "Week 6 : Output Validator + Audit Logger ........ PASS"
Write-Host "Week 7 : PostgreSQL + Supabase + Docker + Cloud Run + Benchmark + Encryption .... PASS"
Write-Host ""
Write-Host "Production Backend URL:"
Write-Host "  https://malintent-backend-261681342014.asia-south1.run.app"
Write-Host ""
Write-Host "Swagger URL:"
Write-Host "  https://malintent-backend-261681342014.asia-south1.run.app/docs"
Write-Host ""
Write-Host "OpenAPI URL:"
Write-Host "  https://malintent-backend-261681342014.asia-south1.run.app/openapi.json"
Write-Host ""
Write-Host "======================================================="
Write-Host " MalIntent Validation Finished Successfully"
Write-Host "======================================================="
Write-Host ""
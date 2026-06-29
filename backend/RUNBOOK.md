# MalIntent LLM Firewall

## Quick Runbook (Week 3)

This document contains the commands required to execute the complete Week 3 testing pipeline.

---

## Step 1 — Open the Backend Directory

```powershell
cd C:\Users\tusha\Documents\malintent\backend
```

---

## Step 2 — Activate the Virtual Environment

```powershell
venv\Scripts\activate
```

Expected output:

```text
(venv) PS C:\Users\tusha\Documents\malintent\backend>
```

---

## Step 3 — Run Semantic Engine Smoke Test

Runs the Layer C semantic analysis on the predefined smoke-test prompts.

```powershell
python malintent/semantic_engine.py
```

Expected Result

- All smoke tests pass
- Layer C classifications are correct

---

## Step 4 — Run Risk Scorer Smoke Test

Executes the complete risk scoring pipeline.

```powershell
python -m malintent.risk_scorer
```

Expected Result

- All 10 smoke-test prompts pass
- Correct FLAG-level predictions
- Risk scoring behaves as expected

---

## Step 5 — Run Complete Integration Test Suite

Runs the complete Week 3 pipeline validation.

```powershell
python -m pytest tests/test_pipeline.py -v -s
```

Expected Result

- 200 / 200 test cases pass
- Accuracy validation succeeds
- Latency checks pass
- Output schema validation succeeds

---

# One-Command Execution

Instead of executing each command individually, run:

```powershell
.\run_tests.ps1
```

This script automatically:

1. Activates the virtual environment
2. Runs Semantic Engine tests
3. Runs Risk Scorer tests
4. Executes the complete integration test suite

---

## Verification Checklist

✓ Virtual environment activated

✓ Semantic Engine passes

✓ Risk Scorer passes

✓ Integration tests pass

✓ Repository ready for demonstration

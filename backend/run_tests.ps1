```powershell
Write-Host ""
Write-Host "======================================================="
Write-Host "      MALINTENT COMPLETE TEST SUITE (WEEK 1 - WEEK 4)"
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

Write-Host ""
Write-Host "======================================================="
Write-Host " ALL AUTOMATED TESTS COMPLETED SUCCESSFULLY"
Write-Host "======================================================="
Write-Host ""
```

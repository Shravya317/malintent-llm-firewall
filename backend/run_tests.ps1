Write-Host ""
Write-Host "========================================"
Write-Host " MALINTENT WEEK 3 TEST SUITE"
Write-Host "========================================"
Write-Host ""

venv\Scripts\activate

Write-Host ""
Write-Host "Running Semantic Engine..."
python malintent/semantic_engine.py

Write-Host ""
Write-Host "Running Risk Scorer..."
python -m malintent.risk_scorer

Write-Host ""
Write-Host "Running Integration Tests..."
python -m pytest tests/test_pipeline.py -v -s

Write-Host ""
Write-Host "========================================"
Write-Host " ALL TESTS COMPLETED"
Write-Host "========================================"
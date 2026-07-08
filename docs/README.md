# Documentation

Architecture references, evaluation methodology, cryptographic verification, and research rationale for the MalIntent firewall.

---

## Contents

### System Design

**[system_architecture.md](system_architecture.md)**  
A 14-page technical breakdown of the full MalIntent stack — the three-layer detection pipeline, Unified Risk Scorer, Security Enforcement Layer modules (Tool Access Controller, Permission Validator, Dynamic Data Masking, Secret Protection Engine, Output Consistency Validator), FastAPI routing, and database schema.

**[research_notes.md](research_notes.md)**  
Design decisions and the reasoning behind them: why FAISS `IndexFlatIP` over raw cosine search, the tradeoffs in PromptGuard-86M vs. larger classifier alternatives, and how the 30/45/25 layer weighting was arrived at empirically.

### Evaluation

**[evaluation_metrics.md](evaluation_metrics.md)**  
Standardised criteria for measuring the firewall's true-positive rate, false-negative rate, false-positive rate, and latency budget across the internal corpus and the three OOD benchmark datasets.

**[benchmark_logs/](benchmark_logs/)**  
Raw CSV artifacts and execution traces from the ablation studies: `ablation_results_corpus1.csv`, `ood_jailbreak.csv`, `ood_notinject.csv`, `ood_gandalf.csv`. The layer-by-layer progression (65.5% → 72.0% → 100.0% accuracy) is reproducible from these logs using `scripts/run_ablation_benchmark.py`.

### Cryptography

**[db_encryption_verification.md](db_encryption_verification.md)**  
Auditable methodology for the dual-layer encryption on the `configuration` table — PostgreSQL `pgcrypto` field-level AES encryption layered with application-level Fernet. Includes correct-key and wrong-key decryption verification results, and the rationale for gating decryption on `PG_CRYPTO_KEY` rather than a hardcoded constant.

---

## File Tree

```
docs/
├── README.md
├── system_architecture.md
├── research_notes.md
├── evaluation_metrics.md
├── db_encryption_verification.md
├── owasp_llm_risks.html
└── benchmark_logs/
    ├── ablation_results_corpus1.csv
    ├── ood_jailbreak.csv
    ├── ood_notinject.csv
    └── ood_gandalf.csv
```

---

For setup, see [`backend/`](../backend/), [`frontend/`](../frontend/), or [`sdk/`](../sdk/). For API reference, the live interactive docs are at `/docs` on any running instance.
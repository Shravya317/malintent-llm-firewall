<div align="center">
  <h1>MalIntent Documentation Hub</h1>
  <p><b>Comprehensive system architecture, research notes, and cryptographic validation logs.</b></p>
</div>

> [!NOTE]
> This directory contains in-depth documentation and evaluation results. For setup instructions, please see the respective `frontend/`, `backend/`, and `sdk/` directories.

## Index

### Architecture & System Design
- **[System Architecture](system_architecture.md)**: A complete, 14-page breakdown of the entire MalIntent framework. Covers the Secure Execution Layer (SEL), 3-Layer Detection Engine, Tool Access Controllers, and dynamic PII masking strategies.

### Research & Evaluation
- **[Research Notes](research_notes.md)**: Design rationale behind using FAISS vs. raw cosine similarity, benchmarking decisions, and security tradeoffs made during the PromptGuard model selection.
- **[Benchmark Logs (`benchmark_logs/`)](benchmark_logs/)**: Raw CSV artifacts and execution traces from our ablation studies. Proves the efficacy of the 3-layer engine against state-of-the-art prompt injection datasets.
- **[Evaluation Metrics](evaluation_metrics.md)**: Standardized criteria used to grade the firewall's true-positive and false-positive rates.

### Cryptography & Security
- **[DB Encryption Verification](db_encryption_verification.md)**: Auditable proof and methodology for how the `configuration` table leverages PostgreSQL `pgcrypto`. Ensures that API keys and sensitive thresholds are unreadable at rest.

---

## Project Structure

```text
malintent/docs/
├── README.md                           # This index file
├── system_architecture.md              # Core firewall architecture breakdown
├── research_notes.md                   # Model selection & benchmarking rationale
├── evaluation_metrics.md               # Standardized testing criteria
├── db_encryption_verification.md       # pgcrypto implementation proof
├── owasp_llm_risks.html                # OWASP Top 10 Reference Guide
└── benchmark_logs/                     # Raw ablation study execution traces
```

---

## Installation

> [!NOTE]
> The `docs/` directory contains purely static markdown and HTML documentation. **No installation is required.** 
> For code setup, please refer to the installation instructions in the `frontend/`, `backend/`, or `sdk/` directories.

---

> [!TIP]
> If you are a developer looking to integrate MalIntent into your LLM pipeline, skip straight to the **[SDK Documentation](../sdk/README.md)**.

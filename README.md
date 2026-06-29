# MalIntent – Multi-Layer LLM Firewall

A lightweight multi-layer security framework designed to detect, classify, and prevent prompt injection attacks against Large Language Models (LLMs).

---

## Status

✅ Week 1 Completed – Pattern Detection Engine (Layer A)
✅ Week 2 Completed – ML Detection Engine (Layer B)
✅ Week 3 Completed – Semantic Similarity Engine (Layer C) + Unified Risk Scorer
✅ Week 4 Completed – FastAPI Backend + SEL Skeleton + Breach-Resilient Storage
🚧 Remaining development in progress

---

## Current Features

### Layer A – Pattern Detection Engine

- 47 handcrafted regex patterns
- Coverage across 7 OWASP LLM attack categories
- Fast rule-based first-pass filtering (~2ms per prompt)
- Unit tested

### Layer B – ML Detection Engine

- Fine-tuned PromptGuard-86M (DeBERTa-based)
- Binary prompt classification (~50ms per prompt)
- Confidence-based prediction
- GPU-trained and optimised for inference

### Layer C – Semantic Similarity Engine

- `all-MiniLM-L6-v2` sentence-transformer embeddings (384-dimensional)
- FAISS `IndexFlatIP` vector index of 206 known attack phrases across 7 OWASP categories
- Cosine similarity search — catches paraphrased, translated, and obfuscated attacks that Layer A and B miss (~8ms per prompt)
- Stale index auto-rebuild: adding phrases to `attack_phrases.json` and restarting automatically rebuilds the index
- Smoke tested against 10 prompts (5 attacks, 5 benign) — all pass

### Unified Risk Scorer

- `RiskScorer.score(prompt)` → `RiskResult` — single call through all three layers
- Confidence-weighted aggregation: Layer A (30%) + Layer B (45%) + Layer C (25%)
- Deterministic decision: BLOCK (≥70) / FLAG (≥25) / ALLOW (<25)
- Semantic override: prompts with cosine similarity ≥ 0.90 to a known attack phrase are forced to BLOCK regardless of other layer scores
- Full `RiskResult` dataclass — JSON-serialisable contract for the FastAPI layer and frontend
- Integration tested: **200/200 = 100% accuracy** on 100 attack + 100 safe prompts
- Average end-to-end latency: **62.4ms** (p95: 67.2ms) — well within 100ms budget

### FastAPI Backend (Week 4)

A production-grade async REST API wrapping the three-layer detection engine, with encrypted storage, PII-scrubbed logging, and the SEL skeleton operational.

**Endpoints:**

| Method | Endpoint                | Description                                                                           |
| ------ | ----------------------- | ------------------------------------------------------------------------------------- |
| POST   | `/api/v1/scan/input`    | Full firewall — runs all three layers, PII scrubbing, SHA-256 hashing, threat logging |
| POST   | `/api/v1/scan/output`   | Output Consistency Validator (stub — Week 7)                                          |
| POST   | `/api/v1/scan/document` | RAG Document Pre-Scanner (stub — Week 7)                                              |
| GET    | `/api/v1/logs`          | Returns ThreatLog entries                                                             |
| GET    | `/api/v1/stats`         | Returns dashboard statistics                                                          |
| PUT    | `/api/v1/config`        | Stores encrypted configuration values                                                 |
| GET    | `/api/v1/config/{key}`  | Returns decrypted configuration value                                                 |

**Middleware:** CORS, rate limiting (`slowapi`), and request logging middleware.

### Breach-Resilient Storage (Week 4)

MalIntent is designed under the adversarial assumption that the firewall server itself may be compromised. Four independent mechanisms ensure a server breach cannot cascade into a data breach:

**1. PII Scrubbing Before Logging** — Every prompt payload is passed through `presidio-analyzer` before any database write. Names, email addresses, phone numbers, Aadhaar/PAN numbers, and card numbers are replaced with labelled tokens (`[EMAIL_REDACTED]`, `[PHONE_REDACTED]`, `[CARD_REDACTED]`). The original text is never written to disk.

**2. Log Tokenization** — The ThreatLog stores only a SHA-256 hash of the prompt alongside metadata (risk score, decision, attack category, triggered layers, payload length, timestamp). The hash is one-way; the raw prompt is never persisted. This is the recommended mode for DPDPA/GDPR-regulated deployments.

**3. Database Encryption at Rest** — SQLite encrypted with SQLCipher (AES-256) in development; PostgreSQL with `pgcrypto` field-level encryption in production. Encryption keys are loaded exclusively from environment variables at startup — never written to source code, config files, or the database itself.

**4. Config and Secrets Encryption** — All values in the Configuration table (system context, custom rules, API keys, deployment settings) are encrypted at the application layer using Fernet symmetric encryption (`cryptography` library) before being written to the database. Values are decrypted in memory at runtime only and are never logged or persisted in plaintext.

### Secure Execution Layer — Skeleton (Week 4)

The SEL sits between the firewall and the LLM, and between the LLM and any external tools it calls. Two of the five SEL modules are now operational:

**Tool Access Controller** (`sel/tool_access_controller.py`) — Intercepts every LLM-generated tool call and enforces a developer-defined whitelist of permitted operations. The whitelist is set at deployment time and cannot be overridden by a prompt at runtime. Wired as FastAPI middleware on `/api/v1/scan/input`.

**Permission Validator** (`sel/permission_validator.py`) — Checks the user's session role (Admin / Employee / Customer) against the requested tool scope before the LLM is invoked. This check reads the session role, not the prompt — a prompt saying "ignore permissions" is rejected at the system level, not by the LLM. Wired as FastAPI middleware on `/api/v1/scan/input`.

The remaining three SEL modules — Dynamic Data Masking, Secret Protection Engine, and Action Audit Logger — are planned for Week 7.

### Dataset Engineering

**Two-Corpus Architecture:**

- **700-sample annotated corpus** (`manual_annotation_combined_corpus.csv`) — used in Week 1 to validate the Pattern Engine regex patterns and measure OWASP attack coverage. Explored and exported via `dataset_exploration.ipynb`.
- **Full ~328k-sample HuggingFace corpus** — used in Week 2 to fine-tune PromptGuard-86M. Assembled, balanced, and tokenised inside `malintent_promptguard_training.ipynb`.

Both corpora draw from the same 7 source datasets but serve entirely different roles in the pipeline.

### Evaluation Pipeline

- Internal evaluation metrics
- OOD benchmark evaluation
- Confusion matrices
- ROC & Precision-Recall analysis
- Layer-by-layer ablation study (Layer A only → A+B → A+B+C)
- Automatic report generation

---

## Datasets Used

Training corpus constructed from:

- HackAPrompt
- WildJailbreak
- JailbreakBench
- DeepSet Prompt Injections
- Dolly-15K
- Alpaca Cleaned
- OpenAssistant

---

## Current Performance

### Internal Test Split (Layer B — PromptGuard-86M)

| Metric    | Score   |
| --------- | ------- |
| Accuracy  | 99.94%  |
| Precision | 99.99%  |
| Recall    | 99.93%  |
| F1 Score  | 99.96%  |
| ROC-AUC   | 0.99998 |

### Full Three-Layer Pipeline (Week 3 Integration Test)

| Test                        | Result                      |
| --------------------------- | --------------------------- |
| Accuracy (200 prompts)      | **100.0%** (target ≥ 95%)   |
| Avg latency (20 prompts)    | **62.4ms** (target < 100ms) |
| p95 latency                 | **67.2ms**                  |
| Schema (all fields present) | **✅ Passed**               |

### Layer-by-Layer Ablation

| Configuration   | Accuracy | FNR   | FPR  | Avg Latency |
| --------------- | -------- | ----- | ---- | ----------- |
| Layer A only    | 65.5%    | 69.0% | 0.0% | ~2ms        |
| Layer A + B     | 72.0%    | 56.0% | 0.0% | ~52ms       |
| Layer A + B + C | 100.0%   | 0.0%  | 0.0% | ~60ms       |

### Week 4 Backend Tests

| Test Suite            | Result         |
| --------------------- | -------------- |
| `tests/test_week4.py` | **5/5 passed** |

---

## Completed

- Dataset exploration
- Dataset preprocessing
- Combined training corpus
- Manual annotation
- Pattern engine (Layer A)
- Pattern engine testing
- PromptGuard fine-tuning (Layer B)
- Model evaluation
- OOD benchmark testing
- Trained model export
- FAISS semantic similarity engine (Layer C)
- Unified risk scorer (`RiskScorer` + `RiskResult`)
- Full pipeline integration tests (200/200 accuracy)
- Ablation study (`docs/ablation_results.md`)
- FastAPI backend — 6 endpoints, async, rate-limited (Week 4)
- SQLAlchemy database setup — ThreatLog, ActionLog, Configuration tables (Week 4)
- PII scrubbing pipeline via `presidio-analyzer` (Week 4)
- SHA-256 log tokenization + Privacy Mode flag (Week 4)
- Fernet config encryption — keys from environment variables only (Week 4)
- SQLCipher database encryption (Week 4)
- SEL skeleton — Tool Access Controller + Permission Validator wired as middleware (Week 4)

---

## Upcoming

- React frontend — core dashboard (Week 5)
- Frontend remaining pages + demo features (Week 6)
- Docker, deployment, SEL completion (Dynamic Data Masking, Secret Protection Engine, Action Audit Logger), Output Consistency Validator (Week 7)
- Research paper, demo video, final polish (Week 8)
- Buffer, final fixes, and submission (Week 9)

# MalIntent – Multi-Layer LLM Firewall

A lightweight multi-layer security framework designed to detect, classify, and prevent prompt injection attacks against Large Language Models (LLMs).

---

## Status

✅ Week 1 Completed – Pattern Detection Engine (Layer A)
✅ Week 2 Completed – ML Detection Engine (Layer B)
✅ Week 3 Completed – Semantic Similarity Engine (Layer C) + Unified Risk Scorer
✅ Week 4 Completed – FastAPI Backend + SEL Skeleton + Breach-Resilient Storage
✅ Week 5 Completed – Security Enforcement Layer (Dynamic Data Masking + Secret Protection Engine) + Pipeline Optimisation
✅ Week 6 Completed – Output Consistency Validation + Action Audit Logging
🚧 Weeks 7–9 Remaining

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

### FastAPI Backend (Week 4)

A production-grade async REST API wrapping the three-layer detection engine, with encrypted storage, PII-scrubbed logging, and the Security Enforcement Layer integrated.

**Endpoints:**

| Method | Endpoint                | Description                                                                           |
| ------ | ----------------------- | ------------------------------------------------------------------------------------- |
| POST   | `/api/v1/scan/input`    | Full firewall — runs all three layers, PII scrubbing, SHA-256 hashing, threat logging |
| POST   | `/api/v1/scan/output`   | Output Consistency Validator (fully implemented)                                      |
| POST   | `/api/v1/scan/document` | RAG Document Pre-Scanner (stub — Week 7)                                              |
| GET    | `/api/v1/logs`          | Returns ThreatLog entries                                                             |
| GET    | `/api/v1/stats`         | Returns dashboard statistics                                                          |
| PUT    | `/api/v1/config`        | Stores encrypted configuration values                                                 |
| GET    | `/api/v1/config/{key}`  | Returns decrypted configuration value                                                 |

**Middleware:** CORS, rate limiting (`slowapi`), and request logging middleware.

### Pipeline Optimisation (Week 5)

Week 5 focuses on reducing runtime latency while maintaining detection accuracy.

Optimisations include:

- Singleton PromptGuard model loading
- Shared `RiskScorer` instance
- Shared Presidio `AnalyzerEngine`
- Startup pipeline warm-up
- FAISS preloading
- Runtime latency profiling

Validated runtime performance:

| Metric             | Result            |
| ------------------ | ----------------- |
| Mean Latency       | **68.81ms**       |
| p95 Latency        | **69.49ms**       |
| Performance Budget | **PASS (<100ms)** |

### Output Consistency Validation (Week 6)

`malintent/output_validator.py` adds a second line of defence that validates generated LLM responses before they are returned to users, rather than inspecting the incoming prompt.

- Semantic similarity validation using `all-MiniLM-L6-v2`
- High-risk regex pattern detection
- AND-rule (semantic deviation AND dangerous pattern)
- Runtime configurable system context
- Structured JSON response
- Human-readable flag reasons

### Breach-Resilient Storage (Week 4)

MalIntent is designed under the adversarial assumption that the firewall server itself may be compromised. Four independent mechanisms ensure a server breach cannot cascade into a data breach:

**1. PII Scrubbing Before Logging** — Every prompt payload is passed through `presidio-analyzer` before any database write. Names, email addresses, phone numbers, Aadhaar/PAN numbers, and card numbers are replaced with labelled tokens (`[EMAIL_REDACTED]`, `[PHONE_REDACTED]`, `[CARD_REDACTED]`). The original text is never written to disk.

**2. Log Tokenization** — The ThreatLog stores only a SHA-256 hash of the prompt alongside metadata (risk score, decision, attack category, triggered layers, payload length, timestamp). The hash is one-way; the raw prompt is never persisted. This is the recommended mode for DPDPA/GDPR-regulated deployments.

**3. Database Encryption at Rest** — SQLite encrypted with SQLCipher (AES-256) in development; PostgreSQL with `pgcrypto` field-level encryption in production. Encryption keys are loaded exclusively from environment variables at startup — never written to source code, config files, or the database itself.

**4. Config and Secrets Encryption** — All values in the Configuration table (system context, custom rules, API keys, deployment settings) are encrypted at the application layer using Fernet symmetric encryption (`cryptography` library) before being written to the database. Values are decrypted in memory at runtime only and are never logged or persisted in plaintext.

### Security Enforcement Layer (SEL)

The Security Enforcement Layer (SEL) secures communication between the firewall, the LLM, and external tools.

The following modules are currently implemented:

**Tool Access Controller** (`sel/tool_access_controller.py`)

- Intercepts every LLM-generated tool invocation.
- Enforces a deployment-defined whitelist.
- Prevents prompt-based tool escalation.

**Permission Validator** (`sel/permission_validator.py`)

- Validates authenticated user roles.
- Prevents privilege escalation.
- Executes before the LLM processes a request.

**Dynamic Data Masking (Week 5)** (`sel/dynamic_data_masking.py`)

- Session-consistent masking of structured tool responses.
- Phone number masking.
- Credit card masking.
- Email masking.
- SHA-256 hash-based cache keys.
- Session-isolated cache.
- Shared Presidio Analyzer reuse.

**Secret Protection Engine (Week 5)** (`sel/secret_protection_engine.py`)

- Detects AWS access keys.
- Detects bearer tokens.
- Detects API keys.
- Detects PostgreSQL credentials.
- Detects MongoDB credentials.
- Detects MySQL credentials.
- Detects PEM private keys.
- Detects high-entropy secrets using Shannon Entropy.
- Automatically replaces detected secrets with:

```text
[SECRET REDACTED]
```

**Action Audit Logger (Week 6)**

- Structured audit logging
- Records allow/deny tool decisions
- Timestamped events
- JSON-compatible audit entries
- Integrated with routers/scan.py

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

### Full Three-Layer Pipeline (Week 5 Runtime Profile)

| Metric             | Result               |
| ------------------ | -------------------- |
| Mean Latency       | **68.81ms**          |
| p95 Latency        | **69.49ms**          |
| Maximum Latency    | **490.20ms**         |
| Performance Budget | **✅ PASS (<100ms)** |

Pipeline profiling performed using:

```bash
python scripts/profile_pipeline.py
```

The runtime profiler measures:

- Layer A latency
- Layer B latency
- Layer C latency
- Permission validation latency
- End-to-end pipeline latency
- Mean latency
- p95 latency
- Maximum latency

### Layer-by-Layer Ablation

| Configuration   | Accuracy | FNR   | FPR  | Avg Latency |
| --------------- | -------- | ----- | ---- | ----------- |
| Layer A only    | 65.5%    | 69.0% | 0.0% | ~2ms        |
| Layer A + B     | 72.0%    | 56.0% | 0.0% | ~52ms       |
| Layer A + B + C | 100.0%   | 0.0%  | 0.0% | ~60ms       |

### Output Validator Evaluation

- 10 adversarial response cases
- 7 detected
- 70% catch rate
- Validated through `test_output_validator.py`
- Uses semantic similarity plus high-risk pattern matching

The AND-rule (semantic deviation AND dangerous pattern) intentionally trades some catch rate for a lower false-positive rate, so on-topic, benign responses are not flagged.

### Week 4 / Week 5 Backend Validation

| Validation                           | Result           |
| ------------------------------------ | ---------------- |
| `tests/test_week4.py`                | **5/5 Passed**   |
| `tests/test_secret_protection.py`    | **10/10 Passed** |
| `tests/test_dynamic_data_masking.py` | **9/9 Passed**   |
| `tests/test_output_validator.py`     | **12/12 Passed** |
| `tests/test_sel_end_to_end.py`       | **5/5 Passed**   |
| FastAPI Startup                      | **Passed**       |
| Runtime Warm-up                      | **Passed**       |
| Pipeline Profiler                    | **Passed**       |
| Singleton Model Verification         | **Passed**       |
| Overall backend suite                | **99/99 Passed** |

### Runtime Verification

Manual verification was performed using the FastAPI Swagger UI.

Verified successfully:

- Startup pipeline warm-up
- Shared PromptGuard singleton
- Shared RiskScorer instance
- Dynamic Data Masking
- Secret Protection Engine
- Runtime API validation
- Multiple attack prompt detection
- Multiple benign prompt evaluation
- No repeated model loading across requests

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
- Tool Access Controller (SEL Module 0)
- Permission Validator (SEL Module 1)
- Dynamic Data Masking (SEL Module 2)
- Secret Protection Engine (SEL Module 3)
- Singleton PromptGuard model loading
- Shared `RiskScorer` architecture
- Shared Presidio `AnalyzerEngine`
- Startup pipeline warm-up
- Runtime pipeline profiler
- Pipeline latency validation
- End-to-end FastAPI integration
- Runtime API verification
- Dynamic Data Masking tests (9/9 passed)
- Secret Protection Engine tests (10/10 passed)
- Output Consistency Validator
- Action Audit Logger
- Output validation endpoint
- Semantic response validation
- Adversarial response evaluation
- SEL end-to-end integration
- 99/99 backend tests passed

---

## Upcoming

- React frontend — core dashboard (Week 6)
- Frontend remaining pages + demo features (Week 6)
- Dockerisation and deployment (Week 7)
- Document Scanner (Week 7)
- Research paper completion (Week 8)
- Demo video and final evaluation (Week 8)
- Final polish, bug fixes, and submission (Week 9)

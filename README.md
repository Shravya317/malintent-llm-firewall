# MalIntent – Multi-Layer LLM Firewall

A lightweight multi-layer security framework designed to detect, classify and prevent prompt injection attacks against Large Language Models (LLMs).

---

## Status

✅ Week 1 Completed – Pattern Detection Engine (Layer A)
✅ Week 2 Completed – ML Detection Engine (Layer B)
✅ Week 3 Completed – Semantic Similarity Engine (Layer C) + Unified Risk Scorer
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
- Full `RiskResult` dataclass — JSON-serialisable contract for the FastAPI layer (Week 4) and Shravya's frontend (Week 5)
- Integration tested: **200/200 = 100% accuracy** on 100 attack + 100 safe prompts
- Average end-to-end latency: **62.4ms** (p95: 67.2ms) — well within 100ms budget

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
- Ablation study (docs/ablation_results.md)

---

## Upcoming

- FastAPI backend + SEL skeleton + storage security (Week 4)
- React frontend — core dashboard (Week 5)
- Frontend remaining pages + demo features (Week 6)
- Docker, deployment, SEL completion, output validator (Week 7)
- Research paper, demo video, final polish (Week 8)

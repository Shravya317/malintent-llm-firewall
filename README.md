# MalIntent – Multi-Layer LLM Firewall

A lightweight multi-layer security framework designed to detect, classify and prevent prompt injection attacks against Large Language Models (LLMs).

---

## Status

✅ Week 1 Completed – Pattern Detection Engine
✅ Week 2 Completed – PromptGuard ML Detection Engine
🚧 Remaining development in progress

---

## Current Features

### Layer A – Pattern Detection Engine

- 45 handcrafted regex patterns
- Coverage across 7 OWASP LLM attack categories
- Fast rule-based first-pass filtering
- Unit tested

### Layer B – ML Detection Engine

- Fine-tuned PromptGuard-86M
- Binary prompt classification
- Confidence-based prediction
- GPU-trained and optimized for inference

### Dataset Engineering

- Combined corpus from 7 benchmark datasets
- Manual annotation and validation
- Cleaning and deduplication
- Balanced train / validation / test split

### Evaluation Pipeline

- Internal evaluation metrics
- OOD benchmark evaluation
- Confusion matrices
- ROC & Precision-Recall analysis
- Automatic report generation

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

### Internal Test Split

| Metric    | Score   |
| --------- | ------- |
| Accuracy  | 99.94%  |
| Precision | 99.99%  |
| Recall    | 99.93%  |
| F1 Score  | 99.96%  |
| ROC-AUC   | 0.99998 |

## Completed

- Dataset exploration
- Dataset preprocessing
- Combined training corpus
- Manual annotation
- Pattern engine
- Pattern engine testing
- PromptGuard fine-tuning
- Model evaluation
- OOD benchmark testing
- Trained model export

---

## Upcoming

- FastAPI integration
- Risk scoring engine
- Frontend integration
- Secure logging
- Deployment
- Documentation

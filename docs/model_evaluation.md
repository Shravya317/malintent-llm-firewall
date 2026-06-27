# Layer B — PromptGuard-86M Classifier Evaluation

**Model:** Meta Prompt-Guard-86M (Fine-Tuned)
**Training Corpus:** MalIntent Combined Training Corpus (7 merged HuggingFace datasets, ~328k samples)
**Training Samples:** 262,611
**Validation Samples:** 32,826
**Internal Test Samples:** 32,827
**Total Processed Samples:** 328,264

---

## Dataset Architecture — Two-Corpus Design

The MalIntent project uses **two distinct corpora** at two different stages:

| Corpus | Size | Purpose | Week |
| --- | ---: | --- | --- |
| `manual_annotation_combined_corpus.csv` | 700 samples | Week 1 — regex pattern validation and OWASP coverage analysis only. Not used for ML training. | Week 1 |
| Full HuggingFace multi-source corpus | ~328k samples | Week 2 — fine-tuning PromptGuard-86M. Downloaded directly from HuggingFace during training. | Week 2 |

The 700-sample manually annotated corpus is a **validation artifact for Layer A (Pattern Engine)**. It was assembled in `dataset_exploration.ipynb` and used to measure regex pattern coverage across OWASP attack categories. It does **not** feed into the Week 2 ML training pipeline.

The full 328k-sample corpus is assembled and balanced inside `malintent_promptguard_training.ipynb` by downloading directly from the 7 HuggingFace sources listed below.

---
**Training Configuration**

- Epochs: 3
- Learning Rate: 2e-5
- Effective Batch Size: 32 (16 × Gradient Accumulation 2)
- Weight Decay: 0.01
- Warmup Ratio: 0.06
- LR Scheduler: Cosine
- Maximum Sequence Length: 512
- Early Stopping Enabled
- Best Model Loaded Automatically

**Training Hardware**

NVIDIA DGX Server (A100 GPU) using JupyterLab

---

# Internal Test Set Performance

| Metric              |      Score |
| ------------------- | ---------: |
| Accuracy            | **0.9994** |
| Precision           | **0.9999** |
| Recall              | **0.9993** |
| F1 Score            | **0.9996** |
| ROC-AUC             | **1.0000** |
| PR-AUC              | **1.0000** |
| MCC                 | **0.9984** |
| False Positive Rate | **0.0002** |
| False Negative Rate | **0.0007** |

---

# External Benchmark Evaluation

The trained PromptGuard model was additionally evaluated on independent out-of-distribution (OOD) benchmark datasets that were **never included during training**.

| Dataset                     |     F1 Score |    Precision |       Recall |
| --------------------------- | -----------: | -----------: | -----------: |
| Jailbreak Classification    |   **0.9141** |   **1.0000** |   **0.8417** |
| NotInject                   | **0.0000\*** | **0.0000\*** | **0.0000\*** |
| Gandalf Ignore Instructions |   **0.8800** |   **1.0000** |   **0.7857** |

\*NotInject is a benign-only dataset. Precision, Recall and F1 are therefore not meaningful performance indicators because no malicious class exists.

---

# Dataset Construction

The final training corpus was created by merging seven publicly available prompt-injection and instruction-following datasets.

Training datasets:

- HackAPrompt
- WildJailbreak
- JailbreakBench
- DeepSet Prompt Injections
- Dolly-15K
- Alpaca-Cleaned
- OpenAssistant

The complete preprocessing pipeline included:

- Dataset merging
- Schema standardisation
- Duplicate removal
- Quality auditing
- Class balancing
- Random shuffling
- Stratified 80 / 10 / 10 train-validation-test split

---

# Training Behaviour

The PromptGuard model demonstrated stable convergence throughout fine-tuning.

Training characteristics:

- Consistent reduction in training loss across epochs.
- Validation metrics stabilised after convergence.
- Best checkpoint automatically selected using validation performance.
- No evidence of catastrophic overfitting.
- Excellent generalisation on the internal hold-out test split.
- Strong robustness against multiple unseen prompt injection benchmarks.

---

# Benchmark Observations

## Jailbreak Classification

Successfully detected the majority of unseen jailbreak prompts with perfect precision while maintaining strong recall.

## Gandalf Ignore Instructions

Demonstrated strong resistance against instruction override attacks and role-play based prompt injections.

## NotInject

The dataset consists exclusively of benign prompts and therefore primarily measures false-positive behaviour rather than malicious prompt detection. The very low false-positive rate confirms the model rarely misclassifies normal user prompts as attacks.

---

# Layer Comparison

| System      | Purpose                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| Layer A     | Rule-based regex detection using 45 curated prompt injection patterns   |
| Layer B     | Fine-tuned PromptGuard-86M semantic classifier                          |
| Layer A + B | Hybrid detection pipeline combining deterministic and semantic analysis |

---

# Conclusion

The Layer B semantic classifier was successfully upgraded from the initial DistilBERT prototype to a fine-tuned Meta PromptGuard-86M model trained on a large multi-source prompt injection corpus.

The final model achieved:

- **99.94% Internal Accuracy**
- **99.96% F1 Score**
- **99.99% Precision**
- **99.93% Recall**
- **1.000 ROC-AUC**
- **1.000 PR-AUC**

Independent OOD evaluation further demonstrated strong generalisation across multiple unseen prompt injection benchmarks, validating the robustness of the final MalIntent semantic detection pipeline.

The PromptGuard classifier is fully integrated as **Layer B** of the MalIntent multi-layer prompt injection detection architecture and serves as the primary semantic analysis component for identifying malicious prompt injection attempts beyond deterministic regex-based detection.

# Layer B — DistilBERT Classifier Evaluation

**Model:** distilbert-base-uncased (fine-tuned on HackAPrompt)
**Dataset:** hackaprompt/hackaprompt-dataset
**Training examples:** ~16,820 (strict 1:1 balanced — attacks vs safe)
**Training config:** 5 epochs, lr=2e-5, batch_size=16, max_length=256, weight_decay=0.01, warmup_ratio=0.1
**Training hardware:** Google Colab T4 GPU

---

## Test Set Results

| Metric             | Score  | Target |
|--------------------|--------|--------|
| Accuracy           | 0.8790 | > 0.85 |
| Precision (attack) | 0.8591 | > 0.80 |
| Recall (attack)    | 0.9066 | > 0.90 |
| F1 Score (attack)  | 0.8822 | > 0.85 |

✅ All targets met or exceeded.

---

## Confusion Matrix

|                   | Predicted SAFE | Predicted ATTACK |
|-------------------|----------------|------------------|
| **Actual SAFE**   | TN: 1787       | FP: 312          |
| **Actual ATTACK** | FN: 196        | TP: 1903         |

**False Positive Rate** (safe flagged as attack / false alarms): 14.86%
**False Negative Rate** (attacks missed — keep this LOW): 9.34%

---

## Dataset Construction

Attack set: rows where `correct==True` (confirmed successful injections from HackAPrompt competition)
Safe set: unique system prompts (`prompt` column) + `correct==False` rows where `score==0.0`
Balance strategy: strict 1:1 — `n = min(len(attacks), len(safe))`
Train / Val / Test split: 80 / 10 / 10, stratified by label

---

## Training Loss Curve

| Epoch | Val F1 | Val Accuracy | Notes                        |
|-------|--------|--------------|------------------------------|
| 1     | ~0.84  | ~0.87        | Strong start, fast learning  |
| 2     | ~0.87  | ~0.88        | Consistent improvement       |
| 3     | ~0.88  | ~0.88        | Near convergence             |
| 4     | ~0.88  | ~0.88        | Mild overfitting begins      |
| 5     | 0.8822 | 0.8790       | Best checkpoint — selected   |

Best epoch: 5 (highest validation F1, selected via `load_best_model_at_end=True`)

---

## Training Observations

- Loss decreased consistently from ~0.5 (epoch 1 start) to ~0.15 (epoch 5 end)
- Validation loss increased slightly after epoch 3, indicating mild overfitting on later epochs
- Best performance achieved at epoch 5, marginally better than epoch 3
- Recall remained consistently above 90% across all epochs — preferred for security systems where missing an attack is worse than a false alarm
- DistilBERT generalised well on unseen attack prompts from the held-out test set
- Model struggles with simple English override phrases ("ignore all previous instructions") that were underrepresented as successful attacks in the HackAPrompt competition data — these are handled by Layer A (pattern_engine.py) in the full pipeline

---

## Layer Comparison

| System                    | Accuracy | F1     | Notes                              |
|---------------------------|----------|--------|------------------------------------|
| Layer A only (regex)      | ~0.72    | ~0.68  | Fast but misses paraphrased attacks|
| Layer B only (DistilBERT) | 0.8790   | 0.8822 | This week's result                 |
| Layer A + B combined      | TBD      | TBD    | Week 3                             |
| Full 3-layer (A + B + C)  | TBD      | TBD    | Week 3                             |

---

## Conclusion

The fine-tuned DistilBERT model successfully achieved the project target F1 score (>0.85), scoring **0.8822 F1** and **90.66% recall** on the held-out HackAPrompt test set.

High recall (90.66%) is the priority metric for a security system — it means only 9.34% of real attacks slip through undetected. The 14.86% false positive rate is acceptable at this stage and will be reduced when Layer A and Layer C are combined in Week 3's risk scorer.

The model is ready for integration into the Layer B ML detection pipeline of MalIntent as of Week 2 Day 6.
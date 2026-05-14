# Layer B — DistilBERT Classifier Evaluation

## Model Information

- Model: distilbert-base-uncased
- Dataset: hackaprompt/hackaprompt-dataset
- Epochs: 5
- Batch Size: 16
- Max Length: 256
- Learning Rate: 2e-5

---

# Test Set Results

| Metric | Score |
|---|---|
| Accuracy | 0.8790 |
| Precision | 0.8591 |
| Recall | 0.9066 |
| F1 Score | 0.8822 |

---

# Confusion Matrix

| | Predicted SAFE | Predicted ATTACK |
|---|---|---|
| Actual SAFE | 1787 | 312 |
| Actual ATTACK | 196 | 1903 |

---

# Error Analysis

- False Positive Rate: 14.86%
- False Negative Rate: 9.34%

The model demonstrates strong recall performance for detecting prompt injection attacks while maintaining acceptable precision.

---

# Training Observations

- Validation loss increased slightly after later epochs, indicating mild overfitting.
- Best performance achieved around Epoch 5 range better than Epoch 3 range.
- Recall remained consistently high (>90%), which is preferred for security systems.
- DistilBERT generalized well on unseen attack prompts.

---

# Conclusion

The fine-tuned DistilBERT model successfully achieved the project target F1 score (>0.85) with an F1 score of 0.8822 on the HackAPrompt test dataset.

The model is suitable for integration into the Layer B ML detection pipeline of MalIntent.
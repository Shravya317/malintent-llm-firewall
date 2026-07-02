"""
backend/scripts/run_ablation_benchmark.py
==========================================
Week 7 — Day 5.

Layer ablation benchmark for the MalIntent three-layer detection pipeline.

Runs the same evaluation corpus through three pipeline configurations:
  1. Layer A only    — pattern engine (regex, ~2 ms)
  2. Layer A + B     — pattern engine + PromptGuard-86M ML classifier
  3. Full A + B + C  — all three layers including FAISS semantic engine

For each configuration, computes precision / recall / F1 both:
  • Aggregate (binary macro)
  • Per OWASP LLM Top-10 attack category

Output is a CSV file used directly in the Week 8 research paper's Evaluation
section.

Usage
-----
# On Corpus 1 (700-sample manual annotation corpus):
python scripts/run_ablation_benchmark.py \
    --dataset notebooks/manual_annotation_combined_corpus \
    --output docs/ablation_results_corpus1.csv

# On each OOD benchmark:
python scripts/run_ablation_benchmark.py --dataset data/jailbreak_classification --output docs/ood_jailbreak.csv
python scripts/run_ablation_benchmark.py --dataset data/notinject            --output docs/ood_notinject.csv
python scripts/run_ablation_benchmark.py --dataset data/gandalf               --output docs/ood_gandalf.csv

CSV column schema (output)
--------------------------
config, category, precision, recall, f1, support, threshold
"""

from __future__ import annotations

import argparse
import logging
import time
from pathlib import Path
from typing import List, Tuple

import pandas as pd
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix

# ---------------------------------------------------------------------------
# MalIntent detection layer imports
# ---------------------------------------------------------------------------
# These modules must be importable from the script's working directory.
# Run from the backend/ directory or add backend/ to PYTHONPATH.

from malintent.pattern_engine import PatternEngine
from malintent.ml_classifier import MLClassifier
from malintent.semantic_engine import SemanticEngine
from malintent.risk_scorer import RiskScorer, RiskResult

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Risk score decision thresholds (must match production values in risk_scorer.py)
# ---------------------------------------------------------------------------
BLOCK_THRESHOLD = 70   # score > 70 → malicious prediction (label=1)
ALLOW_THRESHOLD = 30   # score < 30 → benign prediction (label=0)
# 30–70 → FLAG; treated as malicious for binary precision/recall purposes.

# ---------------------------------------------------------------------------
# Layer configurations to ablate
# ---------------------------------------------------------------------------
CONFIGS = {
    "layer_a_only":   ["A"],
    "layer_a_plus_b": ["A", "B"],
    "full_a_b_c":     ["A", "B", "C"],
}


# ---------------------------------------------------------------------------
# Scoring function
# ---------------------------------------------------------------------------

def score_with_layers(
    prompt: str,
    active_layers: List[str],
    pattern_engine: PatternEngine,
    ml_classifier: MLClassifier,
    semantic_engine: SemanticEngine,
) -> int:
    """
    Score a single prompt using only the specified subset of layers.

    Returns a binary label:
      1 — malicious (risk_score > ALLOW_THRESHOLD)
      0 — benign    (risk_score <= ALLOW_THRESHOLD)

    The risk_scorer's confidence-weighted aggregation is replicated here per
    layer subset so the ablation fairly represents each configuration.
    """
    layer_a_score = 0.0
    layer_b_score = 0.0
    layer_c_score = 0.0

    if "A" in active_layers:
        result_a = pattern_engine.scan(prompt)
        layer_a_score = result_a.confidence  # 0.0–1.0

    if "B" in active_layers:
        result_b = ml_classifier.classify(prompt)
        layer_b_score = result_b.injection_score  # 0.0–1.0

    if "C" in active_layers:
        result_c = semantic_engine.query(prompt)
        layer_c_score = result_c.max_similarity  # 0.0–1.0

    # Weighted aggregation (mirrors risk_scorer.py logic):
    # Weight: A=0.25, B=0.55, C=0.20 — B dominates as the highest-accuracy layer.
    weights = {
        "A": 0.25 if "A" in active_layers else 0.0,
        "B": 0.55 if "B" in active_layers else 0.0,
        "C": 0.20 if "C" in active_layers else 0.0,
    }
    total_weight = sum(weights.values()) or 1.0
    normalised_weight = {k: v / total_weight for k, v in weights.items()}

    composite = (
        layer_a_score * normalised_weight["A"]
        + layer_b_score * normalised_weight["B"]
        + layer_c_score * normalised_weight["C"]
    )
    risk_score = int(composite * 100)

    # Binary label: FLAG and BLOCK both count as "detected malicious" (label=1).
    return 1 if risk_score > ALLOW_THRESHOLD else 0


# ---------------------------------------------------------------------------
# Dataset loader
# ---------------------------------------------------------------------------

def load_dataset(dataset_path: str) -> pd.DataFrame:
    """
    Load an evaluation corpus CSV.

    Required columns
    ----------------
    text          — the prompt text to evaluate
    label         — ground-truth binary label (1=malicious, 0=benign)

    Optional columns
    ----------------
    owasp_category — OWASP LLM Top-10 attack category string, e.g.
                     "direct_injection", "jailbreak_persona", etc.
                     Rows without this column are assigned "unknown".

    The function tries {dataset_path}.csv, then {dataset_path} as-is.
    """
    path = Path(dataset_path)
    if not path.suffix:
        path = path.with_suffix(".csv")

    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}\n"
            "Expected a CSV with columns: text, label[, owasp_category]"
        )

    df = pd.read_csv(path)

    required = {"text", "label"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(
            f"Dataset {path} is missing required columns: {missing}\n"
            f"Found columns: {list(df.columns)}"
        )

    if "owasp_category" not in df.columns:
        logger.warning(
            "Dataset has no 'owasp_category' column — "
            "per-category breakdown will be reported under 'unknown'."
        )
        df["owasp_category"] = "unknown"

    # Coerce label to int (some datasets use string "0"/"1").
    df["label"] = df["label"].astype(int)

    logger.info(
        "Loaded dataset: %s — %d rows (%d malicious, %d benign)",
        path,
        len(df),
        (df["label"] == 1).sum(),
        (df["label"] == 0).sum(),
    )
    return df


# ---------------------------------------------------------------------------
# Main benchmark runner
# ---------------------------------------------------------------------------

def run_benchmark(dataset_path: str, output_path: str) -> pd.DataFrame:
    """
    Run the full layer ablation and write results to output_path.

    Returns the results DataFrame for testing purposes.
    """
    df = load_dataset(dataset_path)

    logger.info("Initialising detection layers...")
    pattern_engine  = PatternEngine()
    ml_classifier   = MLClassifier()
    semantic_engine = SemanticEngine()
    logger.info("All layers loaded.")

    results = []

    for config_name, active_layers in CONFIGS.items():
        logger.info(
            "Running config '%s' (active layers: %s) on %d samples...",
            config_name,
            active_layers,
            len(df),
        )

        t_start = time.perf_counter()
        preds = [
            score_with_layers(
                prompt=row["text"],
                active_layers=active_layers,
                pattern_engine=pattern_engine,
                ml_classifier=ml_classifier,
                semantic_engine=semantic_engine,
            )
            for _, row in df.iterrows()
        ]
        elapsed_s = time.perf_counter() - t_start
        avg_ms = (elapsed_s / len(df)) * 1000

        labels = df["label"].tolist()

        # --- Aggregate metrics ---
        p_agg, r_agg, f1_agg, _ = precision_recall_fscore_support(
            labels, preds, average="binary", zero_division=0
        )
        tn, fp, fn, tp = confusion_matrix(labels, preds, labels=[0, 1]).ravel()

        results.append({
            "config":         config_name,
            "category":       "_aggregate_",
            "precision":      round(float(p_agg), 6),
            "recall":         round(float(r_agg), 6),
            "f1":             round(float(f1_agg), 6),
            "support":        int(sum(labels)),
            "true_positives": int(tp),
            "false_positives":int(fp),
            "true_negatives": int(tn),
            "false_negatives":int(fn),
            "avg_latency_ms": round(avg_ms, 3),
        })

        logger.info(
            "  %s | aggregate — P=%.4f  R=%.4f  F1=%.4f  (%.1f ms/sample)",
            config_name, p_agg, r_agg, f1_agg, avg_ms,
        )

        # --- Per-OWASP-category metrics ---
        for category in sorted(df["owasp_category"].unique()):
            mask = df["owasp_category"] == category
            cat_labels = df.loc[mask, "label"].tolist()
            cat_preds  = [preds[i] for i, m in enumerate(mask) if m]

            if not cat_labels:
                continue

            p_cat, r_cat, f1_cat, _ = precision_recall_fscore_support(
                cat_labels, cat_preds, average="binary", zero_division=0
            )

            results.append({
                "config":          config_name,
                "category":        category,
                "precision":       round(float(p_cat), 6),
                "recall":          round(float(r_cat), 6),
                "f1":              round(float(f1_cat), 6),
                "support":         int(sum(cat_labels)),
                "true_positives":  None,
                "false_positives": None,
                "true_negatives":  None,
                "false_negatives": None,
                "avg_latency_ms":  None,
            })

            logger.info(
                "  %s | %-30s — P=%.4f  R=%.4f  F1=%.4f  (n=%d)",
                config_name, category, p_cat, r_cat, f1_cat, len(cat_labels),
            )

    # --- Write output ---
    results_df = pd.DataFrame(results)
    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    results_df.to_csv(out_path, index=False)
    logger.info("Results written to %s", out_path)

    return results_df


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "MalIntent layer ablation benchmark. "
            "Evaluates Layer A only → A+B → A+B+C on a labelled corpus."
        )
    )
    parser.add_argument(
        "--dataset",
        required=True,
        help=(
            "Path to the evaluation CSV (with or without .csv extension). "
            "Required columns: text, label. Optional: owasp_category."
        ),
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output CSV file path, e.g. docs/ablation_results_corpus1.csv",
    )
    args = parser.parse_args()

    logger.info("=== MalIntent Layer Ablation Benchmark ===")
    logger.info("Dataset : %s", args.dataset)
    logger.info("Output  : %s", args.output)

    run_benchmark(dataset_path=args.dataset, output_path=args.output)

    logger.info("=== Benchmark complete. ===")


if __name__ == "__main__":
    main()
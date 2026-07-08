"""
backend/scripts/run_ablation_benchmark.py
==========================================

Layer ablation benchmark for the MalIntent three-layer detection pipeline.

Runs the same evaluation corpus through three pipeline configurations:
  1. Layer A only    — pattern engine (regex, ~2 ms)
  2. Layer A + B     — pattern engine + PromptGuard-86M ML classifier
  3. Full A + B + C  — all three layers including FAISS semantic engine

For each configuration, computes precision / recall / F1 both:
  • Aggregate (binary macro)
  • Per OWASP LLM Top-10 attack category

Output is a CSV file used directly for evaluation.

Usage
-----
# On Corpus 1 (700-sample manual annotation corpus):
python scripts/run_ablation_benchmark.py \
    --dataset notebooks/manual_annotation_combined_corpus \
    --output docs/benchmark_logs/ablation_results_corpus1.csv

# On each OOD benchmark:
python scripts/run_ablation_benchmark.py --dataset data/jailbreak_classification --output docs/benchmark_logs/ood_jailbreak.csv
python scripts/run_ablation_benchmark.py --dataset data/notinject            --output docs/benchmark_logs/ood_notinject.csv
python scripts/run_ablation_benchmark.py --dataset data/gandalf               --output docs/benchmark_logs/ood_gandalf.csv

CSV column schema (output)
--------------------------
config, category, precision, recall, f1, support, threshold

Recent update
-------------
The scoring logic below no longer hand-reimplements the layer-weighted
aggregation. It now calls RiskScorer.score_ablation(), the production
ablation entry point added to risk_scorer.py. See the inline comments in
score_with_layers() for the full list of API changes and why each one was
necessary — the short version is that this script's private copy of the
weights/thresholds had drifted out of sync with production and was reading
dataclass fields that no longer exist on the current layer results.

Loader fix
----------
load_dataset() previously assumed every corpus's `label` column was already
clean, machine-written 0/1 data — true for the three OOD benchmarks (data/
jailbreak_classification.csv, data/notinject.csv, data/gandalf.csv), which
are generated programmatically. It is NOT true for the manual annotation
corpus (notebooks/manual_annotation_combined_corpus.csv), which is a
700-row hand-assembled combination of 7 upstream HuggingFace datasets and
has the usual mess that comes with that: blank/missing label cells on a
handful of rows, and label values that arrive as strings (some with stray
whitespace) rather than already-int64. Calling `.astype(int)` directly on
that column is what raised:

    pandas.errors.IntCastingNaNError: Cannot convert non-finite values
    (NA or inf) to integer

because pandas will not silently truncate a NaN into an int dtype.

The loader now cleans `label` explicitly, in this order, before casting:
  1. strip whitespace on string-typed values
  2. coerce to numeric (invalid strings become NaN, not a hard crash)
  3. drop rows where label is missing/NaN (logged, not silent)
  4. validate that every remaining value is in {0, 1}; anything else
     (e.g. a stray "2" or "yes") raises a clear ValueError naming the
     offending row(s) rather than failing deep inside sklearn later
  5. cast to int only after the column is guaranteed finite

This is intentionally defensive rather than assuming "the manual corpus is
the only messy one" — the same cleaning path now runs for every dataset,
so the three already-working OOD benchmarks take the same code path they
always did (their label columns are already clean, so every step above is
a no-op for them) and stay byte-for-byte compatible.
"""

from __future__ import annotations

import argparse
import logging
import time
from pathlib import Path
from typing import List, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix

# ---------------------------------------------------------------------------
# MalIntent detection layer imports
# ---------------------------------------------------------------------------
# These modules must be importable from the script's working directory.
# Run from the backend/ directory or add backend/ to PYTHONPATH.
#
# API CHANGE #1: we no longer import PatternEngine / MLClassifier /
# SemanticEngine directly and construct them ourselves. RiskScorer already
# owns "load all three layers once" as its job (and Layer B
# is fetched through the get_classifier() process-wide singleton instead of
# being constructed directly). Re-implementing that wiring here duplicated
# logic that already lives in risk_scorer.py and is exactly the kind of
# duplication that caused this script to drift out of sync with production
# in the first place. We now import only RiskScorer.
from malintent.risk_scorer import RiskScorer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Layer configurations to ablate
# ---------------------------------------------------------------------------
CONFIGS = {
    "layer_a_only": ["A"],
    "layer_a_plus_b": ["A", "B"],
    "full_a_b_c": ["A", "B", "C"],
}


# ---------------------------------------------------------------------------
# Scoring function
# ---------------------------------------------------------------------------


def score_with_layers(prompt: str, active_layers: List[str], scorer: RiskScorer) -> int:
    """
    Score a single prompt using only the specified subset of layers.

    Returns a binary label:
      1 — malicious (RiskScorer decision is FLAG or BLOCK)
      0 — benign    (RiskScorer decision is ALLOW)

    API CHANGE #2 — delegate to RiskScorer.score_ablation() instead of
    reimplementing the weighted aggregation by hand.
        Previously this function called PatternEngine.scan(),
        MLClassifier.predict(), and SemanticEngine.query()/search() itself,
        then recomputed a weighted composite score using LOCAL constants
        (A=0.25, B=0.55, C=0.20) and a LOCAL threshold (ALLOW_THRESHOLD=30).
        Those values are no longer correct: current risk_scorer.py uses
        WEIGHT_A=0.30, WEIGHT_B=0.45, WEIGHT_C=0.25, and the ALLOW/FLAG
        boundary is now 25, not 30 (see risk_scorer.py's SCORE_FLAG). Rather
        than re-duplicate (and now also re-fix) those constants here,
        risk_scorer.py exposes score_ablation(prompt, layers=<str>) as the
        supported public entry point for exactly this kind of per-layer-subset
        evaluation, including the >=0.90 semantic-similarity BLOCK override
        that production scoring applies. Using it keeps this benchmark
        permanently in sync with whatever risk_scorer.py's weights/thresholds
        are, instead of silently drifting again next time they change.

    API CHANGE #3 — semantic_engine.py's public method is now `search()`,
        not `query()`; ml_classifier.py's ClassifierResult has no
        `injection_score` field (it exposes `malicious_probability` /
        `benign_probability` instead); and pattern_engine.py's scan() result
        field is `highest_confidence` (this one hadn't changed). All three
        of those field/method lookups were happening manually in the old
        version of this function. Calling score_ablation() sidesteps the
        need to know any of these layer-internal field names at all, since
        RiskScorer itself already reads the current fields correctly.

    API CHANGE #4 — binary decision rule.
        Old rule: `risk_score > ALLOW_THRESHOLD` (ALLOW_THRESHOLD=30, a local
        constant duplicating production's old FLAG boundary).
        New rule: `decision != "ALLOW"` using RiskResult-style `.decision`
        returned by score_ablation() ("ALLOW" | "FLAG" | "BLOCK"). This is
        the same "FLAG and BLOCK both count as detected malicious" semantics
        as before, but reads the *current* production threshold (now 25)
        instead of a stale local copy (30).
    """
    layers_str = "".join(active_layers)  # e.g. ["A", "B"] -> "AB"
    result = scorer.score_ablation(prompt, layers=layers_str)
    return 0 if result.decision == "ALLOW" else 1


# ---------------------------------------------------------------------------
# Dataset loader
# ---------------------------------------------------------------------------

# Labels are considered valid iff, after cleaning, they equal one of these.
_VALID_LABELS = {0, 1}


def _clean_label_column(df: pd.DataFrame, source: Path) -> pd.DataFrame:
    """
    Clean df['label'] in place-safe fashion and return the filtered frame.

    Steps (see module docstring "loader fix" section for rationale):
      1. strip whitespace off string values
      2. coerce to numeric (bad strings -> NaN instead of raising)
      3. drop rows with missing/NaN label, logging how many were dropped
      4. validate every remaining value is in {0, 1}
      5. cast to a clean int column

    Runs unconditionally on every dataset. For already-clean corpora
    (the three OOD benchmarks) every step below is a no-op other than the
    final dtype cast, so their behavior/output is unchanged.
    """
    n_before = len(df)

    # Step 1: strip whitespace on string-typed labels (e.g. "1 ", " 0").
    # Non-string values (already int/float) pass through unchanged.
    df["label"] = df["label"].apply(lambda v: v.strip() if isinstance(v, str) else v)

    # Step 2: coerce to numeric. Anything that can't be parsed (empty
    # string, "NA", garbage text, etc.) becomes NaN rather than raising.
    df["label"] = pd.to_numeric(df["label"], errors="coerce")

    # Step 3: drop rows where label is missing/NaN.
    missing_mask = df["label"].isna()
    n_missing = int(missing_mask.sum())
    if n_missing:
        dropped_preview = df.loc[missing_mask].head(5)
        logger.warning(
            "Dataset %s: dropping %d/%d rows with missing/unparseable "
            "'label' values. First few:\n%s",
            source,
            n_missing,
            n_before,
            dropped_preview.to_string(),
        )
        df = df.loc[~missing_mask].copy()

    # Step 4: validate every remaining value is a genuine 0/1 label.
    # (Catches things like "2", "-1", "yes" that parsed numerically but
    # aren't a valid binary label — fail loudly instead of silently
    # corrupting precision/recall downstream.)
    invalid_mask = ~df["label"].isin(_VALID_LABELS)
    if invalid_mask.any():
        bad_rows = df.loc[invalid_mask, ["label"]]
        raise ValueError(
            f"Dataset {source} contains {int(invalid_mask.sum())} row(s) "
            f"with a 'label' value outside {_VALID_LABELS} after cleaning. "
            f"Offending rows (index -> label):\n{bad_rows.to_string()}"
        )

    # Step 5: now that the column is finite and validated, casting to int
    # is safe (this is the line that previously raised IntCastingNaNError).
    df["label"] = df["label"].astype(int)

    n_after = len(df)
    if n_after != n_before:
        logger.info(
            "Dataset %s: %d rows after label cleaning (was %d).",
            source,
            n_after,
            n_before,
        )

    return df


def load_dataset(dataset_path: str) -> pd.DataFrame:
    """
    Load an evaluation corpus CSV.

    Supports two column schemas interchangeably:

      Original benchmark schema      Manual annotation corpus schema
      --------------------------     --------------------------------
      text                           prompt
      label                          label
      owasp_category (optional)      attack_type

    Required (after aliasing)
    --------------------------
    text          — the prompt text to evaluate
    label         — ground-truth binary label (1=malicious, 0=benign)

    Optional (after aliasing)
    --------------------------
    owasp_category — OWASP LLM Top-10 attack category string, e.g.
                     "direct_injection", "jailbreak_persona", etc.
                     Rows without this column are assigned "unknown".

    Any '#'-prefixed lines (e.g. the manual corpus's descriptive header
    block) are treated as comments and ignored by the CSV parser.

    The function tries {dataset_path}.csv, then {dataset_path} as-is.
    """
    path = Path(dataset_path)
    if not path.suffix:
        path = path.with_suffix(".csv")

    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}\n"
            "Expected a CSV with columns: text, label[, owasp_category] "
            "(or prompt, label[, attack_type])"
        )

    # Ignore comment/header-block lines (e.g. the manual corpus's
    # descriptive '#'-prefixed preamble).
    df = pd.read_csv(path, comment="#")

    # --- Schema aliasing: accept either column naming convention. ---
    if "prompt" in df.columns and "text" not in df.columns:
        df = df.rename(columns={"prompt": "text"})

    if "attack_type" in df.columns and "owasp_category" not in df.columns:
        df = df.rename(columns={"attack_type": "owasp_category"})

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

    # --- Label cleaning (handles both clean OOD corpora and the messier
    #     manually-assembled corpus in one code path). ---
    df = _clean_label_column(df, source=path)

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
    # API CHANGE #5: a single RiskScorer() now owns all three layers,
    # including Layer B via the get_classifier() singleton internally. We
    # build exactly one RiskScorer for the whole run (previously the script
    # built PatternEngine/MLClassifier/SemanticEngine directly, once each,
    # which is the same "load once" intent — this just routes it through
    # the object that now owns that responsibility).
    scorer = RiskScorer()
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
                scorer=scorer,
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

        results.append(
            {
                "config": config_name,
                "category": "_aggregate_",
                "precision": round(float(p_agg), 6),
                "recall": round(float(r_agg), 6),
                "f1": round(float(f1_agg), 6),
                "support": int(sum(labels)),
                "true_positives": int(tp),
                "false_positives": int(fp),
                "true_negatives": int(tn),
                "false_negatives": int(fn),
                "avg_latency_ms": round(avg_ms, 3),
            }
        )

        logger.info(
            "  %s | aggregate — P=%.4f  R=%.4f  F1=%.4f  (%.1f ms/sample)",
            config_name,
            p_agg,
            r_agg,
            f1_agg,
            avg_ms,
        )

        # --- Per-OWASP-category metrics ---
        for category in sorted(df["owasp_category"].unique()):
            mask = df["owasp_category"] == category
            cat_labels = df.loc[mask, "label"].tolist()
            cat_preds = [preds[i] for i, m in enumerate(mask) if m]

            if not cat_labels:
                continue

            p_cat, r_cat, f1_cat, _ = precision_recall_fscore_support(
                cat_labels, cat_preds, average="binary", zero_division=0
            )

            results.append(
                {
                    "config": config_name,
                    "category": category,
                    "precision": round(float(p_cat), 6),
                    "recall": round(float(r_cat), 6),
                    "f1": round(float(f1_cat), 6),
                    "support": int(sum(cat_labels)),
                    "true_positives": None,
                    "false_positives": None,
                    "true_negatives": None,
                    "false_negatives": None,
                    "avg_latency_ms": None,
                }
            )

            logger.info(
                "  %s | %-30s — P=%.4f  R=%.4f  F1=%.4f  (n=%d)",
                config_name,
                category,
                p_cat,
                r_cat,
                f1_cat,
                len(cat_labels),
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
            "Required columns: text, label (or prompt, label). "
            "Optional: owasp_category (or attack_type)."
        ),
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output CSV file path, e.g. docs/benchmark_logs/ablation_results_corpus1.csv",
    )
    args = parser.parse_args()

    logger.info("=== MalIntent Layer Ablation Benchmark ===")
    logger.info("Dataset : %s", args.dataset)
    logger.info("Output  : %s", args.output)

    run_benchmark(dataset_path=args.dataset, output_path=args.output)

    logger.info("=== Benchmark complete. ===")


if __name__ == "__main__":
    main()

# =============================================================================
# download_ood_datasets.py
# =============================================================================
#
# Generates the external Out-of-Distribution (OOD) benchmark datasets used
# throughout the MalIntent evaluation pipeline.
#
# The generated CSV files are NOT used for training the PromptGuard model.
# Instead, they are reproducible snapshots of independent Hugging Face
# benchmark datasets that evaluate the semantic detector's ability to
# generalize beyond the training distribution.
#
# Generated datasets
# ------------------
#
# 1. jailbreak_classification.csv
#    Source: jackhhao/jailbreak-classification
#
#    Purpose: Evaluates robustness against unseen jailbreak prompt injections.
#
#    Labels: 1 = malicious
#
# 2. notinject.csv
#    Source: leolee99/NotInject
#
#    Purpose: Benign-only benchmark used for measuring false-positive behaviour.
#
#    Labels: 0 = benign
#
# 3. gandalf.csv
#    Source: Lakera/gandalf_ignore_instructions
#
#    Purpose: Evaluates resistance against instruction override attacks.
#
#    Labels: 1 = malicious
#
# Output
# ------
#
# backend/data/
#     ├── jailbreak_classification.csv
#     ├── notinject.csv
#     └── gandalf.csv
#
# These datasets are consumed directly by: scripts/run_ablation_benchmark.py and reproduce the OOD benchmark evaluation reported in the MalIntent project documentation.
#
# =============================================================================

import pandas as pd
from datasets import load_dataset
import os

from pathlib import Path

def dataset_exists(path: str) -> bool:
    return Path(path).exists()

def main():
    # Ensure the output directory exists
    os.makedirs("backend/data", exist_ok=True)
    
    # =============================================================================
    # Dataset 1 — Jailbreak Classification
    # =============================================================================
    #
    # Retain only samples labelled as "jailbreak" from the official test split.
    # Every retained sample represents a malicious prompt injection attempt.
    #
    # Output schema:
    #   text
    #   label
    #   owasp_category
    #
    # =============================================================================

    print("Processing jailbreak-classification...")
    ds_jb = load_dataset("jackhhao/jailbreak-classification", split="test")
    df_jb = ds_jb.to_pandas()
    
    # Keep ONLY rows where type == "jailbreak"
    df_jb = df_jb[df_jb["type"] == "jailbreak"].copy()
    
    # Create required schema
    out_jb = pd.DataFrame({
        "text": df_jb["prompt"],
        "label": 1,
        "owasp_category": "jailbreak"
    })
    jb_path = "backend/data/jailbreak_classification.csv"

    if dataset_exists(jb_path):
      print("✓ jailbreak_classification.csv already exists. Skipping generation.")
    else:
        out_jb.to_csv(jb_path, index=False)
        print("✓ Generated jailbreak_classification.csv")

    # =============================================================================
    # Dataset 2 — NotInject
    # =============================================================================
    #
    # Merge all official dataset splits into a single benchmark.
    # This dataset contains benign prompts only and is therefore used to
    # evaluate false-positive behaviour.
    #
    # =============================================================================

    print("Processing NotInject...")
    ds_ni = load_dataset("leolee99/NotInject")
    
    # Merge every split
    dfs_ni = []
    for split in ds_ni.keys():
        dfs_ni.append(ds_ni[split].to_pandas())
    df_ni = pd.concat(dfs_ni, ignore_index=True)
    
    # Create required schema
    out_ni = pd.DataFrame()
    out_ni["text"] = df_ni["prompt"]
    out_ni["label"] = 0
    
    if "category" in df_ni.columns:
        out_ni["owasp_category"] = df_ni["category"]
    else:
        out_ni["owasp_category"] = "benign"
        
    ni_path = "backend/data/notinject.csv"

    if dataset_exists(ni_path):
        print("✓ notinject.csv already exists. Skipping generation.")
    else:
        out_ni.to_csv(ni_path, index=False)
        print("✓ Generated notinject.csv")

    # =============================================================================
    # Dataset 3 — Gandalf Ignore Instructions
    # =============================================================================
    #
    # Converts the official Lakera Gandalf evaluation split into the common
    # benchmark schema used throughout the MalIntent project.
    #
    # Every prompt is labelled as malicious because the benchmark focuses on
    # instruction override attacks.
    #
    # =============================================================================

    print("Processing gandalf...")
    ds_gd = load_dataset("Lakera/gandalf_ignore_instructions", split="test")
    df_gd = ds_gd.to_pandas()
    
    # Create required schema
    out_gd = pd.DataFrame({
        "text": df_gd["text"],
        "label": 1,
        "owasp_category": "instruction_override"
    })
    gd_path = "backend/data/gandalf.csv"
    
    if dataset_exists(gd_path):
        print("✓ gandalf.csv already exists. Skipping generation.")
    else:
        out_gd.to_csv(gd_path, index=False)
        print("✓ Generated gandalf.csv")

    print("\n======================================================")
    print("MalIntent OOD benchmark datasets generated successfully.")
    print("Location : backend/data/")
    print("Datasets :")
    print("  • jailbreak_classification.csv")
    print("  • notinject.csv")
    print("  • gandalf.csv")
    print("======================================================")

if __name__ == "__main__":
    main()
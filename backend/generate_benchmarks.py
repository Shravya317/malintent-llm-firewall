import pandas as pd
from datasets import load_dataset
import os

def main():
    # Ensure the output directory exists
    os.makedirs("backend/data", exist_ok=True)
    
    # ----------------------------------------------------
    # 1. jailbreak_classification.csv
    # ----------------------------------------------------
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
    out_jb.to_csv("backend/data/jailbreak_classification.csv", index=False)
    print("Saved backend/data/jailbreak_classification.csv")
    
    # ----------------------------------------------------
    # 2. notinject.csv
    # ----------------------------------------------------
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
        
    out_ni.to_csv("backend/data/notinject.csv", index=False)
    print("Saved backend/data/notinject.csv")
    
    # ----------------------------------------------------
    # 3. gandalf.csv
    # ----------------------------------------------------
    print("Processing gandalf...")
    ds_gd = load_dataset("Lakera/gandalf_ignore_instructions", split="test")
    df_gd = ds_gd.to_pandas()
    
    # Create required schema
    out_gd = pd.DataFrame({
        "text": df_gd["text"],
        "label": 1,
        "owasp_category": "instruction_override"
    })
    out_gd.to_csv("backend/data/gandalf.csv", index=False)
    print("Saved backend/data/gandalf.csv")
    
    print("All datasets processed successfully!")

if __name__ == "__main__":
    main()

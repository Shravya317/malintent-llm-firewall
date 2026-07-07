import json
import csv
import re
import sys
import os

def extract_keywords():
    keywords = {}
    
    # 1. Parse pattern_engine.py (regexes)
    pattern_file = os.path.join("backend", "malintent", "pattern_engine.py")
    if os.path.exists(pattern_file):
        with open(pattern_file, "r", encoding="utf-8") as f:
            content = f.read()
            match = re.search(r'PATTERN_GROUPS\s*=\s*({[\s\S]*?\n})', content)
            if match:
                group_text = match.group(1)
                strings = re.findall(r'r"([^"]+)"', group_text)
                for s in strings:
                    clean_s = re.sub(r'[\^\$\\\(\)\?\.\*\|\[\]]', '', s)
                    clean_s = clean_s.lower().strip()
                    if len(clean_s) > 2 and clean_s not in keywords:
                        keywords[clean_s] = "Matched high-confidence regex injection pattern"

    # 2. Parse attack_phrases.json
    attack_phrases_file = os.path.join("backend", "malintent", "data", "attack_phrases.json")
    if os.path.exists(attack_phrases_file):
        with open(attack_phrases_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data.get("phrases", []):
                phrase = item.get("phrase", "").lower()
                category = item.get("category", "")
                
                clean_phrase = re.sub(r'[^\w\s]$', '', phrase)
                
                if clean_phrase and clean_phrase not in keywords:
                    keywords[clean_phrase] = f"Matches known {category} attack vector (Semantic ML Model)"
                    
    # 3. Parse CSV
    csv_file = os.path.join("backend", "notebooks", "manual_annotation_combined_corpus.csv")
    if os.path.exists(csv_file):
        with open(csv_file, "r", encoding="utf-8") as f:
            lines = [line for line in f if not line.startswith('#')]
            reader = csv.reader(lines)
            next(reader, None)
            for row in reader:
                if len(row) >= 4:
                    label = row[2]
                    if label == "1":
                        prompt = row[1].lower()
                        attack_type = row[3]
                        
                        words = prompt.split()
                        if len(words) > 3:
                            signature = " ".join(words[:4])
                        else:
                            signature = prompt
                            
                        signature = re.sub(r'[^\w\s]', '', signature)
                        signature = signature.strip()
                        
                        if signature and signature not in keywords:
                            keywords[signature] = f"Matches real-world {attack_type} injection attempt (OOD Dataset)"

    js_output = "const ATTACK_KEYWORDS = [\n"
    for text, reason in keywords.items():
        text = text.replace("'", "\\'")
        reason = reason.replace("'", "\\'")
        js_output += f"  {{ text: '{text}', reason: '{reason}' }},\n"
        
    js_output += "]\n"
    
    with open(os.path.join("backend", "generated_keywords.txt"), "w", encoding="utf-8") as f:
        f.write(js_output)
        
    print(f"Extracted {len(keywords)} keywords and saved to backend/generated_keywords.txt")

if __name__ == "__main__":
    extract_keywords()

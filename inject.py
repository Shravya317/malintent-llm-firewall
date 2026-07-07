import os

def inject():
    with open("backend/generated_keywords.txt", "r", encoding="utf-8") as f:
        new_keywords = f.read()
        
    additional_keywords = (
        "  { text: 'dan', reason: 'Explicit jailbreak keyword (Do Anything Now)' },\n"
        "  { text: 'you are a dan', reason: 'Explicit jailbreak keyword (Do Anything Now)' },\n"
        "  { text: 'database', reason: 'Targeting backend infrastructure' },\n"
        "  { text: 'reveal your', reason: 'Data exfiltration attempt' },\n"
        "  { text: 'system prompt', reason: 'Attempting to leak model instructions' },\n"
        "  { text: 'unrestricted', reason: 'Attempting to bypass safety filters' },\n"
        "  { text: 'ignore all previous instructions', reason: 'Direct prompt injection attempt' },\n"
        "  { text: 'disregard the financial data', reason: 'Context manipulation attempt' },\n"
        "]\n"
    )
    new_keywords = new_keywords.replace("]\n", additional_keywords)
        
    jsx_path = os.path.join("frontend", "src", "components", "ThreatAnalysis.jsx")
    with open(jsx_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    start_str = "const ATTACK_KEYWORDS = ["
    end_str = "]\n\n\nfunction generateSuspiciousSegments(promptText) {"
    
    start_idx = content.find(start_str)
    # The previous inject might have changed newline spacing before function generateSuspiciousSegments
    end_idx = content.find("]\n\nfunction generateSuspiciousSegments")
    if end_idx == -1:
        end_idx = content.find("]\nfunction generateSuspiciousSegments")
    if end_idx == -1:
        end_idx = content.find("]\n\n\nfunction generateSuspiciousSegments")
    
    if start_idx != -1 and end_idx != -1:
        end_idx += 2 
        new_content = content[:start_idx] + new_keywords + "\n" + content[end_idx:]
        
        with open(jsx_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Successfully injected new ATTACK_KEYWORDS array.")
    else:
        print("Failed to find ATTACK_KEYWORDS bounds.")

if __name__ == "__main__":
    inject()

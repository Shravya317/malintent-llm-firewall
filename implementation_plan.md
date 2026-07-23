# The Ultimate Guide: LLM Firewall Chrome Extension

This is the complete, full-fledged implementation plan. It details exactly what backend changes you need to make, the full code for your Chrome extension, and **two new ideas** I’ve added to make the extension feel like a premium, professional product.

---

## 💡 Proposed Enhancements (The "Better Ideas")
To make this extension feel state-of-the-art for the user, I have added two new features to this plan:
1. **The "Analyzing..." Loading State:** When the user presses Enter, the Vercel API takes a few milliseconds to respond. Instead of the website looking "frozen", the extension will now instantly blur the text box and show an *"Analyzing Prompt..."* spinner. This builds trust!
2. **The "Bypass" Option for Flagged Prompts:** For medium-risk (FLAGGED) prompts, we currently force them to edit it. I have added a *"Send Anyway"* button alongside the *"Edit Prompt"* button, giving the user ultimate autonomy if they believe it's a false positive.

---

## Part 1: The Backend Changes (Your To-Do List)
You must make these 3 exact changes in your current Vercel repository before the extension will work perfectly. 

### 1. Update `backend/schemas.py`
Open `schemas.py`, find the `ScanInputResponse` class, and add the new `scrubbed_prompt` field at the bottom.
```python
class ScanInputResponse(BaseModel):
    decision: str  
    risk_score: float  
    attack_category: Optional[str]  
    layers_triggered: List[str]  
    layer_a_matched: bool
    layer_b_confidence: float  
    layer_c_top_matches: List[LayerCMatch] 
    latency_ms: float  
    log_id: int  
    # ⬇️ ADD THIS EXACT LINE ⬇️
    scrubbed_prompt: Optional[str] = None
```

### 2. Update `backend/routers/scan.py`
Open `scan.py`, go to the `scan_input` function, scroll to the very bottom where the function ends, and add the `store_scrubbed` variable to the return statement.
```python
    return ScanInputResponse(
        decision            = result.decision,
        risk_score          = float(result.risk_score),
        attack_category     = result.primary_category,
        layers_triggered    = result.layers_triggered or [],
        layer_a_matched     = bool(result.layer_a_fired),
        layer_b_confidence  = float(result.layer_b_confidence),
        layer_c_top_matches = layer_c_matches,
        latency_ms          = round(total_latency_ms, 2),
        log_id              = log_entry.id,
        # ⬇️ ADD THIS EXACT LINE ⬇️
        scrubbed_prompt     = store_scrubbed,
    )
```

### 3. Update `frontend/src/api/types.ts`
Open `types.ts`, find the `ScanInputResponse` interface, and add the optional property to prevent any TypeScript warnings on your dashboard.
```typescript
export interface ScanInputResponse {
  decision: string; 
  risk_score: number; 
  attack_category: string | null; 
  layers_triggered: string[]; 
  layer_a_matched: boolean;
  layer_b_confidence: number; 
  layer_c_top_matches: LayerCMatch[]; 
  latency_ms: number; 
  log_id: number; 
  // ⬇️ ADD THIS EXACT LINE ⬇️
  scrubbed_prompt?: string;
}
```

*(Once you do this and push to Vercel/Cloud Run, your backend is 100% ready).*

---

## Part 2: The Chrome Extension Code
We will create a new folder named `extension` on your computer. Chrome Extensions require their code to be split into a few specific files (you cannot physically put it all in one single file). We will create exactly 4 files.

### 1. `manifest.json` (The Brain)
Tells Chrome what the extension is and gives it permission to run on all major AI sites.
```json
{
  "manifest_version": 3,
  "name": "LLM Firewall",
  "version": "1.0",
  "description": "Premium protection against malicious prompts and PII leaks.",
  "host_permissions": [
    "*://chatgpt.com/*",
    "*://claude.ai/*",
    "*://gemini.google.com/*",
    "*://groq.com/*",
    "*://*.groq.com/*",
    "*://*.antigravity.dev/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "*://chatgpt.com/*",
        "*://claude.ai/*",
        "*://gemini.google.com/*",
        "*://groq.com/*",
        "*://*.groq.com/*",
        "*://*.antigravity.dev/*"
      ],
      "css": ["content.css"],
      "js": ["content_script.js"]
    }
  ],
  "action": {
    "default_title": "LLM Firewall"
  }
}
```

### 2. `background.js` (The Secure API Caller)
Makes the API call to your live Cloud Run URL.
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkPrompt") {
        const apiUrl = "https://malintent-backend-638595612528.asia-south1.run.app/api/v1/scan/input"; 
        
        fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: request.prompt,
                session_role: "customer",
                privacy_mode: "tokenised"
            })
        })
        .then(response => response.json())
        .then(data => sendResponse({ success: true, data: data }))
        .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep channel open for async fetch
    }
});
```

### 3. `content_script.js` (The Interceptor & UI Manager)
This is the magic file. It intercepts the chat box, shows the "Analyzing..." state, and renders the Red/Yellow/Green warnings.
```javascript
console.log("Mal Intent Firewall Architecture Activated");

function getPromptText(el) {
    return (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') 
        ? el.value.trim() : (el.isContentEditable ? el.innerText.trim() : "");
}

function setPromptText(el, text) {
    if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') el.value = text;
    else if (el.isContentEditable) el.innerText = text;
}

// Intercept Enter Key
document.addEventListener('keydown', function(event) {
    const target = event.target;
    const isTextInput = target.tagName.toLowerCase() === 'textarea' || target.tagName.toLowerCase() === 'input' || target.isContentEditable;

    if (isTextInput && event.key === 'Enter' && !event.shiftKey) {
        if (target.dataset.firewallVerified === "true") {
            target.dataset.firewallVerified = "false";
            return;
        }

        const promptText = getPromptText(target);
        if (!promptText) return;

        event.preventDefault(); 
        event.stopPropagation();

        // [ENHANCEMENT] Show Loading State
        const originalBg = target.style.backgroundColor;
        target.style.backgroundColor = "rgba(100, 116, 139, 0.2)";
        target.disabled = true;

        chrome.runtime.sendMessage({ action: "checkPrompt", prompt: promptText }, function(response) {
            // Remove Loading State
            target.style.backgroundColor = originalBg;
            target.disabled = false;
            target.focus();
            
            if (response.success) {
                handleDecision(response.data, target);
            } else {
                alert("Firewall check failed: " + response.error);
            }
        });
    }
}, true); 

function handleDecision(data, inputBox) {
    const existing = document.getElementById('firewall-warning-box');
    if (existing) existing.remove();

    if (data.decision === "BLOCK") {
        showWarning(data.risk_score, "Critical threat detected. This prompt is blocked.", "blocked", false, inputBox);
    } 
    else if (data.decision === "FLAG") {
        showWarning(data.risk_score, "Suspicious prompt detected.", "flagged", true, inputBox);
    } 
    else {
        // SAFE: Mask PII if found, then send.
        if (data.scrubbed_prompt && data.scrubbed_prompt !== getPromptText(inputBox)) {
            setPromptText(inputBox, data.scrubbed_prompt);
        }
        forceSend(inputBox);
    }
}

function forceSend(inputBox) {
    inputBox.dataset.firewallVerified = "true";
    const enterEvent = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13 });
    inputBox.dispatchEvent(enterEvent);
}

function showWarning(score, message, type, isFlagged, inputBox) {
    const box = document.createElement('div');
    box.id = 'firewall-warning-box';
    box.className = `firewall-box ${type}`;
    
    let buttons = '';
    if (isFlagged) {
        // [ENHANCEMENT] Option to Bypass a Flagged warning
        buttons = `
            <div style="margin-top: 15px;">
                <button id="fw-edit-btn" style="background:#3b82f6; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; margin-right:10px;">Edit Prompt</button>
                <button id="fw-send-btn" style="background:transparent; color:white; border:1px solid white; padding:8px 12px; border-radius:4px; cursor:pointer;">Send Anyway</button>
            </div>
        `;
    }

    box.innerHTML = `
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">Risk Score: ${score.toFixed(1)}</div>
        <p style="margin:0; font-size: 14px;">${message}</p>
        <a href="https://malintent.vercel.app" target="_blank" style="color: #93c5fd; text-decoration: none; font-size:12px; display:block; margin-top:10px;">
            Open Dashboard for details ↗
        </a>
        ${buttons}
    `;
    document.body.appendChild(box);

    if (isFlagged) {
        document.getElementById('fw-edit-btn').onclick = () => box.remove();
        document.getElementById('fw-send-btn').onclick = () => {
            box.remove();
            forceSend(inputBox);
        };
    } else {
        setTimeout(() => { if(box.parentNode) box.remove(); }, 6000); // Auto remove blocks after 6s
    }
}
```

### 4. `content.css` (Premium Styling)
A beautiful, glassmorphism UI for the warning boxes so it looks incredible on top of modern AI websites.
```css
.firewall-box {
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 20px 30px;
    border-radius: 12px;
    color: white;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
    text-align: center;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    animation: slideDown 0.3s ease-out;
}
.firewall-box.blocked {
    background: rgba(220, 38, 38, 0.9);
    border: 1px solid rgba(248, 113, 113, 0.5);
}
.firewall-box.flagged {
    background: rgba(217, 119, 6, 0.9);
    border: 1px solid rgba(251, 191, 36, 0.5);
}
@keyframes slideDown {
    from { top: -50px; opacity: 0; }
    to { top: 24px; opacity: 1; }
}
```

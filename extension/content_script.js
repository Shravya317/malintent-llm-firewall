console.log("MalIntent Firewall Architecture Activated");

let activated = false;

function getPromptText(el) {
    return (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') 
        ? el.value.trim() : (el.isContentEditable ? el.innerText.trim() : "");
}

function setPromptText(el, text) {
    if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') el.value = text;
    else if (el.isContentEditable) el.innerText = text;
}

// Initial Activation Toast on Focus
document.addEventListener('focusin', function(event) {
    let target = event.target;
    const editable = target.closest ? target.closest('textarea, input, [contenteditable="true"]') : null;
    
    if (editable && !activated) {
        activated = true;
        showActivationToast();
    }
});

function createLogoSVG(size = 24) {
    const W = 35;
    const S = W * 0.577; 
    const H = 45;
    const D = 22;
    const DS = D * 0.577; 
    const GAP = 6;
    const colX = W + GAP;
    const colY = S + GAP * 0.577;
    const rowY = H + GAP;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 260 390");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("class", "malintent-logo-svg");
    
    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("transform", "translate(55, 130)");

    const toPoints = (pts) => pts.map(p => p.join(',')).join(' ');

    for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
            const ox = c * colX;
            const oy = -c * colY + r * rowY;

            const fTL = [ox, oy];
            const fTR = [ox + W, oy - S];
            const fBR = [ox + W, oy - S + H];
            const fBL = [ox, oy + H];

            if (r === 0) {
                const poly = document.createElementNS(svgNS, "polygon");
                poly.setAttribute("points", toPoints([fTL, fTR, [fTR[0] - D, fTR[1] - DS], [fTL[0] - D, fTL[1] - DS]]));
                poly.setAttribute("fill", "#ff4d4d");
                g.appendChild(poly);
            }

            if (c === 0) {
                const poly = document.createElementNS(svgNS, "polygon");
                poly.setAttribute("points", toPoints([fTL, fBL, [fBL[0] - D, fBL[1] - DS], [fTL[0] - D, fTL[1] - DS]]));
                poly.setAttribute("fill", "#990000");
                g.appendChild(poly);
            }

            const poly = document.createElementNS(svgNS, "polygon");
            poly.setAttribute("points", toPoints([fTL, fTR, fBR, fBL]));
            poly.setAttribute("fill", "#cc0000");
            g.appendChild(poly);
        }
    }
    svg.appendChild(g);
    return svg;
}

function showActivationToast() {
    const toast = document.createElement('div');
    toast.className = 'malintent-toast';
    toast.innerHTML = `<span class="malintent-toast-text"><span class="malintent-toast-mal">MAL</span><span class="malintent-toast-intent">INTENT</span></span> <span class="malintent-toast-title">FIREWALL ARCHITECTURE ACTIVATED</span>`;
    
    // Prepend logo
    toast.insertBefore(createLogoSVG(22), toast.firstChild);
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => { toast.classList.add('show'); }, 50);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
    }, 3500);
}

// Intercept Enter Key
document.addEventListener('keydown', function(event) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    
    let target = event.target;
    const editable = target.closest ? target.closest('textarea, input, [contenteditable="true"]') : null;
    
    if (!editable) return;

    if (editable.dataset.firewallVerified === "true") {
        editable.dataset.firewallVerified = "false";
        return;
    }

    const promptText = (editable.tagName.toLowerCase() === 'textarea' || editable.tagName.toLowerCase() === 'input') 
        ? editable.value.trim() : editable.textContent.trim();
        
    if (!promptText) return;

    event.preventDefault(); 
    event.stopPropagation();
    event.stopImmediatePropagation(); // CRITICAL for React apps like ChatGPT

    // [ENHANCEMENT] Show Loading State
    editable.classList.add("malintent-loading-input");
    
    // Optionally show analyzing toast
    const analyzingToast = document.createElement('div');
    analyzingToast.className = 'malintent-analyzing-toast';
    analyzingToast.innerText = "Analyzing Prompt...";
    document.body.appendChild(analyzingToast);

    chrome.runtime.sendMessage({ action: "checkPrompt", prompt: promptText }, function(response) {
        // Remove Loading State
        editable.classList.remove("malintent-loading-input");
        editable.focus();
        if (analyzingToast.parentNode) analyzingToast.remove();
        
        if (response && response.success) {
            handleDecision(response.data, editable);
        } else {
            if (response && response.error === "AUTH_REQUIRED") {
                showAuthWarning();
            } else {
                console.error("Firewall check failed: " + (response ? response.error : "Unknown error"));
            }
        }
    });
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
            <div class="fw-buttons-container">
                <button id="fw-edit-btn" class="fw-btn-edit">Edit Prompt</button>
                <button id="fw-send-btn" class="fw-btn-send">Send Anyway</button>
            </div>
        `;
    }

    box.innerHTML = `
        <div class="fw-score-container">
            <div class="fw-score-title">RISK SCORE: <span class="fw-score-val">${score.toFixed(1)}</span></div>
        </div>
        <p class="fw-message">${message}</p>
        ${type === 'blocked' ? `
        <a href="https://malintent-firewall.vercel.app/" target="_blank" class="fw-dashboard-link">
            Check details on MalIntent Dashboard ↗
        </a>` : ''}
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

function showAuthWarning() {
    const existing = document.getElementById('firewall-warning-box');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'firewall-warning-box';
    box.className = `firewall-box blocked`;
    
    box.innerHTML = `
        <div class="fw-score-container" style="background: rgba(220, 38, 38, 0.2);">
            <div class="fw-score-title" style="color: white; font-weight: bold;">AUTHENTICATION REQUIRED</div>
        </div>
        <p class="fw-message" style="margin-top: 10px;">The MalIntent extension is disconnected.</p>
        <a href="https://malintent-firewall.vercel.app/" target="_blank" class="fw-dashboard-link" style="font-size: 14px; font-weight: bold; background: #3b82f6; color: white; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-top: 12px; text-decoration: none;">
            Login to MalIntent Dashboard
        </a>
    `;
    document.body.appendChild(box);
    setTimeout(() => { if(box.parentNode) box.remove(); }, 8000);
}

document.addEventListener('DOMContentLoaded', () => {
    const powerToggle = document.getElementById('powerToggle');
    
    // Stats elements
    const blockedCount = document.getElementById('blockedCount');
    const warningsCount = document.getElementById('warningsCount');
    const safeCount = document.getElementById('safeCount');
    
    // Last scan elements
    const lastScanBadge = document.getElementById('lastScanBadge');
    const lastScanText = document.getElementById('lastScanText');
    
    // History list
    const historyList = document.getElementById('historyList');
    
    // Buttons
    const dashboardBtn = document.getElementById('dashboardBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Logo generator
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
        svg.style.overflow = "visible";
        svg.style.marginRight = "8px";
        
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

    const logoContainer = document.getElementById('logoContainer');
    if (logoContainer) {
        logoContainer.insertBefore(createLogoSVG(20), logoContainer.firstChild);
    }

    // Toggle power
    powerToggle.addEventListener('click', (e) => {
        const isActive = powerToggle.classList.contains('active');
        if (isActive) {
            powerToggle.classList.remove('active');
            powerToggle.classList.add('inactive');
            powerToggle.textContent = 'SHIELD OFFLINE';
            powerToggle.style.borderColor = 'var(--text-secondary)';
            powerToggle.style.color = 'var(--text-secondary)';
            powerToggle.style.boxShadow = 'none';
        } else {
            powerToggle.classList.add('active');
            powerToggle.classList.remove('inactive');
            powerToggle.textContent = 'SHIELD ACTIVE';
            powerToggle.style.borderColor = 'var(--color-green)';
            powerToggle.style.color = 'var(--color-green)';
            powerToggle.style.boxShadow = '0 0 10px rgba(70, 211, 105, 0.2)';
        }
    });

    // Load Data
    function loadData() {
        chrome.storage.local.get({ history: [], stats: { blocked: 0, warnings: 0, safe: 0 } }, (data) => {
            // Update Stats
            blockedCount.textContent = data.stats.blocked;
            warningsCount.textContent = data.stats.warnings;
            safeCount.textContent = data.stats.safe;

            // Update History and Last Scan
            if (data.history && data.history.length > 0) {
                const latest = data.history[0];
                
                // Update Last Scan
                const decisionClass = latest.decision === 'BLOCK' ? 'blocked' : (latest.decision === 'FLAG' ? 'flagged' : 'safe');
                lastScanBadge.className = `log-status ${decisionClass}`;
                lastScanBadge.textContent = latest.decision === 'BLOCK' ? 'BLOCKED' : (latest.decision === 'FLAG' ? 'WARNING' : 'SAFE');
                lastScanText.textContent = latest.prompt;

                // Update Terminal Feed
                historyList.innerHTML = '';
                data.history.forEach(item => {
                    const typeClass = item.decision === 'BLOCK' ? 'blocked' : (item.decision === 'FLAG' ? 'flagged' : 'safe');
                    const statusText = item.decision === 'BLOCK' ? '[BLK]' : (item.decision === 'FLAG' ? '[WRN]' : '[SAF]');
                    
                    const el = document.createElement('div');
                    el.className = 'feed-item';
                    el.innerHTML = `
                        <span class="feed-time">${item.time}</span>
                        <span class="feed-status ${typeClass}">${statusText}</span>
                        <span class="feed-prompt">${item.prompt}</span>
                    `;
                    historyList.appendChild(el);
                });
            } else {
                historyList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">System standby.</div>';
            }
        });
    }

    loadData();

    // Clear Data
    clearBtn.addEventListener('click', () => {
        chrome.storage.local.set({ history: [], stats: { blocked: 0, warnings: 0, safe: 0 } }, () => {
            loadData();
            lastScanBadge.className = 'log-status';
            lastScanBadge.textContent = 'AWAITING...';
            lastScanText.textContent = 'No prompt intercepted yet.';
        });
    });

    // Dashboard navigation
    dashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://malintent-firewall.vercel.app/' });
    });
});

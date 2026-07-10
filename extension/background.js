chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkPrompt") {
        const apiUrl = "https://malintent-backend-211874411068.asia-south1.run.app/api/v1/scan/input"; 
        
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
        .then(data => {
            // Log history for the popup
            chrome.storage.local.get({ history: [], stats: { blocked: 0, warnings: 0, safe: 0 } }, (result) => {
                let { history, stats } = result;
                
                let decision = data.decision || 'SAFE'; // Default to safe if not present
                let logEntry = {
                    prompt: request.prompt,
                    decision: decision,
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    timestamp: Date.now()
                };
                
                history.unshift(logEntry);
                if (history.length > 20) history.pop(); // Keep only last 20
                
                if (decision === 'BLOCK') stats.blocked++;
                else if (decision === 'FLAG') stats.warnings++;
                else stats.safe++;
                
                chrome.storage.local.set({ history, stats });
            });
            
            sendResponse({ success: true, data: data });
        })
        .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep channel open for async fetch
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. Listen for the token from the Token Bridge
    if (request.action === "syncToken") {
        chrome.storage.local.set({ jwtToken: request.token });
        return true;
    }

    if (request.action === "checkPrompt") {
        const apiUrl = "https://malintent-backend-211874411068.asia-south1.run.app/api/v1/scan/input"; 
        
        // Retrieve the stored token before making the request
        chrome.storage.local.get("jwtToken", (result) => {
            const token = result.jwtToken;
            
            if (!token) {
                // Instantly fail if there's no token so the UI can show the warning
                sendResponse({ success: false, error: "AUTH_REQUIRED" });
                return;
            }

            fetch(apiUrl, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: request.prompt,
                    session_role: "customer",
                    privacy_mode: "tokenised"
                })
            })
            .then(async (response) => {
                if (!response.ok) {
                    // Check if the token is invalid/expired
                    if (response.status === 401 || response.status === 403) {
                        throw new Error("AUTH_REQUIRED");
                    }
                    const errText = await response.text();
                    throw new Error(`API Error ${response.status}: ${errText}`);
                }
                return response.json();
            })
            .then(data => {
                // Log history for the popup
                chrome.storage.local.get({ history: [], stats: { blocked: 0, warnings: 0, safe: 0 } }, (res) => {
                    let { history, stats } = res;
                    
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
        });

        return true; // Keep channel open for async fetch
    }
});

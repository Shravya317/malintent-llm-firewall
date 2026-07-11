// token_bridge.js
// This script runs on the MalIntent dashboard and securely bridges the JWT to the extension.

console.log("MalIntent Token Bridge active.");

function syncToken() {
    // The frontend might use 'token' or 'malintent_token' depending on the auth flow
    const token = localStorage.getItem('token') || localStorage.getItem('malintent_token');
    if (token) {
        chrome.runtime.sendMessage({ action: "syncToken", token: token });
        console.log("MalIntent Token Bridge: JWT successfully synced to background worker.");
    }
}

// Sync immediately when the dashboard is opened
syncToken();

// Also sync if the user logs in while the dashboard is already open
window.addEventListener('storage', function(e) {
    if (e.key === 'token' || e.key === 'malintent_token') {
        syncToken();
    }
});

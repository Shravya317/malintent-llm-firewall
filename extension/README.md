# MalIntent Firewall - Chrome Extension

The MalIntent Firewall Chrome Extension provides premium, real-time protection against malicious prompts and PII leaks on major LLM websites.

## Features
- **Real-Time Monitoring:** Activates seamlessly on ChatGPT, Claude, Gemini, and Groq.
- **Silent Protection (SAFE):** Benign prompts are allowed through seamlessly. PII (like phone numbers and API keys) is automatically masked.
- **Suspicious Prompts (FLAGGED):** Intercepts medium-risk prompts with a yellow/orange warning. Users can edit the prompt to be safer or explicitly choose to "Send Anyway".
- **Critical Threats (BLOCKED):** High-risk prompts are completely blocked with a red warning, providing a direct link to the MalIntent Dashboard for detailed analytics.
- **Analyzing State:** Enhances UX by displaying a professional loading state ("Analyzing Prompt...") while checking the risk score.

## Architecture
- `manifest.json`: Configuration and permissions.
- `background.js`: Service worker handling secure API calls to the Cloud Run backend and logging history to Chrome storage.
- `content_script.js`: Injected into target websites to intercept inputs, show activation toasts, handle loading states, and display warnings.
- `content.css`: Styles for the in-page notifications and warning dialogs.
- `popup.html`, `popup.css`, `popup.js`: The professional extension popup showing real-time stats and history.

## Installation for Development
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top right corner.
3. Click on **Load unpacked**.
4. Select the `extension` folder inside the `malintent` project.
5. Pin the extension to your toolbar for easy access to the dashboard and stats.

## Theming
The extension matches the MalIntent Dashboard's premium dark mode theme, featuring the `Syncopate` brand font and vibrant threat level accents (`#E50914` for Blocked, `#e8b600` for Warnings, and `#46d369` for Safe).

<div align="center">

<img src="https://img.shields.io/badge/PHASE_3-BROWSER_EXTENSION-ff2d55?style=for-the-badge" alt="Phase 3" />

# MalIntent: Browser Extension

**Enterprise-Grade LLM Security Firewall — Client-Side Interceptor**<br/>
*Real-time prompt injection detection and PII protection, running directly in your browser.*

<a href="#about">About</a> •
<a href="#key-features">Key Features</a> •
<a href="#architecture">Architecture</a> •
<a href="#installation-for-development">Installation</a> •
<a href="#how-it-works">How It Works</a> •
<a href="#theming">Theming</a> •
<a href="#configuration">Configuration</a> •
<a href="#roadmap">Roadmap</a>

---

<img src="https://img.shields.io/badge/MANIFEST-V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3" />
<img src="https://img.shields.io/badge/JAVASCRIPT-VANILLA-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
<img src="https://img.shields.io/badge/BACKEND-CLOUD_RUN-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" alt="Cloud Run" />
<img src="https://img.shields.io/badge/STATUS-v1.0.0-46d369?style=for-the-badge" alt="v1.0.0" />

</div>

---

## About

The **MalIntent Browser Extension** brings the same enterprise-grade detection engine that powers the [MalIntent Backend](../backend/README.md) directly into the browser tab. Rather than requiring a developer to integrate the MalIntent API into their own application, any user can install this extension and get real-time prompt firewalling on the LLM platforms they already use — no server-side integration required.

It runs as a Manifest V3 client-side interceptor: every prompt is halted at the point of submission, sent to the production MalIntent scanning pipeline, and only released to the target LLM once it's been classified **SAFE**, **FLAGGED**, or **BLOCKED**.

---

## Key Features

| Tier | Trigger | Behavior |
|---|---|---|
| 🟢 **Silent Protection (SAFE)** | Low-risk prompt | Allowed through automatically. Any PII detected (phone numbers, API keys, emails) is masked in-place before the prompt is sent. |
| 🟡 **Suspicious Prompts (FLAGGED)** | Medium-risk score | Submission is paused. An in-page warning lets the user edit the prompt or explicitly **Send Anyway**. |
| 🔴 **Critical Threats (BLOCKED)** | High-risk score (e.g. jailbreak attempt) | Submission is hard-blocked before it ever leaves the browser. A direct link to the MalIntent Dashboard is shown for analytics. |

Additional UX details:

- **Real-Time Monitoring** — activates automatically on **ChatGPT, Claude, Gemini, and Groq**, with no per-site setup.
- **Analyzing State** — a lightweight "Analyzing Prompt…" toast is shown during the scan round-trip, so submission never feels like it silently failed.
- **Live Dashboard Sync** — scan history and Blocked/Flagged/Safe totals are available instantly from the toolbar popup, and mirrored to the full MalIntent web dashboard for deeper analytics.

---

## Architecture

```text
                     MalIntent Browser Extension (Manifest V3)
 ┌───────────────────────────────────────────────────────────────────────┐
 │                                                                       │
 │   Target Site (ChatGPT / Claude / Gemini / Groq)                     │
 │   ┌─────────────────┐                                                │
 │   │ content_script.js│  intercepts Enter / Send click                │
 │   │  • halt submit    │  shows "Analyzing Prompt..." toast            │
 │   │  • inject banners │  renders SAFE / FLAGGED / BLOCKED UI          │
 │   └────────┬──────────┘                                               │
 │            │ postMessage                                             │
 │   ┌────────▼──────────┐        ┌───────────────────┐                 │
 │   │  background.js     │───────▶│ Cloud Run Backend │                 │
 │   │  (service worker)  │◀───────│ /api/v1/scan/input│                 │
 │   │  • auth'd fetch     │        └───────────────────┘                 │
 │   │  • chrome.storage   │                                             │
 │   └────────┬──────────┘                                               │
 │            │                                                          │
 │   ┌────────▼──────────┐                                               │
 │   │  token_bridge.js    │  runs on the MalIntent Dashboard tab         │
 │   │  • syncs JWT session │  into extension's secure local storage      │
 │   └────────────────────┘                                              │
 │                                                                       │
 │   ┌────────────────────┐                                              │
 │   │  popup.html/js/css   │  toolbar mini-dashboard                    │
 │   │  • live scan feed     │  reads chrome.storage                     │
 │   │  • Blocked/Flagged/   │                                           │
 │   │    Safe counters      │                                           │
 │   └────────────────────┘                                              │
 └───────────────────────────────────────────────────────────────────────┘
```

### Package Structure

```text
extension/
├── manifest.json          # Manifest V3 config: permissions, host access, entry points
├── background.js          # Service worker — authenticated calls to /api/v1/scan/input,
│                           #   scan-history persistence via chrome.storage
├── content_script.js      # Injected into target sites — intercepts submit, renders
│                           #   toasts and warning banners, handles Send Anyway / Edit
├── content.css             # Styling for in-page toasts and warning dialogs
├── token_bridge.js         # Runs on the MalIntent Dashboard — syncs the logged-in
│                           #   user's JWT into the extension's local storage
├── popup.html               # Toolbar popup markup
├── popup.js                 # Popup logic — reads chrome.storage, renders live feed
├── popup.css                 # Popup styling (matches dashboard dark theme)
├── generate_logo.js          # Build-time helper — generates the injected SVG logo asset
└── README.md
```

### How It Works

```text
1. User types a prompt        ──▶ on a supported LLM site (ChatGPT/Claude/Gemini/Groq)
2. content_script.js          ──▶ intercepts Enter / Send click, halts default submission
3. "Analyzing Prompt..."      ──▶ toast shown while the scan is in flight
4. background.js              ──▶ authenticated POST to /api/v1/scan/input (Cloud Run)
5. Response received:
   ├── SAFE    ──▶ scrubbed_prompt (if PII masked) is submitted automatically
   ├── FLAGGED ──▶ yellow/orange banner — Edit Prompt or Send Anyway
   └── BLOCKED ──▶ red banner — submission stopped, link to Dashboard shown
6. Result logged               ──▶ written to chrome.storage for the popup feed
7. token_bridge.js             ──▶ keeps the extension's JWT in sync with the
                                   Dashboard tab, so no separate login is required
```

> **Note:** The extension depends on the backend returning `scrubbed_prompt` in the `ScanInputResponse` payload to support automatic PII masking on SAFE-tier prompts. This field is required as of backend `feat(api)` changes documented in the [Backend README](../backend/README.md#browser-extension-integration).

---

## Installation for Development

The extension is not yet published to the Chrome Web Store — install it manually via Developer Mode:

1. Download the latest `malintent_extension.zip` from the [Releases page](../../releases), or clone the repo and use the `extension/` folder directly.
2. If using the zip, extract it — `manifest.json` should sit at the top level of the extracted folder.
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** using the toggle in the top-right corner.
5. Click **Load unpacked**.
6. Select the extracted folder (or the `extension/` folder inside the project, if running from source).
7. Pin the extension to your toolbar for quick access to stats and the dashboard link.

### Requirements

- Google Chrome or any Chromium-based browser (Edge, Brave, etc.)
- An active [MalIntent account](https://malintent-firewall.vercel.app/) — stay signed in to the web dashboard in one tab so `token_bridge.js` can sync your session automatically.

### Permissions Requested

| Permission | Why |
|---|---|
| Host access — `chatgpt.com`, `claude.ai`, `gemini.google.com`, `groq.com` | Required to inject `content_script.js` and intercept prompt submission on these sites. |
| `storage` | Local scan history and running Blocked/Flagged/Safe counters for the popup. |

No prompt content or PII is retained beyond what's needed to render the local scan history.

---

## Theming

The extension mirrors the MalIntent Dashboard's premium dark mode identity:

<div align="center">

<img src="https://img.shields.io/badge/BLOCKED-E50914?style=for-the-badge" alt="Blocked" />
<img src="https://img.shields.io/badge/FLAGGED-e8b600?style=for-the-badge" alt="Flagged" />
<img src="https://img.shields.io/badge/SAFE-46d369?style=for-the-badge" alt="Safe" />

</div>

- **Brand typeface:** `Syncopate`, matching the dashboard's headers
- **Threat accents:** `#E50914` (Blocked) / `#e8b600` (Flagged) / `#46d369` (Safe) — the same red/amber/green convention used throughout the Dashboard and Threat Analysis views
- **Injected UI** (toasts, banners, popup) uses the dashboard's charcoal background palette so the extension never feels like a bolted-on third party tool

---

## Configuration

The extension has no user-facing settings screen in v1.0.0 — behavior (thresholds, modes, allowlists) is inherited entirely from the account's server-side configuration, set via the Dashboard's **Configuration** page (Context Settings, Custom Rules, Privacy Mode, Permission Roles). This keeps enforcement consistent whether a prompt is scanned via the extension, the SDK, or a direct API integration.

| Backend endpoint used | Purpose |
|---|---|
| `POST /api/v1/scan/input` | Core scan call made by `background.js` on every intercepted prompt |

---

## Known Limitations (v1.0.0)

- Supported platforms: ChatGPT, Claude, Gemini, and Groq only.
- No in-popup settings UI yet — configuration is dashboard-only.
- Document/file upload scanning is not active (tracked in the backend's `/api/v1/scan/document` roadmap).
- Not yet published to the Chrome Web Store — manual installation via Developer Mode is required.

---

## 🗺️ Roadmap

- Chrome Web Store submission
- In-popup quick-settings (context mode toggle, per-site enable/disable)
- Support for additional LLM platforms
- Document pre-scanning once `/api/v1/scan/document` ships on the backend

---

## Related

- [MalIntent Backend — Core Engine & API](../backend/README.md)
- [MalIntent Python SDK](../sdk/README.md)
- [Releases](../../releases)

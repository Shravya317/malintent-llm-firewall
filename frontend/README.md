<div align="center">

# <img src="https://img.icons8.com/fluency/48/shield.png" width="36" height="36" alt="shield"/> MalIntent — Security Dashboard

### *Next-generation LLM Firewall Interface. Engineered for zero-trust AI.*

<p>A production-grade cybersecurity command center delivering real-time prompt injection monitoring,<br/>multi-layered threat forensics, and sandbox analytics — purpose-built for the AI attack surface.</p>

<br/>

<a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-19.x-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
<a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
<a href="https://reactrouter.com/"><img src="https://img.shields.io/badge/React_Router-7.x-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" alt="React Router" /></a>
<a href="https://axios-http.com/"><img src="https://img.shields.io/badge/Axios-1.18-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" /></a>
<a href="https://recharts.org/"><img src="https://img.shields.io/badge/Recharts-2.15-22B5BF?style=for-the-badge&logo=d3dotjs&logoColor=white" alt="Recharts" /></a>
<a href="https://lucide.dev/"><img src="https://img.shields.io/badge/Lucide-1.14-F472B6?style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide" /></a>
<a href="https://developer.mozilla.org/en-US/docs/Web/CSS"><img src="https://img.shields.io/badge/CSS3-Design_System-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" /></a>
<a href="https://fonts.google.com/"><img src="https://img.shields.io/badge/Google_Fonts-Typography-4285F4?style=for-the-badge&logo=googlefonts&logoColor=white" alt="Google Fonts" /></a>

<br/>

</div>

---

<div align="center">

<img src="assets/screenshots/dashboard-dark.png" alt="MalIntent Dashboard Dark Mode" width="48%" />
&nbsp;
<img src="assets/screenshots/dashboard-light.png" alt="MalIntent Dashboard Light Mode" width="48%" />

<sub> MalIntent Operations Center — Security Overview (Dark & Light Mode)</sub>

</div>

---

<div align="center">

<h2>◈ About the Platform</h2>

</div>

**MalIntent** is a full-stack cybersecurity dashboard designed to serve as the operational command layer for a production LLM firewall. The frontend is engineered to visualize the output of a 5-layer backend detection pipeline — in real time, with sub-second latency feedback.

> *Think of it as mission control for the AI era — where data clarity meets enterprise-grade threat intelligence.*

### Why MalIntent?

| Problem | MalIntent Solution |
|---------|-------------------|
| LLMs blindly execute injected instructions | **5-layer detection pipeline** visualized in real time with per-layer latency |
| Security teams lack visibility into AI threats | **Live dashboard** with threat feeds, severity indices, and confidence scoring |
| No standard UI for LLM security operations | **10-module command center** covering scanning, forensics, and incident response |
| One-size-fits-all detection | **Configurable thresholds** and RBAC via the settings panel |
| Analysts can't verify automated decisions | **Human-in-the-loop review queue** to mark false positives and fine-tune ML |

### Project Highlights

```
10  Dashboard Modules          5  Detection Layers Visualized
 2  Theme Modes (Dark/Light)   3  Chart Types (Area, Radar, Radial)
 8  API Integrations           ∞  Responsive Breakpoints
<100ms  UI Render Latency     98.4%  Firewall Confidence Score
```

---

<div align="center">

<h2>◈ Platform Screenshots</h2>

<h4>Threat Analysis — 5-Layer Forensics Visualizer</h4>

</div>

<div align="center">

<img src="assets/screenshots/threat-analysis-dark.png" alt="Threat Analysis Dark Mode" width="48%">
&nbsp;
<img src="assets/screenshots/threat-analysis-light.png" alt="Threat Analysis Light Mode" width="48%">

<sub>Interactive layer breakdown — Pattern Engine, ML Classifier, Semantic Similarity, Consistency Validator, Leakage Detection</sub>

<br/><br/>

| | |
|:---:|:---:|
| <img src="assets/screenshots/comparison-light.png" alt="Comparison Mode" width="420" /><br/><sub><b>Comparison Mode</b> — Side-by-side protected vs raw LLM execution</sub> | <img src="assets/screenshots/document-scanner-dark.png" alt="Document Scanner" width="420" /><br/><sub><b>Document Scanner</b> — RAG pipeline injection prevention</sub> |

<br/>

<h4>Live Threat Feed & System Logs</h4>

<img src="assets/screenshots/livethreatfeed-dark.png" alt="Live Threat Feed" width="85%" />

<sub>Immutable execution logs with intercepted payloads, attack vectors, origin IPs, and per-layer decisions</sub>

</div>

---

<div align="center">

<h2>◈ Feature Matrix</h2>

</div>

| Module | Description | Status |
|---|---|---|
| 🛡 **Security Overview** | Real-time KPI metrics — threats blocked, safe queries, critical count, avg latency | `Operational` |
| 📈 **Firewall Activity Monitor** | Time-series area chart tracking total, safe, flagged, and blocked requests over 24h | `Operational` |
| 🎯 **Threat Distribution** | Donut chart breaking down attack categories (Data Exfil, Persona Override, etc.) | `Operational` |
| 🕸 **Threat Signature Profile** | Radar chart mapping multidimensional attack characteristics (Complexity, Frequency, Evasion) | `Operational` |
| 🔍 **Threat Analysis** | Interactive 5-layer interception visualizer with per-layer latency and confidence scoring | `Operational` |
| ⚖️ **Comparison Mode** | A/B testing: Protected (firewall) vs Raw (unprotected LLM) prompt execution | `Operational` |
| 🧪 **Deep Scan Sandbox** | Diagnostic playground with full JSON payload rendering for red-teamers | `Operational` |
| ✅ **False Positive Queue** | Human-in-the-loop review — analysts mark threats as confirmed or false positive | `Operational` |
| 📄 **Document Scanner** | RAG document pre-scanner detecting indirect prompt injections in uploaded files | `Operational` |
| 📜 **Action Logs (SEL)** | Immutable system execution logs and threat audit trails with search/filter | `Operational` |
| 🔌 **Integration SDK** | Copy-pasteable code snippets for Python, Node.js, and cURL integration | `Operational` |
| ⚙️ **Configuration** | Dynamic security thresholds, RBAC, API key management, and engine toggles | `Operational` |
| 🎨 **Dark / Light Mode** | Persistent theme toggle via `localStorage` with seamless CSS variable switching | `Operational` |
| 📱 **Responsive Design** | Fluid layouts optimized across mobile, tablet, and desktop viewports | `Operational` |

---

<div align="center">

<h2>◈ Architecture</h2>

</div>

The frontend communicates with the backend through a centralized Axios API layer (`src/api/client.js`). In production, requests route through a Vercel reverse proxy (`/api/v1`) to bypass CORS.

```
                         MalIntent Frontend Architecture
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                          │
 │   ┌─────────────┐     ┌──────────────┐     ┌────────────────────────┐   │
 │   │  Browser     │────▶│  Vite Dev /  │────▶│  React Router v7      │   │
 │   │  (User)      │◀────│  Vercel CDN  │◀────│  (Client-side SPA)    │   │
 │   └─────────────┘     └──────────────┘     └──────────┬─────────────┘   │
 │                                                        │                 │
 │                              ┌─────────────────────────▼──────────┐     │
 │                              │         Layout.jsx                 │     │
 │                              │  ┌──────────┐  ┌───────────────┐   │     │
 │                              │  │ Sidebar  │  │ Main Content  │   │     │
 │                              │  │ (Nav)    │  │ (Route View)  │   │     │
 │                              │  └──────────┘  └───────┬───────┘   │     │
 │                              └────────────────────────┼───────────┘     │
 │                                                       │                 │
 │   ┌───────────────────────────────────────────────────▼──────────────┐  │
 │   │                    Page Components                               │  │
 │   │  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │  │
 │   │  │ Dashboard │ │ Threats  │ │ Sandbox  │ │ Document Scanner  │  │  │
 │   │  └─────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬──────────┘  │  │
 │   │        └─────────────┴────────────┴────────────────┘             │  │
 │   │                              │                                   │  │
 │   │                    ┌─────────▼──────────┐                        │  │
 │   │                    │  api/client.js     │  Centralized Axios     │  │
 │   │                    │  (8 API functions) │  layer with error      │  │
 │   │                    │                    │  handling & CORS proxy │  │
 │   │                    └─────────┬──────────┘                        │  │
 │   └──────────────────────────────┼───────────────────────────────────┘  │
 │                                  │                                      │
 └──────────────────────────────────┼──────────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │   FastAPI Backend (Port 8000)  │
                    │   /api/v1/scan/input           │
                    │   /api/v1/scan/document        │
                    │   /api/v1/logs                 │
                    │   /api/v1/stats                │
                    │   /api/v1/config               │
                    │   /api/v1/llm/raw              │
                    └───────────────────────────────┘
```

### API Surface

The frontend calls **8 backend endpoints** through `src/api/client.js`:

| Function | Method | Endpoint | Purpose |
|---|---|---|---|
| `scanInput()` | `POST` | `/scan/input` | Run a prompt through the 5-layer firewall |
| `scanOutput()` | `POST` | `/scan/output` | Validate LLM output consistency |
| `scanDocument()` | `POST` | `/scan/document` | RAG document pre-scanning |
| `getLogs()` | `GET` | `/logs` | Fetch threat logs for the review queue |
| `getActionLogs()` | `GET` | `/action_logs` | Fetch SEL execution audit trail |
| `getStats()` | `GET` | `/stats` | Dashboard metrics and hourly trends |
| `setConfig()` / `getConfig()` | `PUT` / `GET` | `/config` | Read/write encrypted config values |
| `simulateRawLLM()` | `POST` | `/llm/raw` | Unprotected LLM call for Comparison Mode |
| `updateLogDecision()` | `PUT` | `/logs/{id}/decision` | Human review decision (false positive / confirmed) |

### Data Flow

```
 1. User interacts with UI  ──▶  React component dispatches action
 2. Component calls client.js ──▶  Axios sends request to /api/v1/*
 3. Backend processes request ──▶  Returns JSON (risk_score, layers, flags)
 4. Component updates state   ──▶  React re-renders with new data
 5. Visual feedback:
    ├── BLOCK  ──▶  Red alert card, threat badge, severity gauge
    ├── FLAG   ──▶  Yellow warning, layer breakdown, review prompt
    └── ALLOW  ──▶  Green success, clean status indicator
```

---

<div align="center">

<h2>◈ Technology Stack</h2>

| Layer | Technology | Purpose |
|---|---|---|
| **Core** | ![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black) | Component architecture & hooks-based state management |
| **Build** | ![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white) | Lightning-fast HMR, tree-shaking, and optimized bundles |
| **Routing** | ![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=flat-square&logo=react-router&logoColor=white) | Client-side SPA navigation & deep linking |
| **HTTP** | ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white) | Centralized API client with error handling & CORS proxy |
| **Styling** | ![CSS3](https://img.shields.io/badge/Vanilla_CSS-1572B6?style=flat-square&logo=css3&logoColor=white) | CSS variables, glassmorphism, and responsive grids |
| **Icons** | ![Lucide](https://img.shields.io/badge/Lucide_React-F472B6?style=flat-square) | Consistent, tree-shakeable SVG iconography |
| **Charting** | ![Recharts](https://img.shields.io/badge/Recharts_2.15-22B5BF?style=flat-square) | Animated SVG charts (Area, Radar, Radial Bar) |
| **Fonts** | ![Google Fonts](https://img.shields.io/badge/Google_Fonts-4285F4?style=flat-square&logo=google&logoColor=white) | Space Grotesk · Syne · JetBrains Mono |

</div>

---

<div align="center">

<h2>◈ File Structure</h2>

</div>

Every major file includes conversational JSDoc blocks (matching Tushar's backend documentation style) explaining its purpose, architecture, and key interactions.

```
frontend/
├── index.html                  ← HTML shell, Google Fonts, root mount point
├── vite.config.js              ← Vite build configuration
├── vercel.json                 ← Vercel deployment + API proxy rewrites
├── package.json                ← Dependencies & scripts
│
├── src/
│   ├── main.jsx                ← React DOM mount + ThemeProvider wrapper
│   ├── App.jsx                 ← Route definitions for all 10 modules
│   ├── index.css               ← Design system: tokens, themes, animations, responsive queries
│   ├── ThemeContext.jsx         ← Global dark/light mode (localStorage-persisted)
│   │
│   ├── api/
│   │   └── client.js           ← Centralized Axios layer (8 API functions, CORS proxy)
│   │
│   └── components/
│       ├── Layout.jsx           ← Master layout shell (sidebar + mobile header)
│       ├── Sidebar.jsx          ← Navigation with route highlighting
│       ├── Dashboard.jsx        ← Real-time analytics & KPI overview
│       ├── ThreatAnalysis.jsx   ← 5-layer forensics visualizer (882 lines)
│       ├── ComparisonMode.jsx   ← A/B protected vs raw LLM testing
│       ├── DeepScanSandbox.jsx  ← Advanced red-team diagnostic sandbox
│       ├── FalsePositiveQueue.jsx ← Human-in-the-loop incident review
│       ├── RagScanner.jsx       ← RAG document security scanner
│       ├── SelAuditLog.jsx      ← System execution logs & audit trail
│       ├── SdkIntegration.jsx   ← Developer integration guide
│       └── Configuration.jsx    ← Settings, RBAC, and engine toggles (798 lines)
│
└── assets/
    └── screenshots/             ← Module previews for this README
```

<details>
<summary><b>◈ Design System Overview</b></summary>

<br/>

| Layer | Approach |
|---|---|
| **Color Tokens** | CSS custom properties (`--bg-primary`, `--text-primary`, etc.) for full dark/light switching |
| **Typography Scale** | Space Grotesk (headings), Syne (accents), JetBrains Mono (code/data) |
| **Glassmorphism Cards** | `backdrop-filter: blur()`, layered `rgba`, controlled depth |
| **Motion System** | CSS `transition` on interactive elements, animated chart renders |
| **Responsive Grid** | CSS Grid + Flexbox with mobile-first breakpoints at 768px |

</details>

<details>
<summary><b>◈ State Management</b></summary>

<br/>

| Pattern | Implementation |
|---|---|
| **Theme State** | React Context (`ThemeContext.jsx`) with `localStorage` persistence |
| **Sidebar State** | Lifted to `Layout.jsx` — controls collapsed/expanded width and mobile overlay |
| **Page-Level State** | `useState` + `useEffect` hooks for API data, filters, and UI toggles |
| **API Layer** | Centralized `client.js` with Axios — all error handling in one place |

</details>

<details>
<summary><b>◈ Key Engineering Patterns</b></summary>

<br/>

- **Component-Scoped Inline Styles** — Dynamic styles computed from props (e.g., sidebar width from `collapsed` state)
- **CSS Variable Theming** — `data-theme` attribute on `<html>` swaps 30+ design tokens instantly
- **Responsive Breakpoint System** — Single `@media (max-width: 768px)` query transforms desktop sidebar into mobile overlay
- **Debounced API Calls** — ThreatAnalysis auto-scans as user types with configurable delay
- **Centralized Error Boundaries** — API client catches and logs all network failures gracefully
- **Production CORS Proxy** — Vercel rewrites `/api/v1/*` to the Google Cloud Run backend

</details>

---

<div align="center">

<h2>◈ Quick Start</h2>

</div>

**Prerequisites:** Node.js v18+ &nbsp;·&nbsp; npm v9+

```bash
# Clone the repository
git clone https://github.com/tusharr-mishra/malintent-llm-firewall.git

# Navigate to frontend
cd malintent-llm-firewall/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

> **Note:** The backend API must be running on port 8000 (or deployed to Google Cloud Run) for live data.
> In development, API calls route directly to the Cloud Run URL. In production, they use the Vercel proxy.

```bash
# Production build
npm run build

# Preview production build locally
npm run preview
```

---

<div align="center">

<h2>◈ Deployment</h2>

</div>

| Environment | Platform | URL |
|---|---|---|
| **Production** | Vercel | Auto-deploys on push to `main` |
| **Backend** | Google Cloud Run | FastAPI with PromptGuard-86M model |
| **Database** | Google Cloud SQL | PostgreSQL for threat logs & config |

---

<br/>

<div align="center">

<p><b>MalIntent Security Dashboard &nbsp;·&nbsp; Engineered for the zero-trust AI era</b></p>

<p><i>Threat detected. Firewall engaged. System secure.</i></p>

<br/>

<p>Built with precision by <a href="https://github.com/Shravya317"><b>Shravya</b></a> & <a href="https://github.com/tusharr-mishra"><b>Tushar Mishra</b></a></p>

<br/>

<img src="https://img.shields.io/badge/React_19-Component_Architecture-61DAFB?style=flat-square&labelColor=0a0f1e&logo=react&logoColor=61DAFB" />
&nbsp;
<img src="https://img.shields.io/badge/Design-Glassmorphism-8b5cf6?style=flat-square&labelColor=0a0f1e" />
&nbsp;
<img src="https://img.shields.io/badge/Security-Zero_Trust-ef4444?style=flat-square&labelColor=0a0f1e" />

<br/><br/>

<sub><i>All systems nominal. Prompt injection attempts will be prosecuted by Layer A.</i></sub>

</div>

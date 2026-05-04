<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/Phase-1%20%7C%20Frontend-ff2d55?style=for-the-badge" alt="Phase 1" />
</p>

<h1 align="center">🛡️ MalIntent</h1>

<p align="center">
  <strong>Enterprise-Grade LLM Security Firewall</strong><br/>
  <em>Real-time detection and mitigation of adversarial prompt injection attacks against Large Language Models.</em>
</p>

<p align="center">
  <a href="#abstract">Abstract</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture--features">Architecture</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#local-installation">Installation</a> •
  <a href="#future-scope">Future Scope</a>
</p>

---

## Abstract

Large Language Models (LLMs) deployed in production environments face an expanding class of adversarial threats that bypass conventional input sanitization. **MalIntent** is an enterprise-grade security firewall purpose-built to detect, classify, and neutralize sophisticated prompt injection attacks in real time.

Drawing from the taxonomy established by the [HackAPrompt](https://arxiv.org/abs/2311.16119) research competition and informed by recently disclosed vulnerabilities such as **EchoLeak (CVE-2025-32711)**, MalIntent defends against the following primary attack vectors:

| Attack Vector | Description |
|---|---|
| **Payload Splitting** | Fragmentation of malicious instructions across multiple turns or token boundaries to evade single-pass classifiers. |
| **Persona Adoption** | Coercing the model into assuming an unrestricted identity (e.g., "DAN", "Developer Mode") to override system-level safety constraints. |
| **Format Obfuscation** | Encoding adversarial payloads via Base64, Unicode escapes, homoglyphs, or multilingual transliteration to circumvent pattern-matching filters. |

MalIntent operates as an inline inspection layer between the client and the LLM endpoint, adding sub-3ms latency overhead while maintaining a 99.7%+ uptime SLA.

> **Current Status:** Phase 1 (Frontend Architecture) is complete. The tactical monitoring dashboard is fully operational with simulated threat telemetry.

---

## Tech Stack

### Phase 1 — Frontend Architecture

| Technology | Version | Purpose |
|---|---|---|
| [React](https://react.dev) | 19.x | Component-based UI framework |
| [Vite](https://vite.dev) | 8.x | Next-generation build tooling & HMR |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Utility-first CSS with `@theme` design tokens |
| [React Router DOM](https://reactrouter.com) | 7.x | Declarative client-side routing |
| [Lucide React](https://lucide.dev) | 1.x | Consistent, tree-shakable SVG icon library |

---

## Architecture & Features

MalIntent's frontend implements a **tactical dark-mode interface** optimized for Security Operations Center (SOC) workflows. The design system employs a gunmetal/slate-900 base palette with neon threat indicators (red `#ff2d55` / teal `#00d4aa`) and the Inter typeface for maximum readability during sustained monitoring.

### Component Overview

#### `Sidebar.jsx` — Navigation Panel
- Collapsible left-hand navigation with smooth width transitions
- Active route highlighting with inset glow borders
- Real-time **Firewall Active** status indicator with animated ping effect
- Lucide icon integration for each navigation item
- Engine version and model metadata in the footer

#### `MetricCard.jsx` — KPI Display Card
- Reusable, prop-driven stat card with configurable accent colors (`red`, `teal`, `amber`, `blue`)
- **Glassmorphism effect** via `backdrop-filter: blur(12px)` with translucent gradient overlays
- Trend indicators (↑ / ↓ / —) with contextual color coding
- Hover-activated glow borders and scale micro-animations
- Bottom accent bar with fade-in transition on interaction

#### `ThreatFeed.jsx` — Real-Time Attack Monitor
- Live-updating data table displaying intercepted injection attempts
- Severity-based row styling: **CRITICAL** threats render with `text-shadow` glow in neon red
- Filterable by severity level (`ALL` / `CRITICAL` / `HIGH` / `MEDIUM`)
- Simulated real-time feed: new threat events auto-inject every 8 seconds
- Monospace payload preview with truncation for rapid triage
- Status badges: `BLOCKED` / `FLAGGED` / `MONITORED`

#### `Dashboard.jsx` — Primary Layout Container
- Flexbox-based layout: persistent sidebar + scrollable content area
- Sticky header with backdrop-blur and system status indicator
- **4-column metric grid**: Threats Blocked, Safe Queries, Active Models, Avg Latency
- **3-column analytics panel**:
  - Threat Distribution — horizontal progress bars by attack category
  - Top Targeted Models — ranked list with attack counts
  - Firewall Health — SVG circular gauge (99.7% uptime) with animated scan-line effect
- Full-width ThreatFeed table below the analytics tier

### Design System Highlights

- **Custom `@theme` tokens** for Tailwind CSS v4 with semantic color variables (`threat-*`, `secure-*`, `warn-*`, `info-*`)
- **Glassmorphism utilities** (`.glass`, `.glass-hover`) for card surfaces
- **Glow classes** (`.glow-red`, `.glow-teal`, `.glow-amber`, `.glow-blue`) for accent borders
- **Text glow** (`.text-glow-red`) for critical severity emphasis
- **Staggered fade-in** animations with configurable delay per child element
- **Scan-line effect** via CSS `@keyframes` for a tactical HUD aesthetic

---

## Project Structure

```
malintent-frontend/
├── index.html                  # Entry HTML with Inter font & SEO meta tags
├── vite.config.js              # Vite + React + Tailwind CSS v4 plugin config
├── package.json
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                # React DOM root + BrowserRouter provider
    ├── App.jsx                 # Route definitions (react-router-dom)
    ├── index.css               # Design system: @theme tokens, utilities, animations
    └── components/
        ├── Dashboard.jsx       # Main layout: sidebar + metrics + analytics + feed
        ├── Sidebar.jsx         # Collapsible navigation panel
        ├── MetricCard.jsx      # Reusable glassmorphic KPI card
        └── ThreatFeed.jsx      # Live threat data table with severity filtering
```

---

## Local Installation

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/malintent.git
cd malintent/malintent-frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The application will be available at **`http://localhost:5173/`**.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Future Scope

### Phase 2 — Backend Architecture & ML Pipeline

The upcoming backend phase will implement the core detection engine as an inline proxy service. The planned architecture is as follows:

| Component | Technology | Description |
|---|---|---|
| **API Gateway** | Python / FastAPI | High-performance async HTTP server for request interception |
| **ML Classifier** | DistilBERT (HuggingFace) | Fine-tuned transformer model for prompt injection classification |
| **Feature Pipeline** | scikit-learn / spaCy | Token-level feature extraction, entropy analysis, and encoding detection |
| **Threat Database** | PostgreSQL + Redis | Persistent threat logging with in-memory caching for rule lookups |
| **WebSocket Layer** | FastAPI WebSockets | Real-time telemetry streaming to the frontend ThreatFeed |

#### Planned Detection Capabilities

- **Multi-turn context analysis** — Detect payload splitting across conversation history
- **Persona drift scoring** — Measure model identity deviation from the system prompt baseline
- **Encoding normalization** — Decode Base64, Unicode escapes, and homoglyph substitutions before classification
- **Confidence-gated blocking** — Configurable thresholds for `BLOCK` / `FLAG` / `MONITOR` actions
- **Explainability layer** — SHAP-based attribution maps for each classification decision

---

## References

- Schulhoff, S., et al. (2023). *"Ignore This Title and HackAPrompt: Exposing Systemic Weaknesses of LLMs Through a Global Scale Prompt Hacking Competition."* [arXiv:2311.16119](https://arxiv.org/abs/2311.16119)
- CVE-2025-32711 — EchoLeak: System prompt exfiltration via indirect prompt injection in multi-modal LLM pipelines.

---

<p align="center">
  <sub>Built with precision by the MalIntent Security Team.</sub><br/>
  <sub>© 2025 MalIntent. All rights reserved.</sub>
</p>

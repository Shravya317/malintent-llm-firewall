<div align="center">

<img src="https://img.shields.io/badge/PHASE_2-FRONTEND-ff2d55?style=for-the-badge" alt="Phase 2" />

# MalIntent: SOC Dashboard

**Enterprise-Grade LLM Security Firewall Interface**<br/>
*Real-time tactical monitoring, prompt injection telemetry, and security administration.*

<a href="#abstract">Abstract</a> •
<a href="#tech-stack">Tech Stack</a> •
<a href="#architecture--features">Architecture</a> •
<a href="#project-structure">Structure</a> •
<a href="#local-installation">Installation</a>

---

<img src="https://img.shields.io/badge/REACT-19.X-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
<img src="https://img.shields.io/badge/VITE-8.X-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
<img src="https://img.shields.io/badge/TAILWIND_CSS-4.X-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
<img src="https://img.shields.io/badge/STATUS-OPERATIONAL-22c55e?style=for-the-badge" alt="Status" />

</div>

---

## Abstract

Large Language Models (LLMs) deployed in production environments face an expanding class of adversarial threats that bypass conventional input sanitization. **MalIntent** is an enterprise-grade security firewall purpose-built to detect, classify, and neutralize sophisticated prompt injection attacks in real time.

The Frontend application serves as the Security Operations Center (SOC) dashboard. It provides real-time visibility into the firewall's threat telemetry, user authentication, and system configuration, fully integrated with the FastAPI backend.

---

## Tech Stack

| Technology                                  | Version | Purpose                                       |
| ------------------------------------------- | ------- | --------------------------------------------- |
| [React](https://react.dev)                  | 19.x    | Component-based UI framework                  |
| [Vite](https://vite.dev)                    | 8.x     | Next-generation build tooling & HMR           |
| [Tailwind CSS](https://tailwindcss.com)     | 4.x     | Utility-first CSS with `@theme` design tokens |
| [React Router DOM](https://reactrouter.com) | 7.x     | Declarative client-side routing               |
| [Lucide React](https://lucide.dev)          | 1.x     | Consistent, tree-shakable SVG icon library    |

---

## Architecture & Features

MalIntent's frontend implements a **tactical dark-mode interface** optimized for SOC workflows. The design system employs a gunmetal/slate-900 base palette with neon threat indicators.

### Key Features
- **Secure Authentication Flow**: Full JWT-based Login, Registration, and Email OTP verification integrated with the backend.
- **Protected Routes**: Context-based routing (`AuthContext`) ensures only authenticated users can access the dashboard.
- **Real-Time Threat Feed**: Live data table displaying intercepted injection attempts directly fetched from the backend API.
- **Interactive Playground**: A dedicated testing interface mimicking a chat application, connected to the backend RAG/Scanner endpoints.
- **Dynamic Configuration**: A settings panel to manage the firewall's thresholds and API keys on the fly.

### Component Overview

- `AuthContext.jsx` — Global JWT state management and API header injection.
- `api.js` — Centralized Axios/fetch wrapper for backend REST API communication.
- `Sidebar.jsx` — Collapsible navigation panel with active route highlighting.
- `MetricCard.jsx` — Reusable, prop-driven stat card with glassmorphism effects.
- `ThreatFeed.jsx` — Live-updating data table displaying intercepted injection attempts with severity-based row styling.
- `Dashboard.jsx` — Primary layout container with metric grids and analytics panels.

---

## Project Structure

```text
malintent/frontend/
├── index.html                  # Entry HTML with Inter font & SEO meta tags
├── vite.config.js              # Vite + React + Tailwind CSS v4 plugin config
├── src/
│   ├── main.jsx                # React DOM root + BrowserRouter provider
│   ├── App.jsx                 # Route definitions (Auth & Protected Routes)
│   ├── index.css               # Design system: @theme tokens, utilities, animations
│   ├── api.js                  # Backend API integration layer
│   ├── context/
│   │   └── AuthContext.jsx     # JWT Authentication State Provider
│   └── components/
│       ├── Login.jsx           # JWT Login form
│       ├── Register.jsx        # User Registration form
│       ├── VerifyOTP.jsx       # Email OTP verification
│       ├── Dashboard.jsx       # Main layout: sidebar + metrics + analytics
│       ├── Playground.jsx      # Interactive RAG/Chat testing interface
│       ├── Settings.jsx        # Firewall configuration panel
│       ├── Sidebar.jsx         # Collapsible navigation panel
│       ├── MetricCard.jsx      # Reusable glassmorphic KPI card
│       └── ThreatFeed.jsx      # Live threat data table
```

---

## Local Installation

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x

### Setup

```bash
# 1. Navigate to frontend directory
cd malintent/frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The application will be available at **`http://localhost:5173/`**. Make sure your FastAPI backend is running simultaneously on port 8000 for full API integration.

### Build for Production

```bash
npm run build
npm run preview
```

---

## References

- Schulhoff, S., et al. (2023). _"Ignore This Title and HackAPrompt: Exposing Systemic Weaknesses of LLMs Through a Global Scale Prompt Hacking Competition."_ [arXiv:2311.16119](https://arxiv.org/abs/2311.16119)
- CVE-2025-32711 — EchoLeak: System prompt exfiltration via indirect prompt injection in multi-modal LLM pipelines.

/**
 * App.jsx — Main Application Router for the MalIntent Frontend.
 *
 * This file serves as the root router component. It defines the routing structure
 * for the public landing page and all internal dashboard modules.
 *
 * Architecture Notes:
 *   - The `ThemeProvider` wraps this at the `main.jsx` level, ensuring all components
 *     (and the Layout itself) have access to the global dark/light theme state.
 *   - The LandingPage is rendered at `/` WITHOUT the Layout wrapper (no sidebar).
 *   - All internal dashboard pages are wrapped in `<Layout>` and served under
 *     their respective routes.
 *
 * @component
 */
import { Routes, Route } from 'react-router-dom'
import LandingPage from './views/LandingPage'
import AuthPage from './views/AuthPage'
import Dashboard from './views/Dashboard'
import ThreatAnalysis from './views/ThreatAnalysis'
import Configuration from './views/Configuration'
import ComparisonMode from './views/ComparisonMode'
import FalsePositiveQueue from './views/FalsePositiveQueue'
import DeepScanSandbox from './views/DeepScanSandbox'
import RagScanner from './views/RagScanner'
import SelAuditLog from './views/SelAuditLog'
import SdkIntegration from './views/SdkIntegration'

import Layout from './components/layout/Layout'

export default function App() {
  return (
    <Routes>
      {/* Public landing page — no sidebar, no Layout */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />

      {/* Internal dashboard pages — wrapped in Layout with sidebar */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/threats" element={<ThreatAnalysis />} />
        <Route path="/comparison" element={<ComparisonMode />} />
        <Route path="/sandbox" element={<DeepScanSandbox />} />
        <Route path="/review-queue" element={<FalsePositiveQueue />} />
        <Route path="/scanner" element={<RagScanner />} />
        <Route path="/action-logs" element={<SelAuditLog />} />
        <Route path="/sdk" element={<SdkIntegration />} />
        <Route path="/settings" element={<Configuration />} />
      </Route>
    </Routes>
  )
}

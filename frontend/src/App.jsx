/**
 * App.jsx — Main Application Router for the MalIntent Frontend.
 *
 * This file serves as the root router component. It wraps the entire application
 * in the global `Layout` component and defines the routing structure for all
 * dashboard modules using `react-router-dom`.
 *
 * Architecture Notes:
 *   - The `ThemeProvider` wraps this at the `main.jsx` level, ensuring all components
 *     (and the Layout itself) have access to the global dark/light theme state.
 *   - All primary pages (Dashboard, Sandbox, Review Queue, etc.) are lazy-loaded
 *     components directly tied to their respective routes here.
 *
 * @component
 */
import { Routes, Route } from 'react-router-dom'
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
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/threats" element={<ThreatAnalysis />} />
        <Route path="/comparison" element={<ComparisonMode />} />
        <Route path="/sandbox" element={<DeepScanSandbox />} />
        <Route path="/review-queue" element={<FalsePositiveQueue />} />
        <Route path="/scanner" element={<RagScanner />} />
        <Route path="/action-logs" element={<SelAuditLog />} />
        <Route path="/sdk" element={<SdkIntegration />} />
        <Route path="/settings" element={<Configuration />} />
        <Route path="/*" element={<Dashboard />} />
      </Routes>
    </Layout>
  )
}

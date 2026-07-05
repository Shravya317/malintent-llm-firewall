import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ThreatAnalysis from './components/ThreatAnalysis'
import Configuration from './components/Configuration'
import ComparisonMode from './components/ComparisonMode'
import FalsePositiveQueue from './components/FalsePositiveQueue'
import RagScanner from './components/RagScanner'
import SelAuditLog from './components/SelAuditLog'
import SdkIntegration from './components/SdkIntegration'
import OutputGuard from './components/OutputGuard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/threats" element={<ThreatAnalysis />} />
      <Route path="/comparison" element={<ComparisonMode />} />
      <Route path="/queue" element={<FalsePositiveQueue />} />
      <Route path="/scanner" element={<RagScanner />} />
      <Route path="/action-logs" element={<SelAuditLog />} />
      <Route path="/output-guard" element={<OutputGuard />} />
      <Route path="/sdk" element={<SdkIntegration />} />
      <Route path="/settings" element={<Configuration />} />
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  )
}

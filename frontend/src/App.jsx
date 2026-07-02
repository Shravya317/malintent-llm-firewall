import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ThreatAnalysis from './components/ThreatAnalysis'
import Configuration from './components/Configuration'
import ComparisonMode from './components/ComparisonMode'
import FalsePositiveQueue from './components/FalsePositiveQueue'
import RagScanner from './components/RagScanner'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/threats" element={<ThreatAnalysis />} />
      <Route path="/settings" element={<Configuration />} />
      <Route path="/comparison" element={<ComparisonMode />} />
      <Route path="/queue" element={<FalsePositiveQueue />} />
      <Route path="/scanner" element={<RagScanner />} />
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  )
}

import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ThreatAnalysis from './components/ThreatAnalysis'
import Configuration from './components/Configuration'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/threats" element={<ThreatAnalysis />} />
      <Route path="/settings" element={<Configuration />} />
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  )
}

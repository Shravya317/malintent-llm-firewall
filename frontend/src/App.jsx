import { Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ThreatAnalysis from './components/ThreatAnalysis'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/threats" element={<ThreatAnalysis />} />
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  )
}

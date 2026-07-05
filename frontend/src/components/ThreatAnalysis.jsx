import React, { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { getLogs } from '../api/client'
import Sidebar from './Sidebar'

const CATEGORIES = [
  'All',
  'direct_override',
  'jailbreak',
  'exfiltration',
  'indirect_injection',
  'privilege_escalation',
  'rag_poisoning',
  'obfuscated',
  'ml_detected',
  'safe',
]

// Pattern prefix → full display name
const PATTERN_PREFIXES = {
  DI: 'Direct Injection',
  PO: 'Persona Override',
  DE: 'Data Exfiltration',
  EO: 'Encoding Obfuscation',
  II: 'Indirect Injection',
  CM: 'Context Manipulation',
  PE: 'Privilege Escalation',
  HE: 'Harmful Elicitation',
  SA: 'Safe / No Threat',
}

function parsePatternId(id) {
  if (!id) return 'Unknown'
  const prefix = id.substring(0, 2).toUpperCase()
  return PATTERN_PREFIXES[prefix] || id
}

export default function ThreatAnalysis() {
  const { theme, toggleTheme } = useTheme()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [minRisk, setMinRisk] = useState('')
  const [maxRisk, setMaxRisk] = useState('')
  const [decisions, setDecisions] = useState({ ALLOW: true, FLAG: true, BLOCK: true })
  const [category, setCategory] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [threats, setThreats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const fetchLogs = async () => {
      try {
        const rawLogs = await getLogs()
        if (isMounted) {
          const mapped = rawLogs.map(log => ({
            ...log,
            id: `THR-${String(log.id).padStart(4, '0')}`,
            primary_category: log.attack_category ? parsePatternId(log.attack_category) : 'Safe',
            prompt_full: log.prompt_full || log.payload_hash || 'No payload available',
            prompt_preview: log.prompt_full ? log.prompt_full.substring(0, 48) + '...' : (log.payload_hash || '').substring(0, 24) + '...',
            layers_triggered: log.layers_triggered ? log.layers_triggered.split(',') : [],
            total_latency_ms: log.latency_ms || 0,
            layer_a_fired: log.layer_a_matched,
            layer_a_confidence: log.layer_a_matched ? 1.0 : 0.0,
            layer_a_matched_patterns: [],
            layer_b_fired: log.layer_b_confidence >= 0.5,
            layer_b_confidence: log.layer_b_confidence || 0.0,
            layer_c_fired: false,
            layer_c_confidence: 0.0,
            layer_c_top_matches: [],
            suspicious_segments: [],
            explanation: log.explanation || 'Detailed explanation not available yet.',
          }))
          setThreats(mapped)
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch logs')
          setLoading(false)
        }
      }
    }
    
    fetchLogs()
    const intervalId = setInterval(fetchLogs, 3000)
    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [])

  const handleToggleDecision = (dec) => {
    setDecisions(prev => ({ ...prev, [dec]: !prev[dec] }))
  }

  const handleResetFilters = () => {
    setFromDate(''); setToDate(''); setMinRisk(''); setMaxRisk('')
    setDecisions({ ALLOW: true, FLAG: true, BLOCK: true }); setCategory('All')
  }

  const filteredThreats = threats.filter(item => {
    if (fromDate && item.timestamp.substring(0, 10) < fromDate) return false
    if (toDate && item.timestamp.substring(0, 10) > toDate) return false
    if (minRisk !== '' && item.risk_score < parseInt(minRisk, 10)) return false
    if (maxRisk !== '' && item.risk_score > parseInt(maxRisk, 10)) return false
    if (!decisions[item.decision]) return false
    if (category !== 'All' && item.primary_category !== category) return false
    return true
  })

  const renderHighlightedPrompt = (promptText, segments, categoryStr) => {
    if (!segments || segments.length === 0) return <span>{promptText}</span>
    let parts = [{ text: promptText, isMatch: false }]
    segments.forEach((seg, segIdx) => {
      const newParts = []
      parts.forEach(part => {
        if (part.isMatch) { newParts.push(part); return }
        const split = part.text.split(seg.text)
        split.forEach((sub, subIdx) => {
          newParts.push({ text: sub, isMatch: false })
          if (subIdx < split.length - 1)
            newParts.push({ text: seg.text, isMatch: true, reason: seg.reason, index: segIdx })
        })
      })
      parts = newParts
    })
    return parts.map((part, i) => {
      if (!part.isMatch) return <span key={i}>{part.text}</span>
      const isHovered = hoveredIndex === part.index
      return (
        <mark key={i}
          onMouseEnter={() => setHoveredIndex(part.index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ background: 'rgba(229,57,53,0.18)', color: 'var(--accent-threat)', borderBottom: '2px solid var(--accent-threat)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'help', position: 'relative', padding: '2px 4px', borderRadius: 4 }}
        >
          {part.text}
          <span style={{ marginLeft: 6, background: 'var(--accent-threat)', color: 'var(--bg-base)', padding: '2px 6px', borderRadius: 12, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', verticalAlign: 'middle', textDecoration: 'none', display: 'inline-block' }}>{categoryStr}</span>
          {isHovered && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 10, padding: '14px 18px', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 8, boxShadow: '0 16px 40px rgba(0,0,0,0.85)', width: 320, zIndex: 100, fontFamily: 'var(--font-sans)', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-primary)', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>
              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Suspicious Segment Analysis</div>
              {part.reason}
            </div>
          )}
        </mark>
      )
    })
  }

  // Threshold-aligned colors
  const riskColor = (score) => score >= 70 ? 'var(--accent-threat)' : score >= 25 ? 'var(--accent-warn)' : 'var(--accent-secure)'
  const decColor = (dec) => dec === 'BLOCK' ? 'var(--accent-threat)' : dec === 'FLAG' ? 'var(--accent-warn)' : 'var(--accent-secure)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 200, minHeight: '100vh', overflowY: 'auto' }}>
        {/* Header */}
        <header style={{ padding: '40px 56px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: 0 }}>Threat Analysis</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', margin: '8px 0 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Advanced Forensics Dashboard · Locked Week 3 RiskResult Contract</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-secure)', display: 'block' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent-secure)', letterSpacing: '0.06em' }}>SYSTEM ACTIVE</span>
            </div>
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0, transition: 'color 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}
            >{theme === 'dark' ? '◐ Light' : '◑ Dark'}</button>
          </div>
        </header>

        <div style={{ padding: '48px 56px 96px' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28, padding: '24px 28px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)', marginBottom: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Date Range:</span>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', colorScheme: theme === 'dark' ? 'dark' : 'light' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-faint)' }}>to</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', colorScheme: theme === 'dark' ? 'dark' : 'light' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Risk Score:</span>
              <input type="number" placeholder="Min" min="0" max="100" value={minRisk} onChange={e => setMinRisk(e.target.value)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px', width: 72, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-faint)' }}>to</span>
              <input type="number" placeholder="Max" min="0" max="100" value={maxRisk} onChange={e => setMaxRisk(e.target.value)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px', width: 72, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500, marginRight: 6 }}>Decision:</span>
              {['ALLOW', 'FLAG', 'BLOCK'].map(dec => {
                const active = decisions[dec]
                const cv = decColor(dec)
                return (
                  <button key={dec} onClick={() => handleToggleDecision(dec)} style={{ background: active ? `color-mix(in srgb, ${cv} 15%, transparent)` : 'var(--bg-base)', border: `1px solid ${active ? cv : 'var(--border-subtle)'}`, color: active ? cv : 'var(--text-muted)', padding: '6px 16px', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s ease' }}>{dec}</button>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Category:</span>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <button onClick={handleResetFilters} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', marginLeft: 'auto', padding: '8px 16px' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >Reset Filters</button>
          </div>

          {/* Table */}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
                    {['Risk', 'Decision', 'Attack Category', 'Prompt Preview', 'Layers Triggered', 'Latency', 'Origin IP & Timestamp'].map(h => (
                      <th key={h} style={{ padding: '20px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{h}</th>
                    ))}
                    <th style={{ padding: '20px 24px', width: 48 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && threats.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>Loading threat logs...</td></tr>
                  ) : error && threats.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--accent-threat)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>Error: {error}</td></tr>
                  ) : filteredThreats.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>No threat events match the selected filters.</td></tr>
                  ) : filteredThreats.map(item => {
                    const isExpanded = expandedId === item.id
                    const rc = riskColor(item.risk_score)
                    const dc = decColor(item.decision)
                    const rotation = (item.risk_score / 100) * 180 - 90
                    const preview = item.prompt_preview || (item.prompt_full ? item.prompt_full.substring(0, 48) + '...' : 'No preview available')

                    // Dynamic Layer C color based on threat status
                    const layerCColor = item.layer_c_fired ? 'var(--accent-threat)' : item.layer_c_confidence > 0.4 ? 'var(--accent-warn)' : 'var(--accent-secure)'

                    return (
                      <React.Fragment key={item.id}>
                        <tr onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          style={{ borderBottom: '1px solid var(--border-faint)', cursor: 'pointer', background: isExpanded ? 'var(--bg-base)' : 'transparent', transition: 'background 0.2s ease' }}
                          onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg-surface)' }}
                          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                        >
                          <td style={{ padding: '20px 20px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 28, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, background: `color-mix(in srgb, ${rc} 18%, transparent)`, color: rc, border: `1px solid color-mix(in srgb, ${rc} 40%, transparent)` }}>{item.risk_score}</span>
                          </td>
                          <td style={{ padding: '20px 20px' }}>
                            <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 14, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, background: `color-mix(in srgb, ${dc} 18%, transparent)`, color: dc, border: `1px solid color-mix(in srgb, ${dc} 35%, transparent)`, letterSpacing: '0.05em' }}>{item.decision}</span>
                          </td>
                          <td style={{ padding: '20px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.primary_category}</td>
                          <td style={{ padding: '20px 20px', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 340, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.5 }}>{preview}</td>
                          <td style={{ padding: '20px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.layers_triggered.join(', ') || '—'}</td>
                          <td style={{ padding: '20px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.total_latency_ms ? `${item.total_latency_ms.toFixed(2)}ms` : '—'}</td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>{item.source_ip || '192.168.1.42'}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                          </td>
                          <td style={{ padding: '20px 24px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{isExpanded ? '▾' : '▸'}</td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <td colSpan={8} style={{ padding: '36px 40px' }}>
                              <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}>
                                
                                {/* TOP BANNER: Forensic Metadata & Impact Analysis */}
                                <div style={{ padding: '20px 32px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                    <div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Timestamp</div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(item.timestamp).toLocaleString()}</div>
                                    </div>
                                    <div style={{ width: 1, height: 28, background: 'var(--border-faint)' }} />
                                    <div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Origin IP</div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.source_ip || '192.168.1.42'}</div>
                                    </div>
                                    <div style={{ width: 1, height: 28, background: 'var(--border-faint)' }} />
                                    <div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Client Application</div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.client_app || 'Internal RAG Bot'}</div>
                                    </div>
                                    <div style={{ width: 1, height: 28, background: 'var(--border-faint)' }} />
                                    <div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Payload Signature</div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: item.primary_category === 'Safe' ? 'var(--accent-secure)' : 'var(--accent-threat)', fontWeight: 600 }}>{item.primary_category === 'Safe' ? 'Safe / No Threat' : item.primary_category}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, textAlign: 'right' }}>Total Latency</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'right' }}>{item.total_latency_ms}ms</div>
                                  </div>
                                </div>

                                {/* 3-PANEL GRID */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1.15fr 0.85fr', gap: 40, padding: '36px 32px' }}>

                                  {/* PANEL 1: Prompt Analysis */}
                                  <div>
                                    <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 20px', borderBottom: '1px solid var(--border-faint)', paddingBottom: 10, fontWeight: 600 }}>Prompt Analysis</h3>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 2.0, color: 'var(--text-primary)', background: 'rgba(15, 18, 28, 0.6)', padding: 28, borderRadius: 12, border: '1px solid var(--border-subtle)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)', whiteSpace: 'pre-wrap' }}>
                                      {renderHighlightedPrompt(item.prompt_full, item.suspicious_segments, item.primary_category)}
                                    </div>
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)', margin: '16px 0 0', fontStyle: 'italic' }}>* Hover over highlighted segments to view detailed forensic explanations.</p>
                                  </div>

                                  {/* PANEL 2: Layer Analysis */}
                                  <div>
                                    <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 20px', borderBottom: '1px solid var(--border-faint)', paddingBottom: 10, fontWeight: 600 }}>Layer Analysis</h3>

                                    {/* Layer A */}
                                    <div style={{ marginBottom: 36 }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span>Layer A — Pattern Engine</span>
                                        <span style={{ color: item.layer_a_fired ? 'var(--accent-threat)' : 'var(--text-muted)', fontWeight: 700 }}>{item.layer_a_fired ? 'FIRED' : 'CLEAR'}</span>
                                      </div>
                                      {item.layer_a_matched_patterns.length === 0 ? (
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-faint)' }}>No malicious patterns matched</div>
                                      ) : (
                                        item.layer_a_matched_patterns.map((patId, pIdx) => (
                                          <div key={pIdx} style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-faint)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{parsePatternId(patId)}</span>
                                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{Math.round(item.layer_a_confidence * 100)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: 6, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-faint)' }}>
                                              <div style={{ width: `${item.layer_a_confidence * 100}%`, height: '100%', background: 'var(--accent-threat)', borderRadius: 3 }} />
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>

                                    {/* Layer B */}
                                    <div style={{ marginBottom: 36 }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span>Layer B — ML Classifier</span>
                                        <span style={{ color: item.layer_b_fired ? 'var(--accent-threat)' : 'var(--accent-secure)', fontWeight: 700 }}>{item.layer_b_fired ? 'MALICIOUS' : 'BENIGN'}</span>
                                      </div>
                                      <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-faint)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Prompt-Guard (Meta AI)</span>
                                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{(item.layer_b_confidence * 100).toFixed(2)}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: 6, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-faint)' }}>
                                          <div style={{ width: `${item.layer_b_confidence * 100}%`, height: '100%', background: item.layer_b_fired ? 'var(--accent-threat)' : 'var(--accent-secure)', borderRadius: 3 }} />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Layer C */}
                                    <div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span>Layer C — Semantic Similarity</span>
                                        <span style={{ color: layerCColor, fontWeight: 700 }}>{item.layer_c_fired ? 'FIRED' : item.layer_c_confidence > 0.4 ? 'SUSPICIOUS' : 'CLEAR'}</span>
                                      </div>

                                      {/* Base signal card */}
                                      <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-faint)', marginBottom: 20 }}>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                          <span>FAISS Semantic Base Confidence</span>
                                          <span style={{ color: layerCColor }}>{Math.round(item.layer_c_confidence * 100)}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: 6, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-faint)' }}>
                                          <div style={{ width: `${item.layer_c_confidence * 100}%`, height: '100%', background: layerCColor, borderRadius: 3 }} />
                                        </div>
                                      </div>

                                      {/* Top Matches Cards — Spacious layout */}
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, fontWeight: 600 }}>FAISS Nearest Neighbor Matches</div>
                                      {(item.layer_c_top_matches || []).map((match, sIdx) => (
                                        <div key={sIdx} style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-faint)', marginBottom: 14 }}>
                                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-bright)', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5 }}>
                                            "{match.phrase}"
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                                            <span style={{ background: 'var(--bg-base)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: 500 }}>{match.category}</span>
                                            <span style={{ color: layerCColor, fontWeight: 700 }}>{Math.round(match.similarity * 100)}% Similarity</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* PANEL 3: Risk Assessment */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-base)', padding: 32, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                                    <h3 style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 32px', borderBottom: '1px solid var(--border-faint)', paddingBottom: 10, fontWeight: 600 }}>Risk Assessment</h3>

                                    {/* SVG Speedometer — Safe 0-24, Suspicious 25-69, Blocked 70-100 */}
                                    <div style={{ width: '100%', maxWidth: 220, position: 'relative', margin: '16px 0 24px' }}>
                                      <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto' }}>
                                        {/* Green 0-24 */}
                                        <path d="M 20 100 A 80 80 0 0 1 56.72 32.92" fill="none" stroke="var(--accent-secure)" strokeWidth="16" strokeLinecap="round" opacity="0.85" />
                                        {/* Yellow 25-69 */}
                                        <path d="M 56.72 32.92 A 80 80 0 0 1 155.85 43.82" fill="none" stroke="var(--accent-warn)" strokeWidth="16" opacity="0.85" />
                                        {/* Red 70-100 */}
                                        <path d="M 155.85 43.82 A 80 80 0 0 1 180 100" fill="none" stroke="var(--accent-threat)" strokeWidth="16" strokeLinecap="round" opacity="0.85" />
                                        <polygon points="97,100 100,35 103,100" fill="var(--text-primary)" transform={`rotate(${rotation}, 100, 100)`} style={{ transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                        <circle cx="100" cy="100" r="8" fill="var(--text-primary)" />
                                        <circle cx="100" cy="100" r="4" fill="var(--bg-base)" />
                                      </svg>
                                      <div style={{ textAlign: 'center', marginTop: -12 }}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '3.0rem', color: rc, lineHeight: 1, fontWeight: 700 }}>{item.risk_score}</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: dc, marginTop: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.decision}</div>
                                      </div>
                                    </div>

                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '24px 0 24px', padding: '0 8px', lineHeight: 1.6 }}>{item.explanation}</p>

                                    {/* Layers Triggered Badges */}
                                    <div style={{ width: '100%', borderTop: '1px solid var(--border-faint)', paddingTop: 24, marginTop: 'auto' }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, textAlign: 'center', fontWeight: 600 }}>Layers Triggered</div>
                                      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                                        {item.layers_triggered.length === 0 ? (
                                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                                        ) : item.layers_triggered.map((layer, lIdx) => (
                                          <span key={lIdx} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '6px 18px', borderRadius: 16, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{layer}</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

import React, { useState } from 'react'
import { useTheme } from '../ThemeContext'
import { mockThreatAnalysis } from '../data/mockData'
import Sidebar from './Sidebar'

const CATEGORIES = [
  'All',
  'direct_injection',
  'jailbreak',
  'data_exfiltration',
  'token_smuggling',
  'persona_override',
  'indirect_injection',
  'benign_curiosity',
]

export default function ThreatAnalysis() {
  const { theme, toggleTheme } = useTheme()

  // Filter states
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [minRisk, setMinRisk] = useState('')
  const [maxRisk, setMaxRisk] = useState('')
  const [decisions, setDecisions] = useState({ ALLOW: true, FLAG: true, BLOCK: true })
  const [category, setCategory] = useState('All')

  // Expanded row state & tooltip state
  const [expandedId, setExpandedId] = useState(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const handleToggleDecision = (dec) => {
    setDecisions(prev => ({ ...prev, [dec]: !prev[dec] }))
  }

  const handleResetFilters = () => {
    setFromDate('')
    setToDate('')
    setMinRisk('')
    setMaxRisk('')
    setDecisions({ ALLOW: true, FLAG: true, BLOCK: true })
    setCategory('All')
  }

  // Filter logic
  const filteredThreats = mockThreatAnalysis.filter(item => {
    // Date filter
    if (fromDate && item.timestamp.substring(0, 10) < fromDate) return false
    if (toDate && item.timestamp.substring(0, 10) > toDate) return false

    // Risk filter
    if (minRisk !== '' && item.risk_score < parseInt(minRisk, 10)) return false
    if (maxRisk !== '' && item.risk_score > parseInt(maxRisk, 10)) return false

    // Decision filter
    if (!decisions[item.decision]) return false

    // Category filter
    if (category !== 'All' && item.primary_category !== category) return false

    return true
  })

  // Helper to render highlighted prompt with tooltips
  const renderHighlightedPrompt = (promptText, segments) => {
    if (!segments || segments.length === 0) {
      return <span>{promptText}</span>
    }

    let parts = [{ text: promptText, isMatch: false }]

    segments.forEach((seg, segIdx) => {
      const newParts = []
      parts.forEach(part => {
        if (part.isMatch) {
          newParts.push(part)
          return
        }
        const target = seg.text
        const split = part.text.split(target)
        split.forEach((sub, subIdx) => {
          newParts.push({ text: sub, isMatch: false })
          if (subIdx < split.length - 1) {
            newParts.push({ text: target, isMatch: true, reason: seg.reason, index: segIdx })
          }
        })
      })
      parts = newParts
    })

    return parts.map((part, i) => {
      if (!part.isMatch) {
        return <span key={i}>{part.text}</span>
      }
      const isHovered = hoveredIndex === part.index
      return (
        <mark
          key={i}
          onMouseEnter={() => setHoveredIndex(part.index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{
            background: 'rgba(229, 57, 53, 0.15)',
            color: 'var(--accent-threat)',
            borderBottom: '2px solid var(--accent-threat)',
            cursor: 'help',
            position: 'relative',
            padding: '0 2px',
            borderRadius: 2,
          }}
        >
          {part.text}
          {isHovered && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 6,
                padding: '10px 14px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                width: 280,
                zIndex: 100,
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                lineHeight: 1.4,
                color: 'var(--text-primary)',
                fontWeight: 400,
                textTransform: 'none',
                letterSpacing: 'normal',
              }}
            >
              <div
                style={{
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Suspicious Segment
              </div>
              {part.reason}
            </div>
          )}
        </mark>
      )
    })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <main
        style={{
          flex: 1,
          marginLeft: 200,
          minHeight: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: '40px 56px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Threat Analysis
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                color: 'var(--text-faint)',
                margin: '6px 0 0',
                letterSpacing: '0.03em',
              }}
            >
              Deep-dive threat investigation & multi-layer evaluation logs
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--accent-secure)',
                  display: 'block',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6rem',
                  fontWeight: 500,
                  color: 'var(--accent-secure)',
                  letterSpacing: '0.06em',
                }}
              >
                NOMINAL
              </span>
            </div>

            <button
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                fontWeight: 500,
                color: 'var(--text-faint)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: 0,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}
            >
              {theme === 'dark' ? '◐ Light' : '◑ Dark'}
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: '48px 56px 72px' }}>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 24,
              padding: '20px 24px',
              background: 'var(--bg-elevated)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              marginBottom: 32,
            }}
          >
            {/* Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Date:</span>
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                  colorScheme: theme === 'dark' ? 'dark' : 'light',
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-faint)' }}>to</span>
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                  colorScheme: theme === 'dark' ? 'dark' : 'light',
                }}
              />
            </div>

            {/* Risk Score Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Risk:</span>
              <input
                type="number"
                placeholder="Min"
                min="0"
                max="100"
                value={minRisk}
                onChange={e => setMinRisk(e.target.value)}
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  width: 64,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-faint)' }}>to</span>
              <input
                type="number"
                placeholder="Max"
                min="0"
                max="100"
                value={maxRisk}
                onChange={e => setMaxRisk(e.target.value)}
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  width: 64,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Decision Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', marginRight: 4 }}>Decision:</span>
              {['ALLOW', 'FLAG', 'BLOCK'].map(dec => {
                const active = decisions[dec]
                const colorVar = dec === 'ALLOW' ? 'var(--accent-secure)' : dec === 'FLAG' ? 'var(--accent-warn)' : 'var(--accent-threat)'
                return (
                  <button
                    key={dec}
                    onClick={() => handleToggleDecision(dec)}
                    style={{
                      background: active ? `color-mix(in srgb, ${colorVar} 15%, transparent)` : 'var(--bg-base)',
                      border: `1px solid ${active ? colorVar : 'var(--border-subtle)'}`,
                      color: active ? colorVar : 'var(--text-muted)',
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {dec}
                  </button>
                )
              })}
            </div>

            {/* Category Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Category:</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                marginLeft: 'auto',
                padding: '6px 12px',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              Reset Filters
            </button>
          </div>

          {/* Threats Table */}
          <div
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
                    <th style={{ padding: '16px 24px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk</th>
                    <th style={{ padding: '16px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Decision</th>
                    <th style={{ padding: '16px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                    <th style={{ padding: '16px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prompt Preview</th>
                    <th style={{ padding: '16px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Layers</th>
                    <th style={{ padding: '16px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</th>
                    <th style={{ padding: '16px 24px', width: 48 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredThreats.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        No threat events match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredThreats.map((item) => {
                      const isExpanded = expandedId === item.id
                      const riskColor = item.risk_score >= 70 ? 'var(--accent-threat)' : item.risk_score >= 40 ? 'var(--accent-warn)' : 'var(--accent-secure)'
                      const decColor = item.decision === 'BLOCK' ? 'var(--accent-threat)' : item.decision === 'FLAG' ? 'var(--accent-warn)' : 'var(--accent-secure)'

                      // Normalizing layer data
                      const layerAPatterns = item.layer_a?.patterns_matched || item.layer_a?.matched_patterns || []
                      const layerB = item.layer_b || { model: 'DistilBERT', label: 'benign', confidence: 0.85 }
                      const layerCSimilar = item.layer_c?.similar_prompts || item.layer_c?.similar || []

                      // Gauge calculations
                      const rotation = (item.risk_score / 100) * 180 - 90

                      return (
                        <React.Fragment key={item.id}>
                          {/* Main Row */}
                          <tr
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            style={{
                              borderBottom: '1px solid var(--border-faint)',
                              cursor: 'pointer',
                              background: isExpanded ? 'var(--bg-base)' : 'transparent',
                              transition: 'background 0.2s ease',
                            }}
                            onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg-surface)' }}
                            onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                          >
                            {/* Risk Score */}
                            <td style={{ padding: '16px 24px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 32,
                                  height: 24,
                                  borderRadius: 4,
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: `color-mix(in srgb, ${riskColor} 15%, transparent)`,
                                  color: riskColor,
                                  border: `1px solid color-mix(in srgb, ${riskColor} 40%, transparent)`,
                                }}
                              >
                                {item.risk_score}
                              </span>
                            </td>

                            {/* Decision Pill */}
                            <td style={{ padding: '16px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: 12,
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  background: `color-mix(in srgb, ${decColor} 15%, transparent)`,
                                  color: decColor,
                                  border: `1px solid color-mix(in srgb, ${decColor} 30%, transparent)`,
                                }}
                              >
                                {item.decision}
                              </span>
                            </td>

                            {/* Category */}
                            <td style={{ padding: '16px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                              {item.primary_category}
                            </td>

                            {/* Prompt Preview */}
                            <td style={{ padding: '16px 16px', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.prompt_preview}
                            </td>

                            {/* Layers Triggered */}
                            <td style={{ padding: '16px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {item.layers_triggered.join(', ') || 'none'}
                            </td>

                            {/* Timestamp */}
                            <td style={{ padding: '16px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>

                            {/* Chevron */}
                            <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                              {isExpanded ? '▾' : '▸'}
                            </td>
                          </tr>

                          {/* Expanded 3-Panel View */}
                          {isExpanded && (
                            <tr style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
                              <td colSpan={7} style={{ padding: '28px 32px' }}>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.2fr 1fr 0.8fr',
                                    gap: 32,
                                    padding: 28,
                                    background: 'var(--bg-elevated)',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  {/* PANEL 1: Prompt Analysis */}
                                  <div>
                                    <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px', borderBottom: '1px solid var(--border-faint)', paddingBottom: 8 }}>
                                      Prompt Analysis
                                    </h3>
                                    <div
                                      style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.8rem',
                                        lineHeight: 1.8,
                                        color: 'var(--text-primary)',
                                        background: 'var(--bg-base)',
                                        padding: 20,
                                        borderRadius: 6,
                                        border: '1px solid var(--border-faint)',
                                      }}
                                    >
                                      {renderHighlightedPrompt(item.prompt_full, item.suspicious_segments)}
                                    </div>
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '12px 0 0' }}>
                                      * Hover over highlighted segments to view pattern explanation.
                                    </p>
                                  </div>

                                  {/* PANEL 2: Layer Analysis */}
                                  <div>
                                    <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px', borderBottom: '1px solid var(--border-faint)', paddingBottom: 8 }}>
                                      Layer Analysis
                                    </h3>

                                    {/* Layer A */}
                                    <div style={{ marginBottom: 24 }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Layer A — Pattern Engine
                                      </div>
                                      {layerAPatterns.length === 0 ? (
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>No patterns matched</div>
                                      ) : (
                                        layerAPatterns.map((p, pIdx) => {
                                          const name = typeof p === 'string' ? p : p.pattern
                                          const conf = typeof p === 'string' ? item.layer_a.confidence || 0.9 : p.confidence
                                          return (
                                            <div key={pIdx} style={{ marginBottom: 12 }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                                                <span style={{ color: 'var(--text-primary)', background: 'var(--bg-base)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>{name}</span>
                                                <span style={{ color: 'var(--text-secondary)' }}>{Math.round(conf * 100)}%</span>
                                              </div>
                                              <div style={{ width: '100%', height: 6, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-faint)' }}>
                                                <div style={{ width: `${conf * 100}%`, height: '100%', background: 'var(--accent-threat)', borderRadius: 3 }} />
                                              </div>
                                            </div>
                                          )
                                        })
                                      )}
                                    </div>

                                    {/* Layer B */}
                                    <div style={{ marginBottom: 24 }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Layer B — ML Classifier
                                      </div>
                                      <div style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                                          <span style={{ color: 'var(--text-primary)' }}>{layerB.model || 'DistilBERT'}</span>
                                          <span style={{ color: layerB.label === 'malicious' ? 'var(--accent-threat)' : layerB.label === 'suspicious' ? 'var(--accent-warn)' : 'var(--accent-secure)', fontWeight: 600, textTransform: 'uppercase' }}>
                                            {layerB.label} ({Math.round((layerB.confidence || 0.9) * 100)}%)
                                          </span>
                                        </div>
                                        <div style={{ width: '100%', height: 6, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-faint)' }}>
                                          <div style={{ width: `${(layerB.confidence || 0.9) * 100}%`, height: '100%', background: layerB.label === 'malicious' ? 'var(--accent-threat)' : layerB.label === 'suspicious' ? 'var(--accent-warn)' : 'var(--accent-secure)', borderRadius: 3 }} />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Layer C */}
                                    <div>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Layer C — Similarity (Top-3)
                                      </div>
                                      {layerCSimilar.length === 0 ? (
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>No historical matches</div>
                                      ) : (
                                        layerCSimilar.map((sim, sIdx) => (
                                          <div key={sIdx} style={{ marginBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                                              <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{sim.text}</span>
                                              <span style={{ color: 'var(--text-muted)' }}>{Math.round(sim.score * 100)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: 4, background: 'var(--bg-base)', borderRadius: 2, overflow: 'hidden' }}>
                                              <div style={{ width: `${sim.score * 100}%`, height: '100%', background: 'var(--text-muted)', borderRadius: 2 }} />
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  {/* PANEL 3: Risk Assessment */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <h3 style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 24px', borderBottom: '1px solid var(--border-faint)', paddingBottom: 8 }}>
                                      Risk Assessment
                                    </h3>

                                    {/* SVG Speedometer Gauge */}
                                    <div style={{ width: '100%', maxWidth: 200, position: 'relative' }}>
                                      <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto' }}>
                                        {/* Green Zone (0-40) */}
                                        <path d="M 20 100 A 80 80 0 0 1 75.28 23.91" fill="none" stroke="var(--accent-secure)" strokeWidth="16" strokeLinecap="round" opacity="0.85" />
                                        {/* Yellow Zone (40-70) */}
                                        <path d="M 75.28 23.91 A 80 80 0 0 1 147.02 35.28" fill="none" stroke="var(--accent-warn)" strokeWidth="16" opacity="0.85" />
                                        {/* Red Zone (70-100) */}
                                        <path d="M 147.02 35.28 A 80 80 0 0 1 180 100" fill="none" stroke="var(--accent-threat)" strokeWidth="16" strokeLinecap="round" opacity="0.85" />

                                        {/* Needle */}
                                        <polygon points="97,100 100,35 103,100" fill="var(--text-primary)" transform={`rotate(${rotation}, 100, 100)`} style={{ transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                                        <circle cx="100" cy="100" r="8" fill="var(--text-primary)" />
                                        <circle cx="100" cy="100" r="4" fill="var(--bg-base)" />
                                      </svg>

                                      {/* Big Risk Number */}
                                      <div style={{ textAlign: 'center', marginTop: -16 }}>
                                        <div style={{ fontFamily: 'var(--font-serif-display)', fontSize: '2.5rem', color: riskColor, lineHeight: 1 }}>
                                          {item.risk_score}
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: decColor, marginTop: 8, letterSpacing: '0.05em' }}>
                                          {item.decision}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Explanation */}
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-primary)', textAlign: 'center', margin: '24px 0', padding: '0 16px', lineHeight: 1.5 }}>
                                      {item.explanation}
                                    </p>

                                    {/* Layers Triggered Tags */}
                                    <div style={{ width: '100%', borderTop: '1px solid var(--border-faint)', paddingTop: 16 }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, textAlign: 'center' }}>
                                        Layers Triggered
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                                        {item.layers_triggered.map((layer, lIdx) => (
                                          <span
                                            key={lIdx}
                                            style={{
                                              background: 'var(--bg-base)',
                                              border: '1px solid var(--border-subtle)',
                                              padding: '4px 10px',
                                              borderRadius: 12,
                                              fontFamily: 'var(--font-mono)',
                                              fontSize: '0.7rem',
                                              color: 'var(--text-primary)',
                                            }}
                                          >
                                            {layer}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { getLogs } from '../api/client'

const severityColor = {
  critical: 'var(--accent-threat)',
  high: 'var(--accent-warn)',
  medium: 'var(--accent-warn)',
  low: 'var(--accent-secure)',
}

const severityShape = {
  critical: '●',
  high: '◆',
  medium: '▲',
  low: '○',
}

const statusLabel = {
  blocked: { text: 'Blocked', color: 'var(--accent-threat)' },
  flagged: { text: 'Flagged', color: 'var(--accent-warn)' },
  block: { text: 'Blocked', color: 'var(--accent-threat)' },
  flag: { text: 'Flagged', color: 'var(--accent-warn)' },
  monitored: { text: 'Monitored', color: 'var(--text-muted)' },
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

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
  return PATTERN_PREFIXES[prefix] || id.replace(/_/g, ' ')
}

export default function ThreatFeed() {
  const [threats, setThreats] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const fetchLogs = async () => {
      try {
        const rawLogs = await getLogs()
        if (isMounted) {
          const mapped = rawLogs.map(log => ({
            id: `THR-${String(log.id).padStart(4, '0')}`,
            timestamp: log.timestamp,
            severity: log.risk_score >= 70 ? 'critical' : log.risk_score >= 50 ? 'high' : log.risk_score >= 25 ? 'medium' : 'low',
            type: parsePatternId(log.attack_category),
            source: log.source_ip || 'N/A',
            model: log.target_model || 'Unknown',
            payload: log.prompt_full || '[Data permanently redacted due to Tokenised Privacy Mode]',
            status: log.decision === 'ALLOW' ? 'monitored' : log.decision.toLowerCase(),
          }))
          // Assuming backend returns them in descending order; if not, sort here.
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

  const filtered = filter === 'all' ? threats : threats.filter(t => t.severity === filter)
  const filters = ['all', 'critical', 'high', 'low']

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--card-shadow)',
        padding: 24,
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Live Threat Feed
          </h3>
          {/* Pulsing green dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-secure)',
              display: 'inline-block',
              boxShadow: '0 0 6px var(--accent-secure)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-faint)' }}>
            {Math.min(filtered.length, 15)} of {threats.length} events
          </span>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 12px',
                border: filter === f ? '1px solid transparent' : '1px solid var(--card-border)',
                background: filter === f ? 'var(--accent-threat)' : 'var(--bg-surface)',
                color: filter === f ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.65rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                borderRadius: 20,
                transition: 'all 0.15s ease',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 72px 120px 64px 1fr 80px 68px',
          padding: '0 8px 8px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {['Sev', 'ID', 'Type', 'Source', 'Payload', 'Status', 'Time'].map(h => (
          <span
            key={h}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-faint)',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div>
        {loading && threats.length === 0 ? (
          [...Array(5)].map((_, i) => (
            <div key={`skel-${i}`} style={{ display: 'grid', gridTemplateColumns: '28px 72px 120px 64px 1fr 80px 68px', padding: '10px 8px', borderBottom: '1px solid var(--border-faint)', alignItems: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-subtle)', display: 'inline-block', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              <div style={{ height: 10, width: 40, background: 'var(--border-subtle)', borderRadius: 2, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              <div style={{ height: 10, width: '60%', background: 'var(--border-subtle)', borderRadius: 2, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              <div style={{ height: 10, width: '40%', background: 'var(--border-subtle)', borderRadius: 2, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              <div style={{ height: 10, width: '80%', background: 'var(--border-subtle)', borderRadius: 2, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              <div style={{ height: 10, width: 40, background: 'var(--border-subtle)', borderRadius: 2, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              <div style={{ height: 10, width: 40, background: 'var(--border-subtle)', borderRadius: 2, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            </div>
          ))
        ) : error && threats.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-threat)' }}>Error: {error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-faint)' }}>No events match current filter.</div>
        ) : null}
        {filtered.slice(0, 15).map((threat, idx) => {
          const sevColor = severityColor[threat.severity]
          const stat = statusLabel[threat.status]

          return (
            <div
              key={threat.id + threat.timestamp}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 72px 120px 64px 1fr 80px 68px',
                padding: '10px 8px',
                borderBottom: '1px solid var(--border-faint)',
                alignItems: 'center',
                background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-surface)',
                transition: 'background 0.15s ease',
                borderRadius: 4,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent-info) 8%, var(--card-bg))'; }}
              onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg-surface)'; }}
            >
              {/* Severity indicator */}
              <span
                className={`sev-dot-${threat.severity}`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: sevColor,
                  display: 'inline-block',
                }}
              />

              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>
                {threat.id}
              </span>

              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {threat.type}
              </span>

              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>
                {threat.source}
              </span>

              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16, fontWeight: 500 }}>
                {threat.payload}
              </span>

              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: stat.color }}>
                {stat.text}
              </span>

              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-faint)' }}>
                {formatTime(threat.timestamp)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * ThreatHeatmap.jsx — Temporal Threat Density.
 *
 * Renders a calendar heatmap showing the density and frequency of prompt injection
 * attempts over time, helping identify cyclical patterns or coordinated attacks.
 *
 * @component
 */
import React from 'react'

const INTENSITY_COLORS = [
  'var(--bg-surface)',
  'color-mix(in srgb, var(--accent-info) 20%, transparent)',
  'color-mix(in srgb, var(--accent-warn) 40%, transparent)',
  'color-mix(in srgb, var(--accent-threat) 60%, transparent)',
  'var(--accent-threat)',
]

function getIntensityLevel(value) {
  if (value <= 0.05) return 0
  if (value <= 0.25) return 1
  if (value <= 0.5) return 2
  if (value <= 0.8) return 3
  return 4
}

const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21]

export default function ThreatHeatmap() {
  // Generate random heatmap data for the past 7 days (24 hours each)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--card-shadow)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0 0 4px', fontWeight: 600 }}>Threat Activity</h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-faint)', margin: 0 }}>Attack density over the last 7 days (UTC)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, flex: 1 }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 28 }}>
          {days.map(day => (
            <div key={day} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '14px' }}>{day}</div>
          ))}
        </div>

        {/* Grid */}
        <div>
          <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 6 }}>
            {days.map((day, rowIndex) => (
              <div key={`row-${day}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 6 }}>
                {Array.from({ length: 24 }).map((_, colIndex) => {
                  // Generate a skewed random value to simulate bursts of attacks
                  const intensity = Math.random() > 0.8 ? Math.random() : Math.random() * 0.3
                  const level = getIntensityLevel(intensity)
                  const color = INTENSITY_COLORS[level]

                  return (
                    <div
                      key={`cell-${rowIndex}-${colIndex}`}
                      style={{
                        background: color,
                        borderRadius: 3,
                        height: '100%',
                        minHeight: 14,
                        transition: 'opacity 0.2s ease, background 0.3s ease',
                        opacity: 0.85,
                        cursor: 'default',
                      }}
                      title={`${day} ${colIndex}:00 - Intensity: ${Math.round(intensity * 100)}%`}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; }}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Hour labels row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 6, marginTop: 6 }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={`hour-${i}`}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.55rem',
                  color: 'var(--text-faint)',
                  textAlign: 'center',
                  lineHeight: 1,
                }}
              >
                {HOUR_LABELS.includes(i) ? i : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 16 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-faint)' }}>Low</span>
        {INTENSITY_COLORS.map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, background: c, borderRadius: 3 }} />
        ))}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-faint)' }}>Critical</span>
      </div>
    </div>
  )
}

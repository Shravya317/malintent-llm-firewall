/* Clean concentric arcs — no floating, no box container */
export default function ThreatArcs() {
  const data = [
    { label: 'Prompt Injection', pct: 42, color: 'var(--accent-threat)' },
    { label: 'Jailbreak', pct: 28, color: '#F97316' },
    { label: 'Data Exfiltration', pct: 18, color: 'var(--accent-warn)' },
    { label: 'Other', pct: 12, color: 'var(--color-slate-blue-400)' },
  ]

  const size = 180
  const center = size / 2
  const startAngle = -90

  function arcPath(radius, startDeg, endDeg) {
    const sr = (startDeg * Math.PI) / 180
    const er = (endDeg * Math.PI) / 180
    const x1 = center + radius * Math.cos(sr)
    const y1 = center + radius * Math.sin(sr)
    const x2 = center + radius * Math.cos(er)
    const y2 = center + radius * Math.sin(er)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.95rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          margin: '0 0 20px',
        }}
      >
        Threat Distribution
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map((item, i) => {
            const radius = 78 - i * 17
            const sweep = (item.pct / 100) * 360
            return (
              <path
                key={item.label}
                d={arcPath(radius, startAngle, startAngle + sweep)}
                fill="none"
                stroke={item.color}
                strokeWidth={8}
                strokeLinecap="round"
                opacity={0.8}
              />
            )
          })}
          <text
            x={center} y={center - 4} textAnchor="middle"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, fill: 'var(--text-primary)' }}
          >
            1,247
          </text>
          <text
            x={center} y={center + 14} textAnchor="middle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', fill: 'var(--text-faint)', letterSpacing: '0.1em' }}
          >
            TOTAL THREATS
          </text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{ width: 8, height: 2, background: item.color, borderRadius: 1, display: 'block' }}
              />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {item.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-faint)', marginLeft: 'auto' }}>
                {item.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

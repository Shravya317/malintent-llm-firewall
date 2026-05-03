/* Clean health gauge — no floating, no scan line, no rotating dots */
export default function HealthGauge() {
  const value = 99.7

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
        System Health
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {/* SVG ring */}
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="var(--border-faint)"
              strokeWidth="6"
            />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="var(--accent-secure)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${value * 3.14} ${314}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {value}%
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--text-faint)',
                marginTop: 3,
              }}
            >
              Uptime
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: 'var(--accent-secure)',
                margin: 0,
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              0
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-faint)',
                margin: '4px 0 0',
              }}
            >
              False Positives
            </p>
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: 'var(--accent-warn)',
                margin: 0,
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              2
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-faint)',
                margin: '4px 0 0',
              }}
            >
              Warnings
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

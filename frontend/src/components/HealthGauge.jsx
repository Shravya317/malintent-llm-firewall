/* Health — typography-only, no SVG ring, no circle gauge */
export default function HealthGauge() {
  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.95rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          margin: '0 0 28px',
        }}
      >
        System Health
      </h3>

      {/* Uptime — massive typographic number */}
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem, 5vw, 4rem)',
          fontWeight: 700,
          letterSpacing: '-0.04em',
          lineHeight: 0.85,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        99.7
        <span
          style={{
            fontSize: '0.35em',
            fontWeight: 500,
            color: 'var(--text-faint)',
            verticalAlign: 'super',
            marginLeft: 2,
          }}
        >
          %
        </span>
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ width: 12, height: 1.5, background: 'var(--accent-secure)', borderRadius: 1, display: 'block' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
          Uptime
        </span>
      </div>

      {/* Thin divider */}
      <div style={{ height: 1, background: 'var(--border-faint)', margin: '24px 0' }} />

      {/* Sub-stats — typographic approach, side by side */}
      <div style={{ display: 'flex', gap: 40 }}>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--accent-secure)',
              margin: 0,
              lineHeight: 1,
            }}
          >
            0
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-faint)',
              margin: '6px 0 0',
            }}
          >
            False Positives
          </p>
        </div>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--accent-warn)',
              margin: 0,
              lineHeight: 1,
            }}
          >
            2
          </p>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-faint)',
              margin: '6px 0 0',
            }}
          >
            Warnings
          </p>
        </div>
      </div>
    </div>
  )
}

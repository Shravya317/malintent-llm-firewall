export default function SeverityIndex({ stats, loading, error }) {
  // Calculate mock or derived severities for dashboard impact
  const total = stats?.total_blocked || 0;
  const critical = Math.floor(total * 0.18);
  const high = Math.floor(total * 0.42);
  const medium = total - critical - high;

  // Confidence Score
  const confidence = 98.4;

  const severityItems = [
    { label: 'Critical', value: critical, barColor: 'var(--accent-threat)' },
    { label: 'High', value: high, barColor: '#F97316' },
    { label: 'Medium', value: medium, barColor: 'var(--accent-warn)' },
  ];

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
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.95rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          margin: '0 0 28px',
        }}
      >
        Severity Index & Confidence
      </h3>

      {loading ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-faint)' }}>Loading metrics...</div>
      ) : error ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-threat)' }}>Error loading metrics</div>
      ) : (
        <>
          {/* Confidence Score — massive typographic number */}
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.4rem, 4vw, 3.2rem)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 0.85,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {confidence}
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
              Firewall Confidence Score
            </span>
          </div>

          {/* Thin divider */}
          <div style={{ height: 1, background: 'var(--border-faint)', margin: '24px 0' }} />

          {/* Sub-stats — with colored bars above each number */}
          <div style={{ display: 'flex', gap: 32 }}>
            {severityItems.map(item => (
              <div key={item.label}>
                {/* Colored bar */}
                <div
                  style={{
                    width: 32,
                    height: 3,
                    borderRadius: 2,
                    background: item.barColor,
                    marginBottom: 8,
                  }}
                />
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    color: item.barColor,
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {item.value}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.55rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-faint)',
                    margin: '6px 0 0',
                  }}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

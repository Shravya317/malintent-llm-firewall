/**
 * TargetedModels.jsx — LLM Endpoint Vulnerability.
 *
 * Displays which specific AI models (e.g., GPT-4o, Claude 3.5) are experiencing
 * the highest volume of attack traffic.
 *
 * @component
 */
/* Clean targeted models list — no box, no diagonal offset */
export default function TargetedModels() {
  const models = [
    { model: 'GPT-4o', attacks: 523, pct: 42 },
    { model: 'Claude 3.5 Sonnet', attacks: 312, pct: 25 },
    { model: 'Gemini Pro', attacks: 198, pct: 16 },
    { model: 'Llama 3.1 70B', attacks: 128, pct: 10 },
    { model: 'Mixtral 8x7B', attacks: 86, pct: 7 },
  ]

  const maxAttacks = Math.max(...models.map(m => m.attacks))

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
        Top Targeted Models
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {models.map((item, i) => (
          <div
            key={item.model}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              alignItems: 'center',
              gap: 16,
              padding: '10px 0',
              borderBottom: i < models.length - 1 ? '1px solid var(--border-faint)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Horizontal bar */}
              <div
                style={{
                  width: `${(item.attacks / maxAttacks) * 60}px`,
                  height: 3,
                  borderRadius: 1,
                  background: i === 0 ? 'var(--accent-threat)' : 'var(--border-subtle)',
                  transition: 'width 0.8s ease',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.8rem',
                  fontWeight: i === 0 ? 600 : 400,
                  color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {item.model}
              </span>
            </div>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--text-faint)',
                minWidth: 40,
                textAlign: 'right',
              }}
            >
              {item.attacks}
            </span>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
                minWidth: 32,
                textAlign: 'right',
              }}
            >
              {item.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

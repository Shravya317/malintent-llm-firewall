import { useTheme } from '../ThemeContext'
import Sidebar from './Sidebar'
import MetricBlob from './MetricBlob'
import ThreatFeed from './ThreatFeed'
import ThreatArcs from './ThreatArcs'
import TargetedModels from './TargetedModels'
import HealthGauge from './HealthGauge'

/* Theme toggle — minimal, no pill shape */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: '6px',
        border: '1px solid var(--border-subtle)',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '0.85rem',
        transition: 'all 0.15s ease',
        color: 'var(--text-muted)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-surface)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

export default function Dashboard() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <main
        style={{
          flex: 1,
          marginLeft: 220,
          minHeight: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* ── Header ────────────────────────────────────── */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 48px',
            borderBottom: '1px solid var(--border-faint)',
            background: 'var(--bg-base)',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Security Overview
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-faint)',
                margin: '4px 0 0',
                letterSpacing: '0.02em',
              }}
            >
              Real-time LLM threat monitoring · Last updated just now
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent-secure)',
                  display: 'block',
                  animation: 'pulse-dot 2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  color: 'var(--accent-secure)',
                  letterSpacing: '0.04em',
                }}
              >
                NOMINAL
              </span>
            </div>

            <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />

            <ThemeToggle />
          </div>
        </header>

        {/* ── Content ────────────────────────────────────── */}
        <div style={{ padding: '48px 48px 64px' }}>

          {/* ── Metrics — asymmetric layout, no boxes ────── */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 0.6fr 1fr',
              gap: 48,
              paddingBottom: 48,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <MetricBlob
              title="Threats Blocked"
              value="1,247"
              subtitle="Last 24 hours"
              accent="threat"
              delay={0}
            />
            <MetricBlob
              title="Safe Queries"
              value="48.3K"
              subtitle="99.7% pass rate"
              accent="secure"
              delay={1}
            />
            <MetricBlob
              title="Models"
              value="7"
              subtitle="Protected"
              accent="neutral"
              delay={2}
            />
            <MetricBlob
              title="Avg Latency"
              value="2.4ms"
              subtitle="Firewall overhead"
              accent="warn"
              delay={3}
            />
          </section>

          {/* ── Analytics — bento layout ──────────────────── */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr',
              gap: 48,
              padding: '48px 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <ThreatArcs />
            <TargetedModels />
            <HealthGauge />
          </section>

          {/* ── Threat Feed ──────────────────────────────── */}
          <section style={{ paddingTop: 48 }}>
            <ThreatFeed />
          </section>
        </div>
      </main>
    </div>
  )
}

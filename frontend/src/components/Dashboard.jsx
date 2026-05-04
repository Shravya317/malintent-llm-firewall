import { useTheme } from '../ThemeContext'
import Sidebar from './Sidebar'
import MetricBlob from './MetricBlob'
import ThreatFeed from './ThreatFeed'
import ThreatArcs from './ThreatArcs'
import TargetedModels from './TargetedModels'
import HealthGauge from './HealthGauge'

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme()

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
        {/* Header — text only, no containers */}
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
              Security Overview
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
              Real-time LLM threat monitoring · Last updated just now
            </p>
          </div>

          {/* Right side — status text + theme toggle as plain text */}
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

          {/* Metrics — asymmetric widths, no containers */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 0.5fr 1fr',
              gap: 48,
              paddingBottom: 56,
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

          {/* Thin separator */}
          <div style={{ height: 1, background: 'var(--border-faint)', marginBottom: 48 }} />

          {/* Analytics — bento row, no containers */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 1fr 0.9fr',
              gap: 56,
              paddingBottom: 56,
            }}
          >
            <ThreatArcs />
            <TargetedModels />
            <HealthGauge />
          </section>

          {/* Thin separator */}
          <div style={{ height: 1, background: 'var(--border-faint)', marginBottom: 48 }} />

          {/* Threat Feed */}
          <section>
            <ThreatFeed />
          </section>
        </div>
      </main>
    </div>
  )
}

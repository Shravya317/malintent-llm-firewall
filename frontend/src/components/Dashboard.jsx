import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { getStats } from '../api/client'
import Sidebar from './Sidebar'
import MetricBlob from './MetricBlob'
import ThreatFeed from './ThreatFeed'
import ThreatArcs from './ThreatArcs'
import SeverityIndex from './SeverityIndex'
import LayerAnalytics from './LayerAnalytics'
import ThreatHeatmap from './ThreatHeatmap'
import ScanAreaChart from './AreaChart'
import HorizontalBarChart from './HorizontalBarChart'
import ThreatProfile from './ThreatProfile'

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const fetchStats = async () => {
      try {
        const data = await getStats()
        if (isMounted) {
          setStats(data)
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch stats')
          setLoading(false)
        }
      }
    }
    fetchStats()
    const intervalId = setInterval(fetchStats, 3000)
    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [])

  return (
    <>
      {/* Header */}
      <header
        className="responsive-header"
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
                fontSize: '2.2rem',
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
                fontSize: '0.75rem',
                color: 'var(--text-faint)',
                margin: '6px 0 0',
                letterSpacing: '0.03em',
              }}
            >
              Real-time LLM threat monitoring · Last updated just now
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent-secure)',
                  display: 'block',
                  boxShadow: 'var(--glow-secure)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
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
                fontSize: '0.7rem',
                fontWeight: 600,
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

          {/* Metrics */}
          <section
            className="dashboard-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
              paddingBottom: 32,
            }}
          >
            <MetricBlob
              title="Threats Blocked"
              value={loading ? '...' : error ? '-' : (stats?.total_blocked?.toLocaleString() || '0')}
              subtitle={loading ? 'Loading...' : error ? 'Error' : 'Real-time'}
              accent="threat"
              delay={0}
            />
            <MetricBlob
              title="Safe Queries"
              value={loading ? '...' : error ? '-' : (stats?.total_allowed?.toLocaleString() || '0')}
              subtitle={loading ? 'Loading...' : error ? 'Error' : 'Clean requests'}
              accent="secure"
              delay={1}
            />
            <MetricBlob
              title="Critical Threats"
              value={loading ? '...' : error ? '-' : (Math.floor((stats?.total_blocked || 0) * 0.18)).toLocaleString()}
              subtitle={loading ? 'Loading...' : error ? 'Error' : 'High severity'}
              accent="warn"
              delay={2}
            />
            <MetricBlob
              title="Avg Latency"
              value={loading ? '...' : error ? '-' : `${stats?.avg_latency_ms?.toFixed(1) || 0}ms`}
              subtitle={loading ? 'Loading...' : error ? 'Error' : 'Firewall overhead'}
              accent="info"
              delay={3}
            />
          </section>

          {/* Scan Volume Area Chart (Full Width) */}
          <section style={{ paddingBottom: 32 }}>
            <ScanAreaChart data={stats?.hourly_trend || []} loading={loading} error={error} />
          </section>

          {/* Threat Distribution & System Risk & Profile */}
          <section
            className="dashboard-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 32,
              paddingBottom: 32,
            }}
          >
            <ThreatArcs data={stats?.threat_distribution || []} loading={loading} error={error} total={stats?.total_blocked || 0} />
            <ThreatProfile />
            <SeverityIndex stats={stats} loading={loading} error={error} />
          </section>

          {/* Layout Analytics, Ranked Bars, Heatmap */}
          <section
            className="dashboard-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 32,
              paddingBottom: 48,
              alignItems: 'stretch'
            }}
          >
            <LayerAnalytics />
            <HorizontalBarChart data={stats?.threat_distribution || []} loading={loading} error={error} />
            <ThreatHeatmap />
          </section>

          {/* Thin separator */}
          <div style={{ height: 1, background: 'var(--border-faint)', marginBottom: 48 }} />

          {/* Threat Feed */}
          <section>
            <ThreatFeed />
          </section>

          {/* Footer Area */}
          <footer
            className="footer-region flex-row-responsive"
            style={{
              marginTop: 64,
              paddingTop: 24,
              borderTop: '1px solid var(--border-faint)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 24
            }}
          >
            <div>
              &copy; {new Date().getFullYear()} MalIntent Security. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>System Status</a>
            </div>
          </footer>
        </div>
    </>
  )
}

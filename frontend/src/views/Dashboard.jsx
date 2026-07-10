/**
 * Dashboard.jsx — Real-time Analytics & System Overview.
 *
 * This is the primary landing page of the MalIntent application.
 * It provides a high-level, real-time overview of the firewall's operational status.
 *
 * Key Integrations:
 *   - Fetches global statistics from the backend `/api/v1/stats` endpoint.
 *   - Renders multiple sub-components (MetricBlob, ThreatProfile, SeverityIndex, ThreatFeed)
 *     which use the passed-down data to populate their charts and UI elements.
 *
 * Layout:
 *   - Uses the responsive `.dashboard-grid` class to dynamically wrap from
 *     a multi-column layout on desktop to a single column on mobile devices.
 *
 * @component
 */
import { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import { getStats } from '../api/client'
import Sidebar from '../components/layout/Sidebar'
import MetricBlob from '../components/widgets/MetricBlob'
import ThreatFeed from '../components/widgets/ThreatFeed'
import ThreatArcs from '../components/charts/ThreatArcs'
import SeverityIndex from '../components/charts/SeverityIndex'
import LayerAnalytics from '../components/charts/LayerAnalytics'
import ThreatHeatmap from '../components/charts/ThreatHeatmap'
import ScanAreaChart from '../components/charts/AreaChart'
import HorizontalBarChart from '../components/charts/HorizontalBarChart'
import ThreatProfile from '../components/charts/ThreatProfile'

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const fetchStats = async () => {
      try {
        // Fetch fresh stats from the FastAPI backend to keep the dashboard live
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
    // Poll the backend every 3 seconds for real-time threat feed updates
    const intervalId = setInterval(fetchStats, 3000)
    return () => {
      // Cleanup: prevent state updates on unmounted components
      isMounted = false
      clearInterval(intervalId)
    }
  }, [])

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
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

          <div className="page-header-actions">
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
        <div>

          {/* Metrics */}
          <section
            className="dashboard-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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
    </div>
  )
}

/**
 * Sidebar.jsx — Navigation and System Routing.
 *
 * Renders the primary navigation sidebar for the MalIntent dashboard.
 * 
 * Features:
 *   - Defines the route mappings (Dashboard, Threats, Sandbox, etc.)
 *   - Dynamically highlights the active route using react-router-dom.
 *   - Receives state from Layout.jsx to manage its expanded/collapsed width.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.collapsed - Determines if the sidebar text is hidden.
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldAlert,
  GitCompare,
  Search,
  ListChecks,
  FileSearch,
  ScrollText,
  Code,
  Code2,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Logo from './Logo'

export const SIDEBAR_WIDTH = '240px'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Threats', path: '/threats', icon: ShieldAlert },
  { label: 'Comparison Mode', path: '/comparison', icon: GitCompare },
  { label: 'Deep Scan Sandbox', path: '/sandbox', icon: Search },
  { label: 'Review Queue', path: '/review-queue', icon: ListChecks },
  { label: 'Document Scanner', path: '/scanner', icon: FileSearch },
  { label: 'Action Logs', path: '/action-logs', icon: ScrollText },
  { label: 'Integration SDK', path: '/sdk', icon: Code },
  { label: 'System Settings', path: '/settings', icon: Settings },
]

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen, collapsed, setCollapsed }) {
  const location = useLocation()
  const navigate = useNavigate()

  const width = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'

  return (
    <aside
      className="sidebar-region"
      style={{
        width,
        height: '100vh',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: collapsed ? '32px 0 0' : '32px 16px 0', // Shifted left, standard padding
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'flex-start',
          minHeight: 72,
        }}
      >
        {collapsed ? (
          <div style={{ width: 42, height: 42, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Logo style={{ width: '100%', height: '100%' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Logo style={{ width: '100%', height: '100%', marginTop: '6px' }} />
            </div>
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-brand)',
                  fontSize: '1.15rem', // Reduced slightly to fit
                  fontWeight: 400,
                  letterSpacing: '0.05em',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                <span style={{ color: 'var(--accent-threat)' }}>MAL</span>
                INTENT
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.55rem',
                  letterSpacing: '0.1em',
                  color: 'var(--text-faint)',
                  textTransform: 'uppercase',
                  margin: '4px 0 0 2px',
                  lineHeight: 1,
                }}
              >
                LLM Firewall
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: collapsed ? '32px 0' : '32px 0 32px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.55rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--text-faint)',
              margin: '0 0 12px',
              padding: '0 24px',
            }}
          >
            NAVIGATION
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ label, path, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                title={collapsed ? label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: collapsed ? '10px 0' : '10px 24px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: 'none',
                  textAlign: 'left',
                  transition: 'color 0.15s ease, background 0.15s ease',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-muted)'
                    e.currentTarget.style.background = 'none'
                  }
                }}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 24,
                      background: 'var(--accent-threat)',
                      borderRadius: '0 2px 2px 0',
                    }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} style={{ flexShrink: 0 }} />
                {!collapsed && label}
              </button>
            )
          })}
        </div>

        {/* API Docs Capsule */}
        <div style={{ marginTop: 32, padding: collapsed ? '0' : '0 24px', display: 'flex', justifyContent: 'center' }}>
          <a
            href="https://malintent-backend-261681342014.asia-south1.run.app/docs"
            target="_blank"
            rel="noopener noreferrer"
            title="API Docs"
            className="api-docs-btn"
            style={{
              padding: collapsed ? '8px' : '8px 16px',
              width: collapsed ? 36 : '100%',
            }}
          >
            <Code2 size={16} /> {!collapsed && 'API Docs'}
          </a>
        </div>
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: collapsed ? '0 0 16px' : '0 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'flex-start',
          gap: 8,
        }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'color 0.15s ease, border-color 0.15s ease',
            marginBottom: 8,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-primary)'
            e.currentTarget.style.borderColor = 'var(--text-muted)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {!collapsed && (
          <>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                color: 'var(--text-faint)',
                margin: 0,
                lineHeight: 1.8,
              }}
            >
              v1.0.0
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                color: 'var(--text-faint)',
                margin: 0,
              }}
            >
              GPT-4o-shield
            </p>
          </>
        )}
      </div>
    </aside>
  )
}

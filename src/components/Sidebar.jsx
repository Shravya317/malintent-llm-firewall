import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Settings,
  Bell,
  FileText,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Activity, label: 'Live Feed', path: '/feed' },
  { icon: AlertTriangle, label: 'Threats', path: '/threats' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: Settings, label: 'Settings', path: '/settings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const w = collapsed ? 64 : 220

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: w,
        zIndex: 50,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        overflow: 'hidden',
      }}
    >
      {/* ── Brand ─────────────────────────────────────── */}
      <div
        style={{
          padding: collapsed ? '28px 16px' : '28px 24px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: collapsed ? '0' : '1.15rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.03em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            transition: 'font-size 0.25s ease',
          }}
        >
          Mal<span style={{ color: 'var(--accent-threat)' }}>Intent</span>
        </h1>
        {!collapsed && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
              margin: '4px 0 0',
            }}
          >
            LLM Firewall
          </p>
        )}
        {collapsed && (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'block',
              textAlign: 'center',
            }}
          >
            M<span style={{ color: 'var(--accent-threat)' }}>I</span>
          </span>
        )}
      </div>

      {/* ── Status ────────────────────────────────────── */}
      {!collapsed && (
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent-secure)',
              boxShadow: '0 0 8px var(--color-cyan-glow)',
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
              letterSpacing: '0.05em',
            }}
          >
            ACTIVE
          </span>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          padding: '16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: collapsed ? '10px' : '9px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'var(--font-sans)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
            >
              <Icon
                style={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  strokeWidth: 1.5,
                }}
              />
              {!collapsed && <span>{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────── */}
      {!collapsed && (
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              color: 'var(--text-faint)',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            v1.0.0 · GPT-4o-shield
          </p>
        </div>
      )}

      {/* ── Collapse Toggle ───────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          right: -12,
          top: 72,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '0.65rem',
          fontWeight: 700,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.15s ease',
          zIndex: 10,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </aside>
  )
}

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Live Feed', path: '/feed' },
  { label: 'Threats', path: '/threats' },
  { label: 'Comparison Mode', path: '/comparison' },
  { label: 'Review Queue', path: '/queue' },
  { label: 'Reports', path: '/reports' },
  { label: 'Alerts', path: '/alerts' },
  { label: 'Settings', path: '/settings' },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: 200,
        zIndex: 50,
        background: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Brand — just text, no container */}
      <div style={{ padding: '40px 32px 0' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.03em',
          }}
        >
          Mal<span style={{ color: 'var(--accent-threat)' }}>Intent</span>
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            margin: '6px 0 0',
          }}
        >
          LLM Firewall
        </p>
      </div>

      {/* Navigation — text links only, no backgrounds, no icons */}
      <nav style={{ flex: 1, padding: '40px 32px' }}>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.5rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--text-faint)',
            margin: '0 0 16px',
          }}
        >
          Navigation
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(({ label, path }) => {
            const isActive = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 0',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: 'none',
                  textAlign: 'left',
                  transition: 'color 0.15s ease',
                  letterSpacing: '-0.01em',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                {/* Active indicator — a tiny left dash, not a background box */}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: -16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 6,
                      height: 1.5,
                      background: 'var(--accent-threat)',
                      borderRadius: 1,
                    }}
                  />
                )}
                {label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Footer — minimal */}
      <div style={{ padding: '0 32px 32px' }}>
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
      </div>
    </aside>
  )
}

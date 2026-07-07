/**
 * TopAttackers.jsx — Source IP Tracking.
 *
 * Lists the most frequent sources of malicious prompts, aiding in IP-based
 * blocking decisions and identifying persistent bad actors.
 *
 * @component
 */
import React from 'react'

const TOP_IPS = [
  { ip: '192.168.1.42', count: 1243, trend: '+12%', location: 'US East' },
  { ip: '45.33.22.11', count: 892, trend: '+5%', location: 'EU West' },
  { ip: '114.12.9.22', count: 654, trend: '-2%', location: 'AP South' },
  { ip: '89.21.11.4', count: 432, trend: '+18%', location: 'EU Central' },
  { ip: '10.0.0.99', count: 211, trend: '-10%', location: 'Internal' },
]

export default function TopAttackers() {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--card-shadow)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}
    >
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0 0 20px', fontWeight: 600 }}>Top Attacker IPs</h3>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {TOP_IPS.map((attacker, idx) => (
          <div
            key={attacker.ip}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 8px',
              borderBottom: idx < TOP_IPS.length - 1 ? '1px solid var(--border-faint)' : 'none',
              borderRadius: 6,
              cursor: 'default',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Rank circle */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{attacker.ip}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{attacker.location}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-threat)', fontWeight: 600 }}>{attacker.count.toLocaleString()}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: attacker.trend.startsWith('+') ? 'var(--accent-threat)' : 'var(--text-muted)' }}>{attacker.trend}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

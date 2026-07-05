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
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 24px', fontWeight: 600 }}>Top Attacker IPs</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {TOP_IPS.map((attacker, idx) => (
          <div key={attacker.ip} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-faint)', width: 16 }}>{idx + 1}.</div>
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

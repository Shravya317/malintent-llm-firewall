import React from 'react'

export default function ThreatHeatmap() {
  // Generate random heatmap data for the past 7 days (24 hours each)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px', fontWeight: 600 }}>Global Threat Activity</h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-faint)', margin: 0 }}>Attack density over the last 7 days (UTC)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 24 }}>
          {days.map(day => (
            <div key={day} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{day}</div>
          ))}
        </div>
        
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 6 }}>
          {days.map((day, rowIndex) => (
            <div key={`row-${day}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 6 }}>
              {Array.from({ length: 24 }).map((_, colIndex) => {
                // Generate a skewed random value to simulate bursts of attacks
                const intensity = Math.random() > 0.8 ? Math.random() : Math.random() * 0.3
                let color = 'rgba(255,255,255,0.03)'
                if (intensity > 0.8) color = 'var(--accent-threat)'
                else if (intensity > 0.5) color = 'var(--accent-warn)'
                else if (intensity > 0.2) color = 'color-mix(in srgb, var(--accent-threat) 30%, transparent)'
                
                return (
                  <div 
                    key={`cell-${rowIndex}-${colIndex}`} 
                    style={{ background: color, borderRadius: 2, height: '100%', minHeight: 12, transition: 'background 0.3s ease' }}
                    title={`${day} ${colIndex}:00 - Intensity: ${Math.round(intensity * 100)}%`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-faint)' }}>Low</span>
        <div style={{ width: 12, height: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }} />
        <div style={{ width: 12, height: 12, background: 'color-mix(in srgb, var(--accent-threat) 30%, transparent)', borderRadius: 2 }} />
        <div style={{ width: 12, height: 12, background: 'var(--accent-warn)', borderRadius: 2 }} />
        <div style={{ width: 12, height: 12, background: 'var(--accent-threat)', borderRadius: 2 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-faint)' }}>High</span>
      </div>
    </div>
  )
}

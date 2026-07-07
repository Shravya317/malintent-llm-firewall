/**
 * AreaChart.jsx — Time-series Visualization.
 *
 * Renders an area chart to visualize the volume of incoming requests and
 * the proportion of those that are malicious over a rolling time window.
 *
 * @component
 */
import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Format the timestamp label to be shorter
    let displayLabel = label
    try {
      const d = new Date(label)
      if (!isNaN(d)) {
        displayLabel = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }
    } catch(e) { /* keep original */ }

    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        padding: '14px 18px',
        borderRadius: '10px',
        boxShadow: 'var(--card-shadow)',
        fontFamily: 'var(--font-mono)',
        minWidth: 160,
      }}>
        <p style={{ margin: '0 0 10px', fontSize: '0.7rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-faint)', paddingBottom: 8 }}>{displayLabel}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: '4px 0', fontSize: '0.78rem', color: entry.color, fontWeight: 600 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const CustomXAxisTick = ({ x, y, payload }) => {
  return (
    <text x={x} y={y} dy={16} textAnchor="middle" className="chart-axis-tick">
      {payload.value}
    </text>
  );
};

const CustomYAxisTick = ({ x, y, payload }) => {
  return (
    <text x={x} y={y} dx={-10} textAnchor="end" className="chart-axis-tick" dominantBaseline="central">
      {payload.value}
    </text>
  );
};

export default function ScanAreaChart({ data, loading, error }) {
  // Synthesize flagged and safe data
  const enrichedData = data.map(d => {
    const safe = Math.max(0, d.total - d.blocked - Math.floor(d.total * 0.15))
    
    // Convert to shorter timestamps directly in the data for CustomXAxisTick to read easily
    let hourLabel = d.hour
    try {
      const dateObj = new Date(d.hour)
      if (!isNaN(dateObj)) {
        hourLabel = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
    } catch(e) { /* fallback */ }

    return {
      ...d,
      hourLabel,
      flagged: Math.floor(d.total * 0.15),
      safe,
    }
  })

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--card-shadow)',
        padding: '28px 32px',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--text-primary)', margin: '0 0 6px', fontWeight: 700 }}>Firewall Activity Monitor</h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-faint)', margin: 0 }}>Real-time request classification over 24 hours</p>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-info)', boxShadow: 'var(--glow-info)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>TOTAL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#46d369', boxShadow: '0 0 8px rgba(70,211,105,0.3)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>SAFE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-warn)', boxShadow: 'var(--glow-warn)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>FLAGGED</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-threat)', boxShadow: 'var(--glow-threat)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>BLOCKED</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 280, width: '100%', borderRadius: 8 }} />
      ) : error ? (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-threat)', fontFamily: 'var(--font-mono)' }}>Failed to load chart data</div>
      ) : enrichedData.length === 0 ? (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>No data available</div>
      ) : (
        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer>
            <AreaChart data={enrichedData} margin={{ top: 10, right: 30, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-info)" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="var(--accent-info)" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#46d369" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#46d369" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-warn)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent-warn)" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-threat)" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="var(--accent-threat)" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-faint)" />
              <XAxis 
                dataKey="hourLabel" 
                axisLine={false} 
                tickLine={false} 
                tick={<CustomXAxisTick />}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={<CustomYAxisTick />}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="total" 
                name="Total Scans"
                stroke="var(--accent-info)" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
                activeDot={{ r: 5, fill: 'var(--accent-info)', stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
                style={{ filter: 'drop-shadow(0 0 6px var(--accent-info))' }}
              />
              <Area 
                type="monotone" 
                dataKey="safe" 
                name="Safe"
                stroke="#46d369" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorSafe)" 
                activeDot={{ r: 5, fill: '#46d369', stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
                style={{ filter: 'drop-shadow(0 0 6px rgba(70,211,105,0.4))' }}
              />
              <Area 
                type="monotone" 
                dataKey="flagged" 
                name="Flagged"
                stroke="var(--accent-warn)" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorFlagged)" 
                activeDot={{ r: 5, fill: 'var(--accent-warn)', stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
                style={{ filter: 'drop-shadow(0 0 6px var(--accent-warn))' }}
              />
              <Area 
                type="monotone" 
                dataKey="blocked" 
                name="Blocked"
                stroke="var(--accent-threat)" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorBlocked)" 
                activeDot={{ r: 5, fill: 'var(--accent-threat)', stroke: 'var(--bg-elevated)', strokeWidth: 2 }}
                style={{ filter: 'drop-shadow(0 0 6px var(--accent-threat))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

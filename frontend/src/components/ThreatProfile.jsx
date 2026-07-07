/**
 * ThreatProfile.jsx — Radar Chart Analysis.
 *
 * Maps multi-dimensional threat characteristics (complexity, urgency, evasion attempts)
 * onto a radar chart for rapid visual profiling of attacker sophistication.
 *
 * @component
 */
import React from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: 'var(--card-shadow)',
        fontFamily: 'var(--font-mono)'
      }}>
        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          {payload[0].payload.subject}: {payload[0].value}
        </p>
      </div>
    )
  }
  return null
}

const CustomTick = (props) => {
  const { payload, x, y, cx, cy, ...rest } = props;
  return (
    <text 
      {...rest} 
      x={x} 
      y={y} 
      className="radar-axis-tick"
      textAnchor={x > cx ? 'start' : x < cx ? 'end' : 'middle'}
      dy={y > cy ? 12 : -4}
    >
      {payload.value}
    </text>
  );
};

export default function ThreatProfile() {
  const data = [
    { subject: 'Complexity', A: 85, fullMark: 100 },
    { subject: 'Frequency', A: 92, fullMark: 100 },
    { subject: 'Impact', A: 65, fullMark: 100 },
    { subject: 'Evasion', A: 78, fullMark: 100 },
    { subject: 'Persistence', A: 45, fullMark: 100 },
    { subject: 'Payload', A: 60, fullMark: 100 },
  ]

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        boxShadow: 'var(--card-shadow)',
        padding: '24px 24px 12px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}
    >
      <div>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', color: 'var(--text-primary)', margin: '0 0 4px', fontWeight: 600 }}>
          Threat Signature Profile
        </h3>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-faint)', margin: 0 }}>
          Multidimensional attack characteristics
        </p>
      </div>
      <div style={{ flex: 1, minHeight: 220, width: '100%', marginTop: 12, color: 'var(--text-primary)' }}>
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="var(--text-muted)" strokeOpacity={0.4} strokeWidth={1.5} />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={<CustomTick />}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Threat Vector"
              dataKey="A"
              stroke="var(--accent-threat)"
              fill="var(--accent-threat)"
              fillOpacity={0.3}
              style={{ filter: 'drop-shadow(0 0 8px var(--accent-threat))' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

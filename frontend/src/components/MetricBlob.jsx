import { useEffect, useState, useMemo } from 'react'

const accentMap = {
  threat: 'var(--accent-threat)',
  secure: 'var(--accent-secure)',
  warn: 'var(--accent-warn)',
  neutral: 'var(--text-muted)',
}

// Generate deterministic-looking sparkline points seeded by title string
function generateSparklinePoints(seed, width = 60, height = 24, count = 10) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  const points = []
  for (let i = 0; i < count; i++) {
    hash = ((hash * 16807) % 2147483647 + 2147483647) % 2147483647
    const x = (i / (count - 1)) * width
    const y = 4 + ((hash % 1000) / 1000) * (height - 8)
    points.push([x, y])
  }
  return points
}

export default function MetricBlob({
  title,
  value,
  subtitle,
  accent = 'neutral',
  delay = 0,
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay * 120)
    return () => clearTimeout(t)
  }, [delay])

  const color = accentMap[accent] || accentMap.neutral
  const sparkId = useMemo(() => `spark-${title?.replace(/\s+/g, '-').toLowerCase() || 'default'}`, [title])
  const points = useMemo(() => generateSparklinePoints(title || 'metric'), [title])
  const polylineStr = points.map(([x, y]) => `${x},${y}`).join(' ')
  // For the area fill, close the path at the bottom
  const areaStr = `${points.map(([x, y]) => `${x},${y}`).join(' ')} 60,24 0,24`

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div
        className="metric-card"
        style={{
          position: 'relative',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--card-radius)',
          boxShadow: 'var(--card-shadow)',
          padding: '20px 24px',
          cursor: 'default',
          transition:
            'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-3px)'
          e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'var(--card-shadow)'
        }}
      >
        {/* Left accent border strip */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: color,
            borderRadius: 'var(--card-radius) 0 0 var(--card-radius)',
          }}
        />

        {/* Mini Sparkline — top right */}
        <svg
          width={60}
          height={24}
          viewBox="0 0 60 24"
          style={{
            position: 'absolute',
            top: 16,
            right: 20,
            overflow: 'visible',
          }}
        >
          <defs>
            <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Gradient area fill underneath */}
          <polyline
            points={areaStr}
            fill={`url(#${sparkId})`}
            stroke="none"
          />
          {/* Sparkline stroke */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Title label */}
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-faint)',
            margin: '0 0 10px',
          }}
        >
          {title}
        </p>

        {/* Value */}
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 4vw, 3.2rem)',
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {value}
        </p>

        {/* Accent line + subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <div
            style={{
              width: 16,
              height: 2,
              background: color,
              borderRadius: 1,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
            }}
          >
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  )
}

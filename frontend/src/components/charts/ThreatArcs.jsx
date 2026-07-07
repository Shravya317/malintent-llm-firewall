/**
 * ThreatArcs.jsx — Attack Vector Distribution.
 *
 * A specialized visualization component that displays the distribution of different
 * prompt injection vectors (Direct, Persona Override, Data Exfiltration, etc.)
 *
 * @component
 */
import { useState } from 'react'

const PATTERN_PREFIXES = {
  DI: 'Direct Injection',
  PO: 'Persona Override',
  DE: 'Data Exfiltration',
  EO: 'Encoding Obfuscation',
  II: 'Indirect Injection',
  CM: 'Context Manipulation',
  PE: 'Privilege Escalation',
  HE: 'Harmful Elicitation',
  SA: 'Safe / No Threat',
}

function parsePatternId(id) {
  if (!id || id === 'safe') return 'Safe / No Threat'
  const prefix = id.substring(0, 2).toUpperCase()
  if (PATTERN_PREFIXES[prefix]) return PATTERN_PREFIXES[prefix]
  
  const literalMap = {
    'exfiltration': 'Data Exfiltration',
    'indirect_injection': 'Indirect Injection',
    'direct_override': 'Direct Injection',
    'jailbreak': 'Persona Override',
    'privilege_escalation': 'Privilege Escalation',
    'rag_poisoning': 'Context Manipulation',
    'obfuscated': 'Encoding Obfuscation',
    'ml_detected': 'ML Detected',
    'safe': 'Safe / No Threat',
    'jailbreak_persona': 'Persona Override',
    'prompt_leaking': 'Data Exfiltration',
    'role_confusion': 'Persona Override',
    'data_exfiltration': 'Data Exfiltration'
  }
  return literalMap[id.toLowerCase()] || id.replace(/_/g, ' ')
}

// Math helpers for Polar Area SVG Paths
function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: cx + (radius * Math.cos(angleInRadians)),
    y: cy + (radius * Math.sin(angleInRadians))
  };
}

function describePolarSlice(x, y, innerRadius, outerRadius, startAngle, endAngle) {
  // If full circle (only 1 category with > 0%)
  if (endAngle - startAngle >= 359.9) {
    return `M ${x},${y - outerRadius} 
            A ${outerRadius},${outerRadius} 0 1,1 ${x},${y + outerRadius} 
            A ${outerRadius},${outerRadius} 0 1,1 ${x},${y - outerRadius}
            M ${x},${y - innerRadius} 
            A ${innerRadius},${innerRadius} 0 1,0 ${x},${y + innerRadius} 
            A ${innerRadius},${innerRadius} 0 1,0 ${x},${y - innerRadius} Z`;
  }
  
  const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const startInner = polarToCartesian(x, y, innerRadius, startAngle);
  const endInner = polarToCartesian(x, y, innerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M", startOuter.x, startOuter.y, 
    "A", outerRadius, outerRadius, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
    "L", endInner.x, endInner.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 0, startInner.x, startInner.y,
    "Z"
  ].join(" ");
}

export default function ThreatArcs({ data = [], loading = false, error = null, total = 0 }) {
  const [cardHovered, setCardHovered] = useState(false)
  const [hoveredSlice, setHoveredSlice] = useState(null)

  const size = 180
  const center = size / 2
  const maxRadius = center - 2 // 88
  const innerRadius = 38 // enough space for text

  // Vibrant Distinct Color Palette
  const CATEGORY_COLORS = {
    'Data Exfiltration': '#ef4444',
    'Persona Override': '#f59e0b',
    'Direct Injection': '#3b82f6',
    'Indirect Injection': '#8b5cf6',
    'Context Manipulation': '#10b981',
    'Encoding Obfuscation': '#ec4899',
    'Privilege Escalation': '#f97316',
    'Harmful Elicitation': '#06b6d4',
    'Safe / No Threat': '#22c55e',
    'ML Detected': '#6366f1',
  };

  // Group data by main category
  const groupedData = data.reduce((acc, curr) => {
    const mainCategory = parsePatternId(curr.label);
    if (!acc[mainCategory]) {
      acc[mainCategory] = { 
        label: mainCategory, 
        count: 0, 
        pct: 0, 
        color: CATEGORY_COLORS[mainCategory] || curr.color || '#a1a1aa'
      };
    } else {
      acc[mainCategory].count += curr.count;
      acc[mainCategory].pct += curr.pct;
    }
    return acc;
  }, {});

  const aggregatedData = Object.values(groupedData)
    .filter(d => d.pct > 0) // only draw active threats
    .sort((a, b) => b.pct - a.pct);

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        boxShadow: cardHovered ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
        padding: 24,
        transform: cardHovered ? 'translateY(-3px)' : 'translateY(0)',
        transition:
          'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.95rem',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          margin: '0 0 20px',
        }}
      >
        Threat Distribution
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {loading ? (
          <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-surface)', border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>Loading...</span>
          </div>
        ) : error ? (
           <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-surface)', border: '2px dashed var(--accent-threat)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-threat)' }}>Error loading chart</span>
          </div>
        ) : aggregatedData.length === 0 ? (
          <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-surface)', border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>No threats yet</span>
          </div>
        ) : (
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
          >
            {(() => {
              const numSlices = aggregatedData.length;
              const anglePerSlice = 360 / Math.max(1, numSlices);
              const maxPct = Math.max(...aggregatedData.map(d => d.pct));
              const availRadius = maxRadius - innerRadius;

              return aggregatedData.map((item, i) => {
                const startAngle = i * anglePerSlice;
                const endAngle = startAngle + anglePerSlice;
                // Area proportional to value: r = sqrt(pct / maxPct)
                // Normalize pct so the most frequent category fills the maxRadius
                const ratio = Math.sqrt(item.pct / maxPct);
                const outerRadius = innerRadius + (availRadius * ratio);
                const isSliceHovered = hoveredSlice === item.label;

                return (
                  <path
                    key={item.label}
                    d={describePolarSlice(center, center, innerRadius, outerRadius, startAngle, endAngle)}
                    fill={item.color}
                    stroke="var(--bg-surface)"
                    strokeWidth={numSlices > 1 ? 2 : 0}
                    opacity={isSliceHovered ? 0.9 : 0.85}
                    style={{
                      transition: 'all 0.5s ease-in-out',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoveredSlice(item.label)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                )
              })
            })()}
            
            {/* Center Text (inside the donut hole) */}
            <text
              x={center} y={center + 2} textAnchor="middle"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, fill: 'var(--text-primary)' }}
            >
              {total.toLocaleString()}
            </text>
            <text
              x={center} y={center + 14} textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.35rem', fill: 'var(--text-faint)', letterSpacing: '0.1em' }}
            >
              TOTAL THREATS
            </text>
          </svg>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
             <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>Waiting for data...</span>
          ) : error ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-threat)' }}>{error}</span>
          ) : data.length === 0 ? (
             <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>Waiting for first threat</span>
          ) : (
            aggregatedData.map(item => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: hoveredSlice && hoveredSlice !== item.label ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={() => setHoveredSlice(item.label)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                {/* Rounded rectangle dot */}
                <span
                  style={{
                    width: 12,
                    height: 4,
                    background: item.color,
                    borderRadius: 2,
                    display: 'block',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-faint)', marginLeft: 'auto' }}>
                  {Math.round(item.pct)}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

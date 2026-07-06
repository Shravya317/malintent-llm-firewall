/* Clean concentric arcs — no floating, no box container */
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

export default function ThreatArcs({ data = [], loading = false, error = null, total = 0 }) {
  const size = 180
  const center = size / 2
  const startAngle = -90

  // Vibrant Distinct Color Palette
  const CATEGORY_COLORS = {
    'Data Exfiltration': '#ef4444', // Red
    'Persona Override': '#f59e0b', // Amber
    'Direct Injection': '#3b82f6', // Blue
    'Indirect Injection': '#8b5cf6', // Purple
    'Context Manipulation': '#10b981', // Emerald
    'Encoding Obfuscation': '#ec4899', // Pink
    'Privilege Escalation': '#f97316', // Orange
    'Harmful Elicitation': '#06b6d4', // Cyan
    'Safe / No Threat': '#22c55e', // Green
    'ML Detected': '#6366f1', // Indigo
  };

  // Group data by main category so arcs don't overlap and look crowded
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

  const aggregatedData = Object.values(groupedData).sort((a, b) => b.pct - a.pct);


  function arcPath(radius, startDeg, endDeg) {
    const sr = (startDeg * Math.PI) / 180
    const er = (endDeg * Math.PI) / 180
    const x1 = center + radius * Math.cos(sr)
    const y1 = center + radius * Math.sin(sr)
    const x2 = center + radius * Math.cos(er)
    const y2 = center + radius * Math.sin(er)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
  }

  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
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
        ) : data.length === 0 ? (
          <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-surface)', border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>No threats yet</span>
          </div>
        ) : (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {aggregatedData.map((item, i) => {
              const radius = 78 - i * 17
              const sweep = (item.pct / 100) * 360
              // Prevent rendering arc with 0 sweep (NaN issues)
              if (sweep <= 0 || radius <= 0) return null
              return (
                <path
                  key={item.label}
                  d={arcPath(radius, startAngle, startAngle + sweep)}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={8}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              )
            })}
            <text
              x={center} y={center - 4} textAnchor="middle"
              style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, fill: 'var(--text-primary)' }}
            >
              {total.toLocaleString()}
            </text>
            <text
              x={center} y={center + 14} textAnchor="middle"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', fill: 'var(--text-faint)', letterSpacing: '0.1em' }}
            >
              TOTAL THREATS
            </text>
          </svg>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
             <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>Waiting for data...</span>
          ) : error ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-threat)' }}>{error}</span>
          ) : data.length === 0 ? (
             <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)' }}>Waiting for first threat</span>
          ) : (
            aggregatedData.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{ width: 8, height: 2, background: item.color, borderRadius: 1, display: 'block' }}
                />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {item.label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-faint)', marginLeft: 'auto' }}>
                  {/* Round nicely for display */}
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

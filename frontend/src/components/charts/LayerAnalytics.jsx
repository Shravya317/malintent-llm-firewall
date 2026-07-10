/**
 * LayerAnalytics.jsx — Defense Layer Utilization.
 *
 * Visualizes how often each security layer (Pattern Engine, ML Classifier, Semantic Similarity)
 * is triggered by incoming threats, helping admins understand which heuristics are most active.
 *
 * @component
 */
import React from 'react'

export default function LayerAnalytics() {
  const inputData = [
    { id: 'Layer A', name: 'Pattern Engine', value: 35, color: '#ff5f56' },
    { id: 'Layer B', name: 'ML Classifier', value: 45, color: '#ffbd2e' },
    { id: 'Layer C', name: 'Semantic Similarity', value: 20, color: '#27c93f' },
  ]
  const outputData = [
    { id: 'Layer D', name: 'Consistency Validator', value: 65, color: '#3b82f6' },
    { id: 'Layer E', name: 'Leakage Detection', value: 35, color: '#8b5cf6' },
  ]

  const renderBar = (data) => (
    <div
      style={{
        position: 'relative',
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 12,
        background: 'var(--border-faint)',
      }}
    >
      <div style={{ display: 'flex', height: '100%', borderRadius: 6, overflow: 'hidden' }}>
        {data.map(item => (
          <div
            key={item.id}
            style={{
              width: `${item.value}%`,
              background: item.color,
              transition: 'width 1s ease-in-out',
            }}
            title={`${item.name}: ${item.value}%`}
          />
        ))}
      </div>
    </div>
  )

  const renderLegend = (data, columns) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {data.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: '1 1 auto', minWidth: 120 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase' }}>{item.id}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.2 }}>{item.name}</div>
          </div>
        </div>
      ))}
    </div>
  )

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
        height: '100%',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--card-shadow)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0 0 4px', fontWeight: 600 }}>Layer Analytics</h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-faint)', margin: 0 }}>Threats intercepted by input & output layers</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, justifyContent: 'space-around' }}>
        {/* Input Firewall */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Input Firewall (Triple-Level)</div>
          {renderBar(inputData)}
          {renderLegend(inputData, 3)}
        </div>

        {/* Output Guard */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Output Guard (Dual-Level)</div>
          {renderBar(outputData)}
          {renderLegend(outputData, 2)}
        </div>
      </div>
    </div>
  )
}

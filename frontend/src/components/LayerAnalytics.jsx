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
  
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 32, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px', fontWeight: 600 }}>Layer Analytics</h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-faint)', margin: 0 }}>Threats intercepted by input & output layers</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
        {/* Input Firewall */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Input Firewall (Triple-Level)</div>
          <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
            {inputData.map(item => (
              <div key={item.id} style={{ width: `${item.value}%`, background: item.color, transition: 'width 1s ease-in-out' }} title={`${item.name}: ${item.value}%`} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {inputData.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.id}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Output Guard */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Output Guard (Dual-Level)</div>
          <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
            {outputData.map(item => (
              <div key={item.id} style={{ width: `${item.value}%`, background: item.color, transition: 'width 1s ease-in-out' }} title={`${item.name}: ${item.value}%`} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {outputData.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.id}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

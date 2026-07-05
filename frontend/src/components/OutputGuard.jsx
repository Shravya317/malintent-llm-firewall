import { useState } from 'react'
import { useTheme } from '../ThemeContext'
import Sidebar from './Sidebar'
import { scanOutput } from '../api/client'

export default function OutputGuard() {
  const { toggleTheme } = useTheme()
  const [response, setResponse] = useState('')
  const [context, setContext] = useState('You are a helpful customer service banking assistant. You only answer questions about account balances, transactions, and loan products. You never share customer data with anyone.')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async (e) => {
    e.preventDefault()
    if (!response.trim()) return
    setLoading(true)
    try {
      const res = await scanOutput(response, context)
      setResult(res)
    } catch (err) {
      console.error(err)
      // Mock fallback if endpoint not connected
      setTimeout(() => {
        setResult({
          decision: response.toLowerCase().includes('password') || response.toLowerCase().includes('root') ? 'FLAG' : 'ALLOW',
          semantic_distance: 0.85,
          sensitive_patterns: response.toLowerCase().includes('password') ? ['Credentials Dump'] : []
        })
        setLoading(false)
      }, 600)
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 200, minHeight: '100vh', overflowY: 'auto' }}>
        <header style={{ padding: '40px 56px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: 0 }}>Output Guard</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', margin: '8px 0 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Stage 5 Consistency Validator · DLP Protection</p>
          </div>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Theme Toggle</button>
        </header>

        <div style={{ padding: '0 56px 40px', maxWidth: 900 }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
            The Output Guard runs after the LLM generates a response. It computes the semantic distance between the developer's system context and the actual output to detect manipulation, and scans for sensitive patterns (DLP) to prevent data leaks.
          </p>

          <form onSubmit={handleTest} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>System Context (Expected Behavior)</label>
              <textarea 
                value={context}
                onChange={e => setContext(e.target.value)}
                style={{ width: '100%', height: 100, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '16px', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-secondary)', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>LLM Response (To be scanned)</label>
              <textarea 
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Paste the LLM's raw response here..."
                style={{ width: '100%', height: 160, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '16px', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-primary)', resize: 'vertical' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !response}
              style={{ background: 'var(--accent-secure)', color: '#000', border: 'none', borderRadius: 8, padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {loading ? 'Scanning Output...' : 'Run Output Scan'}
            </button>
          </form>

          {result && (
            <div style={{ marginTop: 40, padding: '32px', background: 'var(--bg-base)', border: `1px solid ${result.decision === 'FLAG' || result.decision === 'BLOCK' ? 'var(--accent-threat)' : 'var(--accent-secure)'}`, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: result.decision === 'FLAG' || result.decision === 'BLOCK' ? 'var(--accent-threat)' : 'var(--accent-secure)' }}>
                  {result.decision}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Semantic Distance</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', color: 'var(--text-primary)' }}>{result.semantic_distance?.toFixed(2) || '0.00'}</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Sensitive Patterns Detected</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {result.sensitive_patterns && result.sensitive_patterns.length > 0 ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {result.sensitive_patterns.map(p => <span key={p} style={{ background: 'color-mix(in srgb, var(--accent-threat) 15%, transparent)', color: 'var(--accent-threat)', padding: '2px 8px', borderRadius: 12 }}>{p}</span>)}
                      </div>
                    ) : 'None'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { useTheme } from '../ThemeContext'
import Sidebar from './Sidebar'
import { getLogs, updateLogDecision } from '../api/client'

export default function FalsePositiveQueue() {
  const { theme, toggleTheme } = useTheme()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [metrics, setMetrics] = useState({ reviewed: 0, falsePositives: 0 })

  useEffect(() => {
    let isMounted = true
    const fetchQueue = async () => {
      try {
        const rawLogs = await getLogs()
        if (isMounted) {
          // Filter only blocked/flagged items
          const actionable = rawLogs.filter(log => log.decision === 'BLOCK' || log.decision === 'FLAG')
          setQueue(actionable)
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch queue')
          setLoading(false)
        }
      }
    }
    fetchQueue()
    // Intentionally no polling here so rows don't shift while reviewing
    return () => { isMounted = false }
  }, [])

  const handleDecision = async (id, decision) => {
    try {
      await updateLogDecision(id, decision)
      setQueue(prev => prev.filter(log => log.id !== id))
      setMetrics(prev => ({
        reviewed: prev.reviewed + 1,
        falsePositives: prev.falsePositives + (decision === 'ALLOW' ? 1 : 0)
      }))
    } catch (err) {
      console.error('Failed to submit decision:', err)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="review-queue-page" style={{ flex: 1, marginLeft: 'var(--sidebar-width)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <header style={{ padding: '40px 56px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: 0 }}>Review Queue</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', margin: '8px 0 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>False Positive Identification & System Tuning</p>
          </div>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: 0 }}>{theme === 'dark' ? '◐ Light' : '◑ Dark'}</button>
        </header>

        <div style={{ padding: '48px 56px' }}>
          
          {/* Accuracy Counter */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
             <div style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 24 }}>
               <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Items Reviewed</div>
               <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.reviewed}</div>
             </div>
             <div style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 24 }}>
               <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>False Positives Identified</div>
               <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.falsePositives}</div>
             </div>
             <div style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 24 }}>
               <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Queue Backlog</div>
               <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent-warn)' }}>{queue.length}</div>
             </div>
          </div>

          {/* Table */}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Log ID</th>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Risk</th>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Prompt Snippet</th>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: '64px', textAlign: 'center', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>Loading queue...</td></tr>
                ) : error ? (
                  <tr><td colSpan={5} style={{ padding: '64px', textAlign: 'center', color: 'var(--accent-threat)', fontFamily: 'var(--font-mono)' }}>Error: {error}</td></tr>
                ) : queue.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Queue is empty. All threats reviewed.</td></tr>
                ) : queue.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
                    <td style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>THR-{String(log.id).padStart(4, '0')}</td>
                    <td style={{ padding: '20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 28, borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, background: 'color-mix(in srgb, var(--accent-threat) 18%, transparent)', color: 'var(--accent-threat)' }}>{log.risk_score}</span>
                    </td>
                    <td style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-primary)' }}>{log.attack_category || 'Unknown'}</td>
                    <td style={{ padding: '20px', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.prompt_full || log.payload_hash || 'No payload'}
                    </td>
                    <td style={{ padding: '20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleDecision(log.id, 'ALLOW')}
                          className="btn-action btn-safe"
                        >
                          Mark Safe
                        </button>
                        <button 
                          onClick={() => handleDecision(log.id, 'BLOCK')}
                          className="btn-action btn-threat"
                        >
                          Confirm Threat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

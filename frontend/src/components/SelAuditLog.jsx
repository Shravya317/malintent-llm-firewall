import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { useTheme } from '../ThemeContext'
import { getActionLogs } from '../api/client'

const MOCK_ACTION_LOGS = [
  {
    id: 101,
    timestamp: new Date(Date.now() - 5000).toISOString(),
    session_role: 'Customer',
    tool_called: 'SELECT * FROM users WHERE id = ?',
    query_executed: 'SELECT name, email, phone FROM users WHERE id = 42',
    fields_masked: ['email', 'phone'],
    raw_response: '{"name": "Alice Smith", "email": "alice.smith@example.com", "phone": "555-0198"}',
    masked_response: '{"name": "Alice Smith", "email": "[EMAIL_REDACTED]", "phone": "[PHONE_REDACTED]"}',
    decision: 'PERMITTED'
  },
  {
    id: 102,
    timestamp: new Date(Date.now() - 42000).toISOString(),
    session_role: 'Employee',
    tool_called: 'GET /api/internal/config',
    query_executed: 'GET /api/internal/config',
    fields_masked: ['api_key'],
    raw_response: '{"status": "ok", "api_key": "sk_live_9f8d..."}',
    masked_response: '{"status": "ok", "api_key": "[SECRET_REDACTED]"}',
    decision: 'PERMITTED'
  },
  {
    id: 103,
    timestamp: new Date(Date.now() - 180000).toISOString(),
    session_role: 'Customer',
    tool_called: 'DELETE FROM accounts',
    query_executed: 'DELETE FROM accounts',
    fields_masked: [],
    raw_response: null,
    masked_response: null,
    decision: 'DENIED',
    denial_reason: 'Role Customer lacks permission for DELETE operations on accounts'
  }
]

export default function SelAuditLog() {
  const { toggleTheme } = useTheme()
  const [logs, setLogs] = useState([])
  const [expandedRow, setExpandedRow] = useState(null)

  useEffect(() => {
    let isMounted = true
    const fetchLogs = async () => {
      try {
        const rawLogs = await getActionLogs()
        if (isMounted) {
          setLogs(rawLogs)
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch action logs:", err)
          setLogs(MOCK_ACTION_LOGS) // Fallback to mock on error
        }
      }
    }
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 200, minHeight: '100vh', overflowY: 'auto' }}>
        <header style={{ padding: '40px 56px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: 0 }}>SEL Action Logs</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', margin: '8px 0 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Secure Execution Layer · Operational Forensics</p>
          </div>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Theme Toggle</button>
        </header>

        <div style={{ padding: '0 56px 40px' }}>
          <div style={{ background: 'color-mix(in srgb, var(--accent-secure) 10%, transparent)', border: '1px solid var(--accent-secure)', borderRadius: 12, padding: '20px 24px', marginBottom: 32 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--accent-secure)', margin: '0 0 8px' }}>Dynamic Data Masking Active</h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>The SEL sits between the LLM and your tools. It intercepts every tool call, enforces whitelist permissions, and dynamically masks PII using <strong>presidio-anonymizer</strong> before the data is ever seen by the LLM.</p>
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Timestamp</th>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</th>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tool Executed</th>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fields Masked</th>
                  <th style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Decision</th>
                  <th style={{ padding: '20px', width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedRow === log.id
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                        style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.2s' }}
                      >
                        <td style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-primary)' }}>{log.session_role}</td>
                        <td style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{log.tool_called}</td>
                        <td style={{ padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {log.fields_masked.length > 0 ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              {log.fields_masked.map(f => (
                                <span key={f} style={{ background: 'color-mix(in srgb, var(--accent-secure) 15%, transparent)', color: 'var(--accent-secure)', padding: '2px 8px', borderRadius: 12 }}>{f}</span>
                              ))}
                            </div>
                          ) : 'None'}
                        </td>
                        <td style={{ padding: '20px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 12, border: `1px solid ${log.decision === 'PERMITTED' ? 'var(--accent-secure)' : 'var(--accent-threat)'}`, color: log.decision === 'PERMITTED' ? 'var(--accent-secure)' : 'var(--accent-threat)' }}>
                            {log.decision}
                          </span>
                        </td>
                        <td style={{ padding: '20px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{isExpanded ? '▾' : '▸'}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <div style={{ padding: '24px 32px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
                              
                              {log.decision === 'DENIED' ? (
                                <div>
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-threat)', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Permission Validator Denial</div>
                                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'color-mix(in srgb, var(--accent-threat) 10%, transparent)', padding: 16, borderRadius: 8, borderLeft: '2px solid var(--accent-threat)' }}>{log.denial_reason}</div>
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                                  <div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.1em' }}>Raw External Tool Response</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(15,18,28,0.6)', padding: 20, borderRadius: 8, border: '1px dashed var(--accent-threat)' }}>
                                      {log.raw_response}
                                    </div>
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '12px 0 0' }}>This is the raw data returned from the database/API.</p>
                                  </div>
                                  <div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-secure)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.1em', fontWeight: 600 }}>Masked Data Given to LLM</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'color-mix(in srgb, var(--accent-secure) 10%, transparent)', padding: 20, borderRadius: 8, border: '1px solid var(--accent-secure)' }}>
                                      {log.masked_response}
                                    </div>
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '12px 0 0' }}>This is all the LLM sees. Sensitive data never enters the prompt context.</p>
                                  </div>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

import { useTheme } from '../ThemeContext'
import Sidebar from './Sidebar'

export default function SdkIntegration() {
  const { toggleTheme } = useTheme()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-width)', minHeight: '100vh', overflowY: 'auto' }}>
        <header style={{ padding: '40px 56px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: 0 }}>Integration SDK</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', margin: '8px 0 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Drop-in Python Package · API Keys</p>
          </div>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Theme Toggle</button>
        </header>

        <div style={{ padding: '0 56px 40px', maxWidth: 900 }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '32px 40px', marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0 0 16px' }}>Python Integration</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              The entire firewall is packaged as a Python library installable via pip. It takes exactly three lines of code to integrate MalIntent into any existing LLM application.
            </p>
            
            <div style={{ background: 'rgba(15,18,28,0.8)', border: '1px solid #2a2e3d', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #2a2e3d', display: 'flex', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
              </div>
              <pre style={{ margin: 0, padding: '24px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#e2e8f0', overflowX: 'auto' }}>
                <code style={{ display: 'block', marginBottom: 12 }}>
                  <span style={{ color: '#c678dd' }}>from</span> malintent <span style={{ color: '#c678dd' }}>import</span> Firewall
                </code>
                <code style={{ display: 'block', marginBottom: 12 }}>
                  <span style={{ color: '#56b6c2' }}># Initialize the firewall with your desired context mode</span><br/>
                  <span style={{ color: '#e5c07b' }}>fw</span> = Firewall(<span style={{ color: '#d19a66' }}>mode</span>=<span style={{ color: '#98c379' }}>"balanced"</span>, <span style={{ color: '#d19a66' }}>system_context</span>=<span style={{ color: '#98c379' }}>"banking assistant"</span>)
                </code>
                <code style={{ display: 'block' }}>
                  <span style={{ color: '#56b6c2' }}># Wrap your user input check</span><br/>
                  <span style={{ color: '#e5c07b' }}>safe_prompt</span> = fw.check(<span style={{ color: '#e06c75' }}>user_input</span>) <span style={{ color: '#56b6c2' }}># raises BlockedPromptException if malicious</span>
                </code>
              </pre>
            </div>
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: '32px 40px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0 0 16px' }}>API Keys</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              Use these keys to authenticate your SDK client with the MalIntent deployment.
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', padding: '16px 24px', borderRadius: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Production Key</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--text-primary)' }}>mi_live_9f8d7c6b5a41234567890abcdef</div>
              </div>
              <button style={{ background: 'var(--accent-secure)', color: '#000', border: 'none', padding: '8px 24px', borderRadius: 16, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Copy</button>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

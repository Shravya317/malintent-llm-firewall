import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/layout/Logo';

export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSignIn = (e) => {
    e.preventDefault();
    // For now, just navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: 'var(--text-primary)'
    }}>
      
      {/* Brand Header */}
      <div 
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '40px',
          cursor: 'pointer'
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            position: 'absolute',
            width: '100%', height: '100%',
            background: 'var(--accent-threat)',
            filter: 'blur(20px)',
            opacity: 0.2,
            borderRadius: '50%'
          }}></div>
          <Logo style={{ width: 48, height: 48 }} />
        </div>
        <h1 style={{ 
          fontFamily: 'var(--font-brand)', 
          fontSize: '1.5rem', 
          fontWeight: 'bold',
          margin: '0 0 8px 0',
          letterSpacing: '0.05em'
        }}>
          <span style={{ color: 'var(--accent-threat)' }}>MAL</span>INTENT
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)',
          margin: 0,
          fontSize: '0.9rem'
        }}>
          AI-Native Security · Threat Defense · Trust
        </p>
      </div>

      {/* Auth Card */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        padding: '32px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          margin: '0 0 8px 0'
        }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          margin: '0 0 32px 0',
          fontSize: '0.9rem'
        }}>
          {isLogin ? 'Sign in to continue your journey' : 'Join MalIntent and secure your AI applications'}
        </p>

        <form onSubmit={handleSignIn} style={{ width: '100%' }}>
          {/* Email Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-threat)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-threat)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--accent-threat)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: '24px'
            }}
            onMouseOver={(e) => { e.target.style.background = '#ff1a1a' }}
            onMouseOut={(e) => { e.target.style.background = 'var(--accent-threat)'; e.target.style.boxShadow = 'none' }}
            onMouseDown={(e) => { e.target.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.8)' }}
            onMouseUp={(e) => { e.target.style.boxShadow = 'none' }}
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/layout/Logo';
import { registerUser, verifyOTP } from '../api/client';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '', middle_name: '', last_name: '',
    dob: '', sex: '', country: '', state: '', phone: '',
    email: '', password: ''
  });
  const [otp, setOtp] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (isLogin) {
        // Normal login flow
        navigate('/dashboard');
      } else {
        // Registration flow
        await registerUser(formData);
        setOtpStep(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOTP(formData.email, otp);
      setOtpStep(false);
      setIsLogin(true);
      setOtp('');
      alert("Registration successful! You can now log in.");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)'
  };

  // Helper for generating standard text inputs
  const renderInput = (name, label, type = "text", required = true) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>
        {label} {required ? "" : <span style={{opacity: 0.5}}>(Optional)</span>}
      </label>
      <input
        type={type}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        required={required}
        style={inputStyle}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent-threat)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
      />
    </div>
  );

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
          marginBottom: '32px',
          cursor: 'pointer'
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <div style={{
            position: 'absolute',
            width: '100%', height: '100%',
            background: 'var(--accent-threat)',
            filter: 'blur(20px)',
            opacity: 0.2,
            borderRadius: '50%'
          }}></div>
          <Logo style={{ width: 40, height: 40 }} />
        </div>
        <h1 style={{ 
          fontFamily: 'var(--font-brand)', 
          fontSize: '1.25rem', 
          fontWeight: 'bold',
          margin: '0 0 4px 0',
          letterSpacing: '0.05em'
        }}>
          <span style={{ color: 'var(--accent-threat)' }}>MAL</span>INTENT
        </h1>
      </div>

      {/* Auth Card */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--card-radius)',
        padding: '32px',
        width: '100%',
        maxWidth: isLogin || otpStep ? '380px' : '600px', // Wider card for Sign Up
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'max-width 0.3s ease'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px 0', textAlign: 'center' }}>
          {otpStep ? 'Verify Email' : isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px 0', fontSize: '0.9rem', textAlign: 'center' }}>
          {otpStep 
            ? `We sent a 6-digit code to ${formData.email}` 
            : isLogin 
              ? 'Sign in to continue your journey' 
              : 'Join MalIntent and secure your AI applications'}
        </p>

        {error && (
          <div style={{ width: '100%', padding: '10px', background: 'rgba(255, 45, 85, 0.1)', color: 'var(--accent-threat)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '20px', textAlign: 'center', border: '1px solid rgba(255, 45, 85, 0.2)' }}>
            {error}
          </div>
        )}

        {otpStep ? (
          <form onSubmit={handleVerifyOTP} style={{ width: '100%' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="000000"
                style={{
                  ...inputStyle,
                  width: '180px',
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  letterSpacing: '0.2em',
                  padding: '12px'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-threat)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', background: 'var(--accent-threat)', color: '#ffffff',
                border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'all 0.15s ease'
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Complete'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            
            {/* Login Mode Fields */}
            {isLogin ? (
              <>
                {renderInput('email', 'Email address', 'email')}
                {renderInput('password', 'Password', 'password')}
              </>
            ) : (
              /* Sign Up Mode Fields (2-Column Grid) */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                {renderInput('first_name', 'First Name')}
                {renderInput('last_name', 'Last Name')}
                
                <div style={{ gridColumn: '1 / -1' }}>
                  {renderInput('middle_name', 'Middle Name', 'text', false)}
                </div>

                {renderInput('dob', 'Date of Birth')}
                {renderInput('sex', 'Sex')}
                
                {renderInput('country', 'Country')}
                {renderInput('state', 'State')}

                {renderInput('phone', 'Phone Number', 'tel')}
                {renderInput('email', 'Email Address', 'email')}
                
                <div style={{ gridColumn: '1 / -1' }}>
                  {renderInput('password', 'Password', 'password')}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', background: 'var(--accent-threat)', color: '#ffffff',
                border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'all 0.15s ease', marginTop: '8px', marginBottom: '24px'
              }}
              onMouseOver={(e) => { if(!loading) e.target.style.background = '#ff1a1a' }}
              onMouseOut={(e) => { if(!loading) { e.target.style.background = 'var(--accent-threat)'; e.target.style.boxShadow = 'none' } }}
              onMouseDown={(e) => { if(!loading) e.target.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.8)' }}
              onMouseUp={(e) => { if(!loading) e.target.style.boxShadow = 'none' }}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }} 
                style={{ color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

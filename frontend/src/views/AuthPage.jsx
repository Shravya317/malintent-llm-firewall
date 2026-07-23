import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/layout/Logo';
import { registerUser, verifyOTP, loginUser } from '../api/client';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '', middle_name: '', last_name: '',
    dob: '', sex: '', country: '', state: '', phone: '',
    email: '', password: ''
  });
  const [otp, setOtp] = useState('');

  // Redirect to dashboard if already logged in
  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('malintent_token')
    if (token) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const extractError = (err) => {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(e => `${e.loc?.[e.loc.length - 1]}: ${e.msg}`).join(', ');
    return "An error occurred. Please check your connection.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (isLogin) {
        // Normal login flow
        const response = await loginUser(formData.email, formData.password);
        localStorage.setItem('token', response.access_token);
        navigate('/dashboard');
      } else {
        // Registration flow
        await registerUser(formData);
        setOtpStep(true);
      }
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await verifyOTP(formData.email, otp);
      localStorage.setItem('token', response.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(extractError(err));
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

  const renderSelect = (name, label, options, required = true) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <select
        name={name}
        value={formData[name]}
        onChange={handleChange}
        required={required}
        style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent-threat)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
      >
        <option value="" disabled>Select {label}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const renderPassword = (name, label) => (
    <div style={{ marginBottom: '16px', position: 'relative' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? "text" : "password"}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          required
          style={{ ...inputStyle, paddingRight: '40px' }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent-threat)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  const sexOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
    { label: 'Prefer not to say', value: 'Prefer not to say' }
  ];

  const countryOptions = [
    { label: 'United States', value: 'United States' },
    { label: 'United Kingdom', value: 'United Kingdom' },
    { label: 'Canada', value: 'Canada' },
    { label: 'Australia', value: 'Australia' },
    { label: 'India', value: 'India' },
    { label: 'Germany', value: 'Germany' },
    { label: 'Other', value: 'Other' }
  ];

  const stateOptions = [
    { label: 'California', value: 'California' },
    { label: 'New York', value: 'New York' },
    { label: 'Texas', value: 'Texas' },
    { label: 'London', value: 'London' },
    { label: 'Ontario', value: 'Ontario' },
    { label: 'Delhi', value: 'Delhi' },
    { label: 'Maharashtra', value: 'Maharashtra' },
    { label: 'Other', value: 'Other' }
  ];

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
        maxWidth: isLogin || otpStep ? '380px' : '640px', // Wider card for Sign Up
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
                {renderPassword('password', 'Password')}
              </>
            ) : (
              /* Sign Up Mode Fields (2-Column Grid) */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                {renderInput('first_name', 'First Name')}
                {renderInput('last_name', 'Last Name')}
                
                <div style={{ gridColumn: '1 / -1' }}>
                  {renderInput('middle_name', 'Middle Name', 'text', false)}
                </div>

                {renderInput('dob', 'Date of Birth', 'date')}
                {renderSelect('sex', 'Sex', sexOptions)}
                
                {renderSelect('country', 'Country', countryOptions)}
                {renderSelect('state', 'State', stateOptions)}

                {renderInput('phone', 'Phone Number', 'tel')}
                {renderInput('email', 'Email Address', 'email')}
                
                <div style={{ gridColumn: '1 / -1' }}>
                  {renderPassword('password', 'Password')}
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

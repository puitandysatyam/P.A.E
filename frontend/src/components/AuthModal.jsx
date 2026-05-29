import React, { useState } from 'react';

export default function AuthModal({ onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address.');
      return false;
    }
    
    if (!isLogin) {
      if (formData.name.trim().length < 2) {
        setError('Name must be at least 2 characters long.');
        return false;
      }
      const pw = formData.password;
      if (pw.length < 8) {
        setError('Password must be at least 8 characters long.');
        return false;
      }
      if (!/[A-Z]/.test(pw)) {
        setError('Password must contain at least one uppercase letter.');
        return false;
      }
      if (!/[a-z]/.test(pw)) {
        setError('Password must contain at least one lowercase letter.');
        return false;
      }
      if (!/[0-9]/.test(pw)) {
        setError('Password must contain at least one number.');
        return false;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) {
        setError('Password must contain at least one special character.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    let API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
    
    // Remove trailing slash to prevent double slashes (//) which cause Spring Boot 404s (and fake CORS errors)
    if (API_URL.endsWith('/')) {
      API_URL = API_URL.slice(0, -1);
    }
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
      } else {
        // Success! data should contain { token, userId, name }
        onSuccess(data);
      }
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', padding: 32, borderRadius: 20,
        width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>&times;</button>
        </div>

        {error && <div style={{ color: '#ef4444', background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#334155' }}>Full Name</label>
              <input 
                type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none', fontSize: 14 }}
              />
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#334155' }}>Email Address</label>
            <input 
              type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none', fontSize: 14 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#334155' }}>Password</label>
            <input 
              type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none', fontSize: 14 }}
            />
          </div>

          <button 
            type="submit" disabled={isLoading}
            style={{ 
              marginTop: 8, width: '100%', padding: '14px', background: '#4f46e5', color: '#fff', 
              border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Please wait...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}

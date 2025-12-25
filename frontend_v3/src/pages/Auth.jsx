import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import api from '../api';
import { useAuth } from '../App';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Auth() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('student');
  const [toast, setToast] = useState(null); // { type, message }

  const [formData, setFormData] = useState({
    email: '', password: '', full_name: '', phone: '',
    enrollment_no: '', registration_no: '', semester: '', 
    hostel: '', block: '', room_no: '', department: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append('username', formData.email);
        params.append('password', formData.password);

        const res = await api.post('/login', params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }});
        const userRes = await api.get('/users/me', { headers: { Authorization: `Bearer ${res.data.access_token}` } });
        
        login(userRes.data, res.data.access_token);
        showToast('success', `Welcome back, ${userRes.data.full_name}!`);
      } else {
        const payload = { ...formData, role: role === 'official' ? 'official' : 'student' };
        await api.post('/register', payload);
        showToast('success', "🎉 Registration Successful! Please login.");
        setIsLogin(true);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "Action failed";
      showToast('error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log("Google User:", decoded);
      showToast('success', `Welcome ${decoded.name}! (Google Auth Mock)`);
    } catch (error) {
      showToast('error', "Google Login Failed");
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="flex-center fade-in" style={{ minHeight: '100vh', background: 'transparent' }}>
        
        {/* TOAST POPUP */}
        {toast && (
          <div style={{ 
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', 
            zIndex: 9999, padding: '12px 24px', borderRadius: '12px',
            background: toast.type === 'error' ? 'rgba(254, 202, 202, 0.9)' : 'rgba(187, 247, 208, 0.9)',
            border: `1px solid ${toast.type === 'error' ? '#f87171' : '#4ade80'}`,
            color: toast.type === 'error' ? '#991b1b' : '#14532d',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)',
            fontWeight: '600', animation: 'fadeIn 0.3s ease-out', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
            {toast.message}
          </div>
        )}

        <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '3rem 2.5rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2.8rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '-1px', color: '#1e293b' }}>
              Campus<span style={{ color: '#4f46e5' }}>Fix</span>
            </h1>
            <p style={{ fontSize: '1rem', color: '#64748b', fontWeight: '500' }}>
              {isLogin ? 'Welcome back! Login to continue.' : 'Create your account to get started.'}
            </p>
          </div>

          {!isLogin && (
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '6px', borderRadius: '16px', marginBottom: '25px' }}>
              {['student', 'official'].map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  style={{ 
                    flex: 1, border: 'none', padding: '10px', borderRadius: '12px',
                    fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px',
                    background: role === r ? 'white' : 'transparent', color: role === r ? '#4f46e5' : '#94a3b8',
                    boxShadow: role === r ? '0 4px 10px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s ease', cursor: 'pointer'
                  }}>
                  {r}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && <InputField name="full_name" placeholder="Full Name" onChange={handleChange} />}
            <InputField name="email" type="email" placeholder="Email Address" onChange={handleChange} />
            <InputField name="password" type="password" placeholder="Password" onChange={handleChange} />

            {!isLogin && role === 'student' && (
              <div className="fade-in grid-2" style={{ gap: '15px' }}>
                <InputField name="enrollment_no" placeholder="Enrollment No" onChange={handleChange} />
                <InputField name="semester" placeholder="Semester (e.g. 3rd)" onChange={handleChange} />
                <InputField name="hostel" placeholder="Hostel Name" onChange={handleChange} />
                <InputField name="block" placeholder="Block" onChange={handleChange} />
                <InputField name="room_no" placeholder="Room No" onChange={handleChange} />
              </div>
            )}

            {!isLogin && role === 'official' && (
              <div className="fade-in grid-2" style={{ gap: '15px' }}>
                <InputField name="phone" placeholder="Phone Number" onChange={handleChange} />
                <InputField name="department" placeholder="Department" onChange={handleChange} />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-grad"
              style={{ marginTop: '25px', width: '100%', height: '55px', fontSize: '1.1rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)' }}>
              {loading ? 'Processing...' : (isLogin ? 'LOGIN' : 'CREATE ACCOUNT')}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            <span style={{ padding: '0 15px', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>OR CONTINUE WITH</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => showToast('error', 'Google Login Failed')} theme="filled_blue" shape="pill" size="large" width="350" logo_alignment="left" />
          </div>

          <p style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.95rem', color: '#64748b' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color: '#4f46e5', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Register' : 'Login'}
            </span>
          </p>

        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

function InputField({ name, type = "text", placeholder, onChange }) {
  return (
    <input 
      name={name} type={type} className="glass-input" placeholder={placeholder} onChange={onChange} required 
      style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', marginBottom: '15px', padding: '16px', borderRadius: '14px', fontSize: '1rem' }}
    />
  );
}
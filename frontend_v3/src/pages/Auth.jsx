import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import api from '../api';
import { useAuth } from '../auth/AuthContext';

// Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Auth() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('student');
  const [toast, setToast] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const [formData, setFormData] = useState({
    email: '', password: '', full_name: '', phone: '',
    enrollment_no: '', registration_no: '', semester: '', 
    hostel: '', block: '', room_no: '', department: ''
  });

  // Allowed Hostels List
  const HOSTEL_OPTIONS = ["Aryabhatta", "RNT", "Gargi", "Dhalai", "Gomati"];

  // 7-TIER RESPONSIVE CONFIG WITH INPUT HEIGHT & GAP
  const getResponsiveConfig = () => {
    if (windowWidth >= 2560) return { fontSize: 1.2, padding: 3.2, cardWidth: 520, googleWidth: 350, inputHeight: 58, gap: 18 };
    if (windowWidth >= 1920) return { fontSize: 1.1, padding: 2.8, cardWidth: 480, googleWidth: 330, inputHeight: 55, gap: 16 };
    if (windowWidth >= 1366) return { fontSize: 1, padding: 2.5, cardWidth: 440, googleWidth: 310, inputHeight: 52, gap: 15 };
    if (windowWidth >= 1024) return { fontSize: 0.92, padding: 2.2, cardWidth: 400, googleWidth: 290, inputHeight: 48, gap: 14 };
    if (windowWidth >= 768) return { fontSize: 0.85, padding: 2, cardWidth: 360, googleWidth: 270, inputHeight: 46, gap: 13 };
    if (windowWidth >= 480) return { fontSize: 0.78, padding: 1.6, cardWidth: 330, googleWidth: 250, inputHeight: 44, gap: 11 };
    return { fontSize: 0.7, padding: 1.3, cardWidth: 300, googleWidth: 230, inputHeight: 42, gap: 10 };
  };

  const config = getResponsiveConfig();
  const spacingModifier = isLogin ? 1 : 0.85; // COMPACT MODE FOR REGISTER

  // WINDOW RESIZE LISTENER
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

            const res = await api.post('/login', params, {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // Try to get user from login response first (if backend updated)
            if (res.data.user) {
              login(res.data.user, res.data.access_token);
              showToast('success', `Welcome back, ${res.data.user.full_name}!`);
            } else {
              // Fallback: fetch user separately (old method)
              const userRes = await api.get('/users/me', {
                headers: { Authorization: `Bearer ${res.data.access_token}` }
              });
              login(userRes.data, res.data.access_token);
              showToast('success', `Welcome back, ${userRes.data.full_name}!`);
            }
        }
      else {
        const payload = { ...formData, role: role === 'official' ? 'official' : 'student' };
        await api.post('/register', payload);
        showToast('success', "🎉 Registration Successful! Please login.");
        setIsLogin(true);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "An error occurred";
      showToast('error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // GOOGLE LOGIN - RESPECTS ROLE CHOICE
  const handleGoogleSuccess = async (credentialResponse) => {
  try {
    const res = await api.post('/google-login', { 
      token: credentialResponse.credential,
      role: role
    });

    const { access_token, user } = res.data;
    
    // Use user from response if available
    if (user) {
      login(user, access_token);
      showToast('success', `Welcome, ${user.full_name}!`);
    } else {
      // Fallback: fetch user separately
      const userRes = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      login(userRes.data, access_token);
      showToast('success', `Welcome, ${userRes.data.full_name}!`);
    }
  } catch (error) {
    console.error(error);
    showToast('error', "Google Login Failed. Try again.");
  }
};

  // PREMIUM ANIMATIONS & SCROLLBAR HIDING
  const animationStyle = `
    @keyframes fadeIn { 
      from { opacity: 0; transform: translateY(10px); } 
      to { opacity: 1; transform: translateY(0); } 
    }
    @keyframes slideIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .fade-in-anim { animation: fadeIn 0.4s ease-out; }
    .slide-in-anim { animation: slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <style>{animationStyle}</style>

      {/* PREMIUM BACKGROUND WRAPPER */}
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        pointerEvents: 'none'
      }}>

        {/* PREMIUM TOAST */}
        {toast && (
          <div className="slide-in-anim" style={{ 
            position: 'fixed', 
            top: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 9999, 
            padding: `${10 * config.fontSize}px ${20 * config.fontSize}px`, 
            borderRadius: '30px',
            background: toast.type === 'error' ? 'rgba(254, 202, 202, 0.95)' : 'rgba(187, 247, 208, 0.95)',
            border: `1px solid ${toast.type === 'error' ? '#f87171' : '#4ade80'}`,
            color: toast.type === 'error' ? '#991b1b' : '#14532d',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)', 
            backdropFilter: 'blur(10px)',
            fontWeight: '600', 
            fontSize: `${0.85 * config.fontSize}rem`,
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            maxWidth: '90vw',
            pointerEvents: 'auto'
          }}>
            <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
            {toast.message}
          </div>
        )}

        {/* PREMIUM AUTH CARD */}
        <div className="no-scrollbar fade-in-anim" style={{ 
          pointerEvents: 'auto',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          maxWidth: `${config.cardWidth}px`,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: `${config.padding}rem`,
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}>

          {/* HEADER */}
          <div style={{ 
            textAlign: 'center', 
            marginBottom: `${config.gap * 1.3 * spacingModifier}px` 
          }}>
            <h1 style={{ 
              fontSize: `${2.5 * config.fontSize}rem`, 
              fontWeight: '900', 
              marginBottom: `${0.2 * config.fontSize}rem`, 
              letterSpacing: '-0.8px', 
              color: '#1e293b',
              lineHeight: 1.1
            }}>
              Campus<span style={{ color: '#4f46e5' }}>Fix</span>
            </h1>
            <p style={{ 
              fontSize: `${0.88 * config.fontSize}rem`, 
              color: '#64748b', 
              fontWeight: '500',
              lineHeight: 1.3,
              margin: 0
            }}>
              {isLogin ? 'Welcome back! Login to continue.' : 'Create your account to get started.'}
            </p>
          </div>

          {/* PREMIUM TABS - SAME SIZE ALWAYS */}
          {!isLogin && (
            <div style={{ 
              display: 'flex', 
              background: 'rgba(241, 245, 249, 0.85)', 
              padding: `${5 * config.fontSize}px`, 
              borderRadius: '14px', 
              marginBottom: `${config.gap * spacingModifier}px`,
              gap: `${4 * config.fontSize}px`
            }}>
              {['student', 'official'].map((r) => (
                <button 
                  key={r} 
                  type="button" 
                  onClick={() => setRole(r)}
                  style={{ 
                    flex: 1, 
                    minHeight: `${36 * config.fontSize}px`,
                    border: 'none', 
                    padding: `${8 * config.fontSize}px ${10 * config.fontSize}px`, 
                    borderRadius: '10px',
                    fontWeight: '700', 
                    textTransform: 'uppercase', 
                    fontSize: `${0.72 * config.fontSize}rem`, 
                    letterSpacing: '0.5px',
                    background: role === r ? 'white' : 'transparent',
                    color: role === r ? '#4f46e5' : '#94a3b8',
                    boxShadow: role === r ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                    cursor: 'pointer',
                    lineHeight: 1.2
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* FORM WITH PREMIUM SPACING */}
          <form onSubmit={handleSubmit} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: `${config.gap * spacingModifier}px` 
          }}>
            {!isLogin && (
              <InputField 
                config={config} 
                name="full_name" 
                placeholder="Full Name" 
                onChange={handleChange} 
                compact={!isLogin}
              />
            )}
            <InputField 
              config={config} 
              name="email" 
              type="email" 
              placeholder="Email Address" 
              onChange={handleChange} 
              compact={!isLogin}
            />
            <InputField 
              config={config} 
              name="password" 
              type="password" 
              placeholder="Password" 
              onChange={handleChange} 
              compact={!isLogin}
            />

            {/* STUDENT FIELDS WITH ANIMATION */}
            {!isLogin && role === 'student' && (
              <div className="fade-in-anim" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: `${config.gap * spacingModifier}px` 
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: `${10 * config.fontSize}px` 
                }}>
                  <InputField config={config} name="enrollment_no" placeholder="Enrollment No" onChange={handleChange} compact />
                  <InputField config={config} name="semester" placeholder="Semester" onChange={handleChange} compact />
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: `${10 * config.fontSize}px` 
                }}>
                  <select 
                    name="hostel" 
                    onChange={handleChange} 
                    required
                    style={{ 
                      background: '#f8fafc', 
                      border: '1px solid #e2e8f0', 
                      color: '#1e293b', 
                      padding: `0 ${14 * config.fontSize}px`, 
                      borderRadius: '12px', 
                      fontSize: `${0.88 * config.fontSize}rem`,
                      width: '100%',
                      height: `${config.inputHeight * 0.85}px`,
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4f46e5';
                      e.target.style.background = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select Hostel</option>
                    {HOSTEL_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <InputField config={config} name="block" placeholder="Block" onChange={handleChange} compact />
                </div>

                <InputField config={config} name="room_no" placeholder="Room No" onChange={handleChange} compact />
              </div>
            )}

            {/* OFFICIAL FIELDS WITH ANIMATION */}
            {!isLogin && role === 'official' && (
              <div className="fade-in-anim" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: `${10 * config.fontSize}px` 
              }}>
                <InputField config={config} name="phone" placeholder="Phone Number" onChange={handleChange} compact />
                <InputField config={config} name="department" placeholder="Department" onChange={handleChange} compact />
              </div>
            )}

            {/* PREMIUM GRADIENT BUTTON */}
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                marginTop: `${8 * config.fontSize}px`, 
                width: '100%', 
                height: `${config.inputHeight}px`, 
                fontSize: `${0.95 * config.fontSize}rem`, 
                borderRadius: '14px',
                background: loading 
                  ? 'linear-gradient(135deg, #94a3b8, #64748b)' 
                  : 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                color: 'white',
                border: 'none',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: loading 
                  ? 'none' 
                  : '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
                transform: loading ? 'scale(0.98)' : 'scale(1)'
              }}
            >
              {loading ? 'Processing...' : (isLogin ? 'LOGIN' : 'REGISTER')}
            </button>
          </form>

          {/* PREMIUM DIVIDER */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: `${18 * config.fontSize * spacingModifier}px 0 ${15 * config.fontSize * spacingModifier}px 0` 
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            <span style={{ 
              padding: `0 ${12 * config.fontSize}px`, 
              fontSize: `${0.7 * config.fontSize}rem`, 
              color: '#94a3b8', 
              fontWeight: '700',
              whiteSpace: 'nowrap'
            }}>
              OR CONTINUE WITH
            </span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          </div>

          {/* LOGIN MODE - SINGLE GOOGLE BUTTON */}
          {isLogin && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: `${15 * config.fontSize}px`,
              width: '100%',
              borderRadius: '30px',
              overflow: 'hidden'
            }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => showToast('error', 'Google Login Failed')}
                theme="filled_blue" 
                shape="pill" 
                size="large" 
                width={config.googleWidth}
                logo_alignment="left"
              />
            </div>
          )}

          {/* REGISTER MODE - CONDITIONAL GOOGLE BUTTON BASED ON SELECTED TAB */}
          {!isLogin && (
            <div className="fade-in-anim" style={{ 
              display: 'flex',
              justifyContent: 'center',
              marginBottom: `${15 * config.fontSize * spacingModifier}px`
            }}>
              {role === 'student' && (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth: `${config.googleWidth}px`,
                    height: `${44 * config.fontSize}px`,
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    gap: `${10 * config.fontSize}px`,
                    padding: `0 ${12 * config.fontSize}px`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    e.currentTarget.style.borderColor = '#4285f4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#dadce0';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  <span style={{ 
                    fontSize: `${0.88 * config.fontSize}rem`, 
                    fontWeight: '500',
                    color: '#3c4043',
                    fontFamily: 'Roboto, arial, sans-serif'
                  }}>
                    Sign up as Student
                  </span>
                </div>
              )}

              {role === 'official' && (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth: `${config.googleWidth}px`,
                    height: `${44 * config.fontSize}px`,
                    background: '#ffffff',
                    border: '1px solid #dadce0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    gap: `${10 * config.fontSize}px`,
                    padding: `0 ${12 * config.fontSize}px`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    e.currentTarget.style.borderColor = '#4285f4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#dadce0';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  <span style={{ 
                    fontSize: `${0.88 * config.fontSize}rem`, 
                    fontWeight: '500',
                    color: '#3c4043',
                    fontFamily: 'Roboto, arial, sans-serif'
                  }}>
                    Sign up as Official
                  </span>
                </div>
              )}

              {/* HIDDEN GOOGLE LOGIN COMPONENT */}
              <div style={{ display: 'none' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => showToast('error', 'Google Sign-up Failed')}
                  theme="filled_blue" 
                  shape="pill" 
                  size="large" 
                  width={config.googleWidth}
                />
              </div>
            </div>
          )}

          {/* FOOTER */}
          <p style={{ 
            textAlign: 'center', 
            fontSize: `${0.8 * config.fontSize}rem`, 
            color: '#64748b',
            margin: 0,
            lineHeight: 1.4
          }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              style={{ 
                color: '#4f46e5', 
                fontWeight: '700', 
                cursor: 'pointer', 
                textDecoration: 'underline',
                transition: 'color 0.2s ease'
              }} 
              onClick={() => setIsLogin(!isLogin)}
              onMouseEnter={(e) => e.target.style.color = '#6366f1'}
              onMouseLeave={(e) => e.target.style.color = '#4f46e5'}
            >
              {isLogin ? 'Register' : 'Login'}
            </span>
          </p>

        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

// PREMIUM INPUT FIELD WITH FOCUS EFFECTS
function InputField({ name, type = "text", placeholder, onChange, config, compact }) {
  const height = compact ? config.inputHeight * 0.85 : config.inputHeight;

  return (
    <input 
      name={name} 
      type={type} 
      placeholder={placeholder} 
      onChange={onChange} 
      required 
      style={{ 
        background: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        color: '#1e293b', 
        padding: `0 ${16 * config.fontSize}px`,
        borderRadius: '12px',
        fontSize: `${0.88 * config.fontSize}rem`,
        width: '100%',
        height: `${height}px`,
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
        lineHeight: 1.4
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#4f46e5';
        e.target.style.background = '#ffffff';
        e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#e2e8f0';
        e.target.style.background = '#f8fafc';
        e.target.style.boxShadow = 'none';
      }}
    />
  );
}
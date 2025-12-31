import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react'; 
import api from './api';
import { getMessaging, onMessage } from "firebase/messaging";

// --- PAGES ---
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Issues from './pages/Issues';
import Profile from './pages/Profile';
import Contacts from './pages/Contacts';
import Students from './pages/Students';
import MessRating from './pages/MessRating';
import Notices from './pages/Notices'; 
// Top imports
import NotFound from './pages/NotFound';

// --- COMPONENTS ---
import ChatBot from './pages/ChatBot'; 
import Footer from './components/Footer';

// Context Definition
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  // 1. Auth Check
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      api.get('/users/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // 2. Firebase Foreground Notifications
  useEffect(() => {
    try {
      const messaging = getMessaging();
      
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground Message received: ', payload);
        const { title, body } = payload.notification || {};

        const showNotify = () => {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification(title, {
                body,
                icon: '/logo.png'
              });
            });
          } else {
            new Notification(title, { body, icon: '/logo.png' });
          }
        };

        if (Notification.permission === "granted") showNotify();
        else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") showNotify();
          });
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase Messaging failed:", error);
    }
  }, []);

  const login = (userData, token) => { 
    localStorage.setItem('token', token); 
    setUser(userData); 
  };
  
  const logout = () => { 
    localStorage.removeItem('token'); 
    setUser(null); 
    window.location.href = '/'; 
  };

  if (loading)
    return (
      <div
        className="flex-center"
        style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem', height: '100vh' }}
      >
        Loading CampusFix...
      </div>
    );

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>

        {/* FULL PAGE FLEX LAYOUT */}
        <div
          className="app-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh'
          }}
        >

          {user && <Navbar user={user} logout={logout} />}

          {/* MAIN CONTENT */}
          <div
            style={{
              flex: 1,
              padding: '0 20px',
              width: '100%',
              maxWidth: '1400px',
              margin: '0 auto'
            }}
          >
            <Routes>
              <Route path="/notices" element={user ? <Notices /> : <Navigate to="/" />} />
              <Route path="/mess-rating" element={user ? <MessRating /> : <Navigate to="/" />} />
              <Route path="/students" element={user && user.role !== 'student' ? <Students /> : <Navigate to="/" />} />
              <Route path="/" element={!user ? <Auth /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
              <Route path="/issues" element={user ? <Issues /> : <Navigate to="/" />} />
              <Route path="/contacts" element={user ? <Contacts /> : <Navigate to="/" />} />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>

          {/* FLOATING CHATBOT */}
          {user && (
            <div
              style={{
                position: "fixed",
                bottom: "28px",
                right: "28px",
                zIndex: 1000
              }}
            >
              <ChatBot />
            </div>
          )}

          {/* FOOTER STICKS AT BOTTOM — SLIGHTLY ABOVE EDGE */}
          {user && <Footer />}

        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

function Navbar({ user, logout }) {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path
      ? { background: '#4f46e5', color: 'white', borderColor: '#4f46e5' }
      : {};

  return (
    <nav
      className="glass-panel"
      style={{
        margin: '20px auto',
        width: 'calc(100% - 40px)',
        maxWidth: '1200px',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 20,
        zIndex: 100
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src="/logo.png"
          alt="CF"
          style={{ width: '45px', height: '45px', objectFit: 'contain' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div
          style={{
            width: '45px',
            height: '45px',
            background: 'linear-gradient(135deg, #4f46e5, #ec4899)',
            borderRadius: '12px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          CF
        </div>

        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', lineHeight: 1 }}>
            CampusFix
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#4f46e5',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            {user.role} Portal
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}
      >
        <Link to="/dashboard" className="btn-ghost" style={isActive('/dashboard')}>
          📊 <span className="hide-mobile">Dashboard</span>
        </Link>
        <Link to="/issues" className="btn-ghost" style={isActive('/issues')}>
          ⚠️ <span className="hide-mobile">Issues</span>
        </Link>
        <Link to="/contacts" className="btn-ghost" style={isActive('/contacts')}>
          📞 <span className="hide-mobile">Contacts</span>
        </Link>
        <Link to="/profile" className="btn-ghost" style={isActive('/profile')}>
          👤 <span className="hide-mobile">Profile</span>
        </Link>

        <button
          onClick={logout}
          className="btn-ghost"
          style={{
            borderColor: '#ef4444',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px'
          }}
        >
          <LogOut size={18} />
          <span style={{ fontWeight: 700 }}>Logout</span>
        </button>
      </div>
    </nav>
  );
}

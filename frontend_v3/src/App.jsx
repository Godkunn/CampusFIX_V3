import React, { useState, useEffect } from 'react';
import { AuthContext } from './auth/AuthContext';
import { App as CapacitorApp } from '@capacitor/app';

import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
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

function ScrollToTopContainer() {
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.querySelector('.app-scroll-root');
    if (root) {
      // wait for React paint
      requestAnimationFrame(() => {
        root.scrollTop = 0;
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

export default function App() {
  const [user, setUser] = useState(() => {
  const raw = localStorage.getItem('user');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
});

const [loading, setLoading] = useState(() => {
  return !!localStorage.getItem('token') && !localStorage.getItem('user');
});

useEffect(() => {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
}, []);

useEffect(() => {
  const handler = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      CapacitorApp.exitApp();
    }
  });

  return () => {
    handler.remove();
  };
}, []);

  // 1. Auth Check
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;

  api.get('/users/me')
    .then(res => {
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setLoading(false);
    })
    .catch(err => {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
      setLoading(false);
    });
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

  const clearApiCache = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('api-cache:'))
      .forEach(k => localStorage.removeItem(k));
  };

  const login = (userData, token) => { 
    clearApiCache();                 // 🔥 reset old cache
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData); 
  };

  const logout = () => { 
    clearApiCache();                 // 🔥 wipe cached data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
        <ScrollToTopContainer />

        {/* FULL PAGE FLEX LAYOUT */}
        <div
          className="app-container app-scroll-root"
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) =>
    location.pathname === path
      ? { background: '#4f46e5', color: 'white', borderColor: '#4f46e5' }
      : {};

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav
      className="glass-panel"
      style={{
        margin: '20px auto',
        width: 'calc(100% - 40px)',
        maxWidth: '1200px',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 20,
        zIndex: 100
      }}
    >

      {/* ---------- TOP ROW ---------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        {/* LOGO + TEXT */}
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

        {/* -------- HAMBURGER BUTTON (MOBILE ONLY - CSS CONTROLS VISIBILITY) -------- */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b' }}
        >
          {isMenuOpen ? <X size={30} /> : <Menu size={30} />}
        </button>

        {/* -------- DESKTOP MENU -------- */}
        <div className="desktop-menu" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <NavLinks isActive={isActive} logout={logout} closeMenu={() => {}} />
        </div>

      </div>

      {/* -------- MOBILE DROPDOWN MENU -------- */}
      {isMenuOpen && (
        <div className="mobile-menu-dropdown">
          <NavLinks isActive={isActive} logout={logout} closeMenu={closeMenu} isMobile />
        </div>
      )}

    </nav>
  );
}

/* -------------------------------------------
   REUSABLE NAV LINKS COMPONENT
-------------------------------------------- */
function NavLinks({ isActive, logout, closeMenu, isMobile }) {

  const base = isMobile
    ? { width: '100%', justifyContent: 'flex-start', padding: '14px', fontSize: '1.05rem' }
    : {};

  return (
    <>
      <Link to="/dashboard" onClick={closeMenu} className="btn-ghost" style={{ ...isActive('/dashboard'), ...base }}>
        📊 Dashboard
      </Link>

      <Link to="/issues" onClick={closeMenu} className="btn-ghost" style={{ ...isActive('/issues'), ...base }}>
        ⚠️ Issues
      </Link>

      <Link to="/contacts" onClick={closeMenu} className="btn-ghost" style={{ ...isActive('/contacts'), ...base }}>
        📞 Contacts
      </Link>

      <Link to="/profile" onClick={closeMenu} className="btn-ghost" style={{ ...isActive('/profile'), ...base }}>
        👤 Profile
      </Link>

      <button
        onClick={() => {
          logout();
          closeMenu();
        }}
        className="btn-ghost"
        style={{
          borderColor: '#ef4444',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          ...base
        }}
      >
        <LogOut size={18} />
        <span style={{ fontWeight: 700 }}>Logout</span>
      </button>
    </>
  );
}
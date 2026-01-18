// frontend_v3/src/pages/MessRating.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import { Star, TrendingUp, Camera, User, Lock, Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function MessRating() {
  
  // 🔒 Force scroll to top whenever Profile mounts
  useEffect(() => {
    // window-level scroll
    window.scrollTo(0, 0);

    // document-level fallback
    const root = document.scrollingElement || document.documentElement;
    if (root) root.scrollTop = 0;

    // brute-force: reset any inner scrolling container
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollTop && el.scrollTop > 0) {
        el.scrollTop = 0;
      }
    });
  }, []);
  
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(user.role === 'student' ? 'rate' : 'analytics');

  // core state
  const [analytics, setAnalytics] = useState(null);
  const [selectedMess, setSelectedMess] = useState('1st Year Mess');
  const [preview, setPreview] = useState(null);

  // UI state
  const [showPopup, setShowPopup] = useState({ open: false, type: '', msg: '' });
  const [timeLeft, setTimeLeft] = useState('');
  const [isLocked, setIsLocked] = useState(() => {
    if (user.role !== 'student') return false;
    const lastSubmission = localStorage.getItem('lastMessSubmission');
    if (!lastSubmission) return false;
    const lastDate = new Date(parseInt(lastSubmission));
    const now = new Date();
    const daysSince = (now - lastDate) / (1000 * 60 * 60 * 24);
    if (daysSince >= 7) {
      localStorage.removeItem('lastMessSubmission');
      return false;
    }
    return true;
  });

  // form
  const [form, setForm] = useState({
    mess_name: '',
    hygiene: 0,
    taste: 0,
    quality: 0,
    review: '',
    suggestions: '',
    image_data: ''
  });

  const MESSES = ["1st Year Mess", "Veg Mess", "Eastern Mess", "Northern Mess", "Southern Mess"];

  // config
  const CACHE_TTL_MINUTES = 5;
  const REFRESH_INTERVAL_MINUTES = 10;
  const cacheKeyFor = (mess) => `mess-analytics-${mess}`;

  // control refs
  const abortRef = useRef(null);
  const autoRefreshTimerRef = useRef(null);

  // loading indicators
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingFirst, setIsLoadingFirst] = useState(false);

  // ---------- helpers: safe sessionStorage ----------
  function safeStorageGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  function safeStorageSet(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('sessionStorage set failed', e);
    }
  }
  function cacheIsFresh(entry, ttlMinutes) {
    if (!entry || !entry._ts) return false;
    const ageMin = (Date.now() - entry._ts) / (1000 * 60);
    return ageMin < ttlMinutes;
  }

  // ---------- countdown lock ----------
  useEffect(() => {
    if (!isLocked) return;
    const tick = () => {
      const last = Number(localStorage.getItem('lastMessSubmission') || 0);
      if (!last) { setIsLocked(false); return; }
      const unlockAt = last + 7 * 24 * 3600 * 1000;
      const diff = unlockAt - Date.now();
      if (diff <= 0) {
        setIsLocked(false);
        localStorage.removeItem('lastMessSubmission');
        setTimeLeft('');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isLocked]);

  // ---------- analytics loader (useCallback, safe deps) ----------
  const loadAnalytics = useCallback(async ({ force = false, hadAny = false } = {}) => {
    const key = cacheKeyFor(selectedMess);

    // abort previous
    try {
      if (abortRef.current) abortRef.current.abort();
    } catch (e) {
      console.warn(e);
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // try instant cached value (non-blocking)
    if (!force) {
      const cached = safeStorageGet(key);
      if (cached && cacheIsFresh(cached, CACHE_TTL_MINUTES)) {
        setAnalytics(cached.data);
      }
    } else {
      // force -> clear to show skeleton
      setAnalytics(null);
    }

    setIsRefreshing(true);
    if (!hadAny) setIsLoadingFirst(true);

    try {
      // axios supports signal option in newer versions
      const res = await api.get(
      `/mess/analytics?mess=${encodeURIComponent(selectedMess)}&scope=all&force_sync=${force}`, // ✅ NEW
      { signal }
    );

      if (signal.aborted) return;
      if (res?.data) {
        safeStorageSet(key, { _ts: Date.now(), data: res.data });
        setAnalytics(res.data);
      }
    } catch (err) {
      console.warn('loadAnalytics error', err);
      // if nothing cached, set a safe fallback
      const cached = safeStorageGet(key);
      if (!cached) {
        setAnalytics({
          sentiment: "Neutral",
          total: 0,
          action_item: "No data available",
          avg: { hygiene: 0, taste: 0, quality: 0, overall: 0 },
          reviews: []
        });
      }
    } finally {
      setIsRefreshing(false);
      setIsLoadingFirst(false);
    }
  }, [selectedMess]);

  // ---------- AUTO-REFRESH ENGINE ----------
  useEffect(() => {
    // Only run if we are in Analytics mode (not student rating mode)
    if (activeTab !== 'analytics' || user.role === 'student') return;

    // Clear any existing timer to avoid duplicates
    if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);

    // Set the new timer
    autoRefreshTimerRef.current = setInterval(() => {
      //Triggers the "Refresh" logic automatically
      loadAnalytics({ force: true });
    }, REFRESH_INTERVAL_MINUTES * 60 * 1000); // Minutes to Milliseconds

    // Cleanup: Stop the timer when the user leaves the page
    return () => {
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, [activeTab, user.role, loadAnalytics]);
  
  // ---------- effect: run on tab open or mess change ----------
  useEffect(() => {
  if (activeTab !== 'analytics' || user.role === 'student') return;

  let cancelled = false;

  const fetch = async () => {
    try {
      const res = await api.get(
  `/mess/analytics?mess=${encodeURIComponent(selectedMess)}&scope=all`
);
      if (!cancelled) setAnalytics(res.data);
    } catch (e) {
      if (!cancelled) {
        console.warn("Silent fetch error:", e);
        // If no data, just show nothing – no fallback spam
        setAnalytics(null);
      }
    }
  };

  fetch();

  return () => {
    cancelled = true;
  };
}, [activeTab, selectedMess, user.role]);

  // ---------- image upload handlers ----------
  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, image_data: reader.result }));
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // ---------- submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.hygiene === 0 || form.taste === 0 || form.quality === 0) {
      setShowPopup({ open: true, type: 'error', msg: "Please rate all categories." });
      return;
    }
    try {
      await api.post('/mess/rate', form);
      localStorage.setItem('lastMessSubmission', Date.now().toString());
      setIsLocked(true);
      setShowPopup({ open: true, type: 'success', msg: "Feedback submitted — locked until next week." });
      setForm({ mess_name: '', hygiene: 0, taste: 0, quality: 0, review: '', suggestions: '', image_data: '' });
      setPreview(null);
      // refresh analytics in background (force)
      loadAnalytics({ force: true, hadAny: !!analytics });
    } catch (err) {
      console.warn(err);
      setShowPopup({ open: true, type: 'error', msg: err?.response?.data?.detail || 'Submission failed' });
    }
  };

  const handleManualRefresh = () => {
    loadAnalytics({ force: true, hadAny: !!analytics });
  };

  // ---------- Render ----------
  return (
    <div className="container fade-in" style={{ position: 'relative' }}>
      {/* Popup */}
      {showPopup.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowPopup({ ...showPopup, open: false })}>
          <div className="glass-panel modal-content rgb-border" onClick={e => e.stopPropagation()}>
            <div className={`popup-icon ${showPopup.type}`}>{showPopup.type === 'success' ? <CheckCircle size={40} /> : <AlertCircle size={40} />}</div>
            <h2 className="popup-title">{showPopup.type === 'success' ? 'Success!' : 'Error'}</h2>
            <p className="popup-msg">{showPopup.msg}</p>
            <button onClick={() => setShowPopup({ ...showPopup, open: false })} className="btn-grad popup-btn">Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="header-strip glass-panel">
        <h1 className="header-title">🍔 Mess Quality Monitor</h1>
        <p className="header-subtitle">
          {user.role === 'student' ? 'Weekly feedback decides menu & contracts.' : 'Real-time Quality & Sentiment Dashboard.'}
        </p>
        <div className="header-actions">
          {user.role === 'student' && (
            <button onClick={() => setActiveTab('rate')} className={`tab-btn ${activeTab === 'rate' ? 'active' : ''}`}>
              ⭐ Rate This Week
            </button>
          )}
          {user.role !== 'student' && (
            <button onClick={() => setActiveTab('analytics')} className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}>
              📊 Analytics
            </button>
          )}
        </div>
      </div>

      {/* Student Form */}
      {activeTab === 'rate' && user.role === 'student' && (
        <div className="glass-panel form-container" style={{ position: 'relative', overflow: 'hidden' }}>
          {isLocked && (
            <div className="locked-overlay">
              <Lock size={40} className="lock-icon" />
              <h3>Vote Submitted!</h3>
              <p>Locked until next week to prevent spam.</p>
              <div className="timer-box-locked">
                <Clock size={16} />
                <span>Unlocks in: {timeLeft}</span>
              </div>
            </div>
          )}

          <div className={`form-content ${isLocked ? 'blurred' : ''}`}>
            <div className="flex-between mb-4">
              <h2 className="section-title">🗳️ Weekly Vote</h2>
              <span className="badge-pill">🔒 Anonymous</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label-text">1. Select Mess</label>
                <select className="glass-input" value={form.mess_name} onChange={e => setForm({ ...form, mess_name: e.target.value })} required disabled={isLocked}>
                  <option value="">Choose Mess...</option>
                  {MESSES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="label-text">2. Rate Quality</label>
                <div className="rating-grid mb-3">
                  <StarRating label="Hygiene" value={form.hygiene} onChange={v => setForm({ ...form, hygiene: v })} disabled={isLocked} />
                  <StarRating label="Taste" value={form.taste} onChange={v => setForm({ ...form, taste: v })} disabled={isLocked} />
                  <StarRating label="Quality" value={form.quality} onChange={v => setForm({ ...form, quality: v })} disabled={isLocked} />
                </div>
              </div>

              <div className="form-group">
                <label className="label-text">3. Detailed Review (Optional)</label>
                <textarea className="glass-input" rows="2" placeholder="Rice was undercooked..." value={form.review} onChange={e => setForm({ ...form, review: e.target.value })} disabled={isLocked} />
              </div>

              <div className="form-group">
                <label className="label-text">4. Suggestions (Optional)</label>
                <textarea className="glass-input" rows="2" placeholder="Add more fruits..." value={form.suggestions} onChange={e => setForm({ ...form, suggestions: e.target.value })} disabled={isLocked} />
              </div>

              <div className="form-group mb-4">
                <label className="label-text">5. Photo Evidence</label>
                <div onClick={() => !isLocked && document.getElementById('messImg').click()} className="upload-box" style={{ backgroundImage: preview ? `url(${preview})` : 'none', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                  {!preview && <div className="upload-placeholder"><Camera size={18} /> Upload Photo</div>}
                </div>
                <input id="messImg" type="file" hidden onChange={handleImage} disabled={isLocked} accept="image/*" />
              </div>

              <button className="btn-grad submit-btn" disabled={isLocked}>
                {isLocked ? 'Submitted' : 'Submit Rating'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin analytics */}
      {activeTab === 'analytics' && user.role !== 'student' && (
        <div className="analytics-layout fade-in">
          <div className="analytics-col">
            <div className="glass-panel p-3 mb-3">
              <label className="label-text">Select Mess</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="glass-input mb-0"
                  value={selectedMess}
                  onChange={e => setSelectedMess(e.target.value)}
                  aria-label="Select mess"
                >
                  {MESSES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <div style={{ minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isRefreshing ? <SmallSpinner /> : (
                    <button title="Refresh analytics" onClick={handleManualRefresh} className="icon-btn" aria-label="Refresh analytics">
                      <RefreshCw size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Badge label="Overall Status" value={analytics?.sentiment || '—'} color={analytics?.sentiment?.includes('Positive') ? 'green' : 'red'} />
                  <Badge label="Total Feedback Entries" value={analytics?.total ?? '—'} color="blue" />
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Cache TTL: {CACHE_TTL_MINUTES}m • Auto-refresh: {REFRESH_INTERVAL_MINUTES}m
                </div>
              </div>
            </div>

            <div className="glass-panel ai-insight-card">
              <div className="ai-bg-icon">🤖</div>
              <h3 className="card-header"><TrendingUp size={18} /> AI Analysis</h3>

              {!analytics && isLoadingFirst ? (
                <SkeletonBox height={120} />
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div className="action-box"><strong>💡 Action Item:</strong> {analytics?.action_item || 'No action yet'}</div>
                </div>
              )}
            </div>

            {/* 🆕 NEW: Detailed Analysis Section */}
            <div className="glass-panel mb-3">
              <h3 className="card-header mb-3">📑 Detailed Analysis</h3>

              {analytics ? (
                <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                  <p style={{ marginBottom: '8px' }}>
                    Based on <strong>{analytics.total}</strong> student submissions,
                    the mess is currently performing at an overall score of
                    <strong> {analytics.avg.overall}/5.0</strong>.
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    Hygiene is rated <strong>{analytics.avg.hygiene}</strong>, 
                    Taste <strong>{analytics.avg.taste}</strong>, and 
                    Food Quality <strong>{analytics.avg.quality}</strong>.
                  </p>
                  <p>
                    The system classifies the current condition as: 
                    <strong> {analytics.sentiment}</strong>.
                  </p>
                </div>
              ) : (
                <SkeletonBox height={100} />
              )}
            </div>

            <div className="glass-panel">
              <h3 className="card-header mb-4">📈 Metrics</h3>
              {!analytics ? (
                <div>
                  <SkeletonBar />
                  <SkeletonBar />
                  <SkeletonBar />
                </div>
              ) : (
                <>
                  <ProgressBar label="Hygiene" value={analytics.avg.hygiene} color="#10b981" />
                  <ProgressBar label="Taste" value={analytics.avg.taste} color="#f59e0b" />
                  <ProgressBar label="Quality" value={analytics.avg.quality} color="#3b82f6" />
                  <div className="overall-score">{analytics.avg.overall}<span style={{ fontSize: '1rem', color: '#64748b' }}>/5.0</span></div>
                </>
              )}
            </div>
          </div>

          <div className="glass-panel reviews-panel">
            <div className="flex-between mb-3">
              <h3 className="card-header m-0">💬 Voices</h3>
              <span className="tiny-text">Anonymized</span>
            </div>

            <div className="reviews-list">
              {!analytics ? (
                <>
                  <SkeletonReviewCard />
                  <SkeletonReviewCard />
                </>
              ) : (
                analytics.reviews?.length > 0 ? analytics.reviews.map((r, i) => (
                  <div key={i} className="review-card">
                    <div className="flex-between mb-2">
                      <div className="reviewer-tag"><User size={14} /> Verified</div>
                      <span className="rating-pill">{Number(r.rating).toFixed(1)} ★</span>
                    </div>
                    {r.review && <div className="review-text">"{r.review}"</div>}
                    {r.suggestion && <div className="suggestion-text">💡 {r.suggestion}</div>}
                    {r.image && <ProgressiveImg key={r.image} src={r.image} alt="Proof" />}
                  </div>
                )) : (
                  <div className="empty-state">No detailed reviews yet.</div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* keep your CSS exactly — I only added skeleton/spinner used above */}
      <style>{`
        /* GLOBAL */
        .flex-between { display: flex; justify-content: space-between; align-items: center; }
        .mb-3 { margin-bottom: 12px; }
        .mb-4 { margin-bottom: 16px; }

        .label-text { display: block; margin-bottom: 5px; font-weight: 700; color: #64748b; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }

        /* HEADER */
        .header-strip {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white; padding: 20px; border-radius: 16px; margin-bottom: 20px;
          text-align: center;
        }
        .header-title { font-size: 1.5rem; font-weight: 800; margin: 0 0 5px 0; }
        .header-subtitle { font-size: 0.95rem; opacity: 0.95; margin: 0 0 15px 0; display: block; }

        .tab-btn {
           background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4);
           color: white; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-weight: 700; font-size: 1rem;
           transition: all 0.2s;
        }
        .tab-btn.active { background: white; color: #ea580c; border-color: white; }

        /* FORM */
        .form-container { max-width: 600px; margin: 0 auto; padding: 25px; min-height: 400px; }
        .section-title { color: #ea580c; margin: 0; font-size: 1.3rem; }
        .badge-pill { background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; }
        .glass-input { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.9); font-size: 1rem; }
        .rating-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .upload-box { height: 100px; border: 2px dashed #cbd5e1; border-radius: 12px; display: flex; align-items: center; justify-content: center; background-position: center; background-size: cover; background-color: #f8fafc; }
        .submit-btn { width: 100%; background: linear-gradient(to right, #f97316, #ea580c); padding: 14px; font-size: 1.1rem; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }

        /* LOCKED */
        .locked-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(8px); z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #334155; padding: 20px; animation: fadeIn 0.5s; }
        .timer-box-locked { padding: 10px 20px; background: #fff; border: 2px solid #ea580c; color: #ea580c; border-radius: 30px; font-weight: 700; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(234, 88, 12, 0.2); }
        .blurred { filter: blur(3px); pointer-events: none; user-select: none; }

        /* ADMIN DASHBOARD */
        .analytics-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
        .ai-insight-card { border-left: 5px solid #8b5cf6; position: relative; overflow: hidden; padding: 15px; margin-bottom: 20px; }
        .ai-bg-icon { position: absolute; right: -10px; top: -10px; font-size: 4rem; opacity: 0.05; }
        .action-box { background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 0.9rem; color: #475569; line-height: 1.4; }
        .overall-score { text-align: center; margin-top: 15px; font-size: 2.5rem; font-weight: 800; color: #1e293b; }

        .reviews-panel { max-height: 600px; overflow-y: auto; }
        .review-card { background: white; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 12px; }
        .rating-pill { background: #fffbeb; color: #b45309; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
        .review-text { font-size: 0.9rem; color: #1e293b; margin-bottom: 4px; line-height: 1.4; }
        .suggestion-text { font-size: 0.8rem; color: #059669; font-style: italic; }

        /* POPUP */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { animation: popIn 0.3s ease-out; width: 100%; max-width: 320px; background: white; border-radius: 20px; padding: 30px 20px; text-align: center; }
        .popup-icon { width: 60px; height: 60px; margin: 0 auto 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .popup-icon.success { background: #dcfce7; color: #166534; }
        .popup-icon.error { background: #fee2e2; color: #991b1b; }
        .popup-btn { width: 100%; padding: 10px; font-size: 1rem; border: none; background: #0f172a; color: white; border-radius: 10px; cursor: pointer; }

        /* small controls used by new features */
        .small-spinner { width:18px; height:18px; border-radius:50%; border:2px solid rgba(0,0,0,0.08); border-top-color:#111827; animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .skeleton { background: linear-gradient(90deg,#e6eef8 25%, #f3f4f7 37%, #e6eef8 63%); background-size: 400% 100%; animation: shimmer 1.2s ease-in-out infinite; border-radius:8px; }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

        .skeleton-box { height:120px; width:100%; border-radius:8px; }
        .skeleton-bar { height:12px; border-radius:6px; margin-bottom:8px; width:100%; }

        .icon-btn { background: transparent; border: 1px solid #e6eef8; padding: 6px; border-radius: 8px; cursor: pointer; display:flex; align-items:center; justify-content:center; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

        /* responsive */
        @media (max-width: 768px) { .analytics-layout { grid-template-columns: 1fr; } .header-strip { padding: 15px; margin: -20px -20px 20px -20px; border-radius: 0 0 20px 20px; } }
      `}</style>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function StarRating({ label, value, onChange, disabled }) {
  return (
    <div style={{
      textAlign: 'center',
      background: '#fff',
      padding: '8px 10px',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '6px',
      minWidth: 0
    }}>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: '700',
        color: '#64748b',
        whiteSpace: 'nowrap'
      }}>{label}</div>

      <div style={{
        display: 'flex',
        gap: '4px',
        flexShrink: 0
      }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => !disabled && onChange(star)}
            style={{
              cursor: disabled ? 'default' : 'pointer',
              fontSize: '1.25rem',
              lineHeight: '1',
              color: star <= value ? '#f59e0b' : '#e2e8f0',
              transition: 'color 0.2s'
            }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, color }) {
  const pct = (Number(value) / 5) * 100;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div className="flex-between" style={{ fontSize: '0.8rem', marginBottom: '4px', fontWeight: '600', color: '#475569' }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s' }}></div>
      </div>
    </div>
  );
}

function Badge({ label, value, color }) {
  const colors = { green: ['#dcfce7', '#166534'], red: ['#fee2e2', '#991b1b'], blue: ['#dbeafe', '#1e40af'] };
  const [bg, text] = colors[color] || colors.blue;
  return (
    <div style={{ background: bg, padding: '6px 10px', borderRadius: '6px', flex: 1, minWidth: '0' }}>
      <div style={{ color: text, opacity: 0.8, fontSize: '0.65rem', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: text, fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
}

function SmallSpinner() {
  return <div className="small-spinner" role="status" aria-label="loading" />;
}

function SkeletonBox({ height = 120 }) {
  return <div className="skeleton skeleton-box" style={{ height }} />;
}
function SkeletonBar(){ return <div className="skeleton skeleton-bar" />; }
function SkeletonReviewCard(){
  return (
    <div className="review-card">
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ width:120 }} className="skeleton" />
        <div style={{ width:60, height:24 }} className="skeleton" />
      </div>
      <div style={{ height:14 }} className="skeleton" />
      <div style={{ height:10, marginTop:8 }} className="skeleton" />
      <div style={{ width:'40%', height:80, marginTop:8 }} className="skeleton" />
    </div>
  );
}

/* Progressive image loader.
   Important: to reset loader when src changes use a key at callsite:
   <ProgressiveImg key={imageUrl} src={imageUrl} /> */
function ProgressiveImg({ src, alt }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // create image and setLoaded when it finishes
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(true);
    return () => {
      img.onload = null;
      img.onerror = null;
    };
    // do NOT setLoaded(false) here — parent should change key to reset when needed
  }, [src]);

  return (
    <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', background:'#f8fafc' }}>
      {!loaded && <div className="skeleton" style={{ height: 160 }} />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          width: '100%',
          display: loaded ? 'block' : 'none',
          objectFit: 'cover',
          maxHeight: 320,
          animation: loaded ? 'fadeIn 0.35s ease' : 'none'
        }}
      />
    </div>
  );
}

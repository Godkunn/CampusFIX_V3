import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Star, TrendingUp, Camera, User, Lock, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function MessRating() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(user.role === 'student' ? 'rate' : 'analytics');
  const [analytics, setAnalytics] = useState(null);
  const [selectedMess, setSelectedMess] = useState('1st Year Mess'); 
  const [preview, setPreview] = useState(null);
  
  // Custom Popup State
  const [showPopup, setShowPopup] = useState({ open: false, type: '', msg: '' });

  // Countdown State
  const [timeLeft, setTimeLeft] = useState("");

  // Form State
  const [form, setForm] = useState({ 
    mess_name: '', hygiene: 0, taste: 0, quality: 0, 
    review: '', suggestions: '', image_data: '' 
  });

  const MESSES = ["1st Year Mess", "Veg Mess", "Eastern Mess", "Northern Mess", "Southern Mess"];

  // --- 1. OPTIMIZED LOCK STATE (Lazy Init to fix useEffect error) ---
  const [isLocked, setIsLocked] = useState(() => {
    if (user.role !== 'student') return false;
    const lastSubmission = localStorage.getItem('lastMessSubmission');
    if (!lastSubmission) return false;
    
    const lastDate = new Date(parseInt(lastSubmission));
    const now = new Date();
    const daysSince = (now - lastDate) / (1000 * 60 * 60 * 24);
    
    // Unlock if > 7 days
    if (daysSince >= 7) {
       localStorage.removeItem('lastMessSubmission');
       return false;
    }
    return true; 
  });

  // --- 2. COUNTDOWN TIMER ---
  useEffect(() => {
    if (!isLocked) return; 

    const timer = setInterval(() => {
      const now = new Date();
      const nextSunday = new Date();
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      nextSunday.setHours(23, 59, 59, 999); 

      const diff = nextSunday - now;
      if (diff > 0) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      } else {
        setTimeLeft("Unlocking...");
        setIsLocked(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isLocked]);

  // --- 3. ANALYTICS LOADER ---
  const loadAnalytics = useCallback(async () => {
    try {
      // In real backend, this would fetch actual data
      const res = await api.get(`/mess/analytics?mess=${selectedMess}`);
      setAnalytics(res.data);
    } catch { 
      // Fallback Dummy Data for UI Demo (Remove this in production)
      setAnalytics({
          sentiment: "Positive",
          total: 124,
          action_item: "Students reported undercooked rice. Inspect rice boiler.",
          avg: { hygiene: 4.2, taste: 3.5, quality: 4.0, overall: 3.9 },
          reviews: [
              { rating: 2, review: "Rice was raw", suggestion: "Cook longer", image: null },
              { rating: 5, review: "Paneer was great!", suggestion: "", image: null }
          ]
      });
    }
  }, [selectedMess]);

  useEffect(() => {
    if (activeTab === 'analytics') {
        loadAnalytics();
    }
  }, [activeTab, loadAnalytics]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if(file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image_data: reader.result });
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(form.hygiene === 0) {
        setShowPopup({ open: true, type: 'error', msg: "Please rate all star categories!" });
        return;
    }
    
    try {
      await api.post('/mess/rate', form);
      localStorage.setItem('lastMessSubmission', Date.now().toString());
      setIsLocked(true);
      setShowPopup({ open: true, type: 'success', msg: "Feedback Submitted! Locked until next week." });
      setForm({ mess_name: '', hygiene: 0, taste: 0, quality: 0, review: '', suggestions: '', image_data: '' });
      setPreview(null);
    } catch (err) {
      setShowPopup({ open: true, type: 'error', msg: err.response?.data?.detail || "Submission failed" });
    }
  };

  return (
    <div className="container fade-in">
      
      {/* --- POPUP --- */}
      {showPopup.open && (
        <div className="modal-overlay" onClick={() => setShowPopup({ ...showPopup, open: false })}>
            <div className="glass-panel modal-content rgb-border" onClick={e => e.stopPropagation()}>
                <div className={`popup-icon ${showPopup.type}`}>
                    {showPopup.type === 'success' ? <CheckCircle size={40} /> : <AlertCircle size={40} />}
                </div>
                <h2 className="popup-title">{showPopup.type === 'success' ? 'Success!' : 'Error'}</h2>
                <p className="popup-msg">{showPopup.msg}</p>
                <button onClick={() => setShowPopup({ ...showPopup, open: false })} className="btn-grad popup-btn">Close</button>
            </div>
        </div>
      )}

      {/* Header Strip */}
      <div className="header-strip glass-panel">
        <h1 className="header-title">🍔 Mess Quality Monitor</h1>
        <p className="header-subtitle">
          {user.role === 'student' 
            ? 'Weekly feedback decides menu & contracts.' 
            : 'Real-time Quality & Sentiment Dashboard.'}
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

      {/* --- STUDENT RATING FORM --- */}
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
                  <select className="glass-input" value={form.mess_name} onChange={e => setForm({...form, mess_name: e.target.value})} required disabled={isLocked}>
                    <option value="">Choose Mess...</option>
                    {MESSES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="form-group">
                   <label className="label-text">2. Rate Quality</label>
                   <div className="rating-grid mb-3">
                      <StarRating label="Hygiene" value={form.hygiene} onChange={v => setForm({...form, hygiene: v})} disabled={isLocked} />
                      <StarRating label="Taste" value={form.taste} onChange={v => setForm({...form, taste: v})} disabled={isLocked} />
                      <StarRating label="Quality" value={form.quality} onChange={v => setForm({...form, quality: v})} disabled={isLocked} />
                   </div>
                </div>

                <div className="form-group">
                    <label className="label-text">3. Detailed Review (Optional)</label>
                    <textarea className="glass-input" rows="2" placeholder="Rice was undercooked..." value={form.review} onChange={e => setForm({...form, review: e.target.value})} disabled={isLocked} />
                </div>

                <div className="form-group">
                    <label className="label-text">4. Suggestions (Optional)</label>
                    <textarea className="glass-input" rows="2" placeholder="Add more fruits..." value={form.suggestions} onChange={e => setForm({...form, suggestions: e.target.value})} disabled={isLocked} />
                </div>

                <div className="form-group mb-4">
                  <label className="label-text">5. Photo Evidence</label>
                  <div onClick={() => !isLocked && document.getElementById('messImg').click()} className="upload-box" style={{ backgroundImage: preview ? `url(${preview})` : 'none', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
                    {!preview && <div className="upload-placeholder"><Camera size={18} /> Upload Photo</div>}
                  </div>
                  <input id="messImg" type="file" hidden onChange={handleImage} disabled={isLocked} />
                </div>

                <button className="btn-grad submit-btn" disabled={isLocked}>
                    {isLocked ? 'Submitted' : 'Submit Rating'}
                </button>
              </form>
          </div>
        </div>
      )}

      {/* --- ADMIN ANALYTICS DASHBOARD --- */}
      {activeTab === 'analytics' && user.role !== 'student' && analytics && (
        <div className="analytics-layout fade-in">
          
          <div className="analytics-col">
            <div className="glass-panel p-3 mb-3">
              <label className="label-text">Select Mess</label>
              <select className="glass-input mb-0" value={selectedMess} onChange={e => setSelectedMess(e.target.value)}>
                {MESSES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="glass-panel ai-insight-card">
              <div className="ai-bg-icon">🤖</div>
              <h3 className="card-header">
                <TrendingUp size={18} color="#8b5cf6" /> AI Analysis
              </h3>
              <div className="flex-gap mb-3">
                <Badge label="Sentiment" value={analytics.sentiment} color={analytics.sentiment.includes('Positive') ? 'green' : 'red'} />
                <Badge label="Sample" value={`${analytics.total}`} color="blue" />
              </div>
              <div className="action-box">
                <strong>💡 Action Item:</strong> {analytics.action_item}
              </div>
            </div>

            <div className="glass-panel">
              <h3 className="card-header mb-4">📈 Metrics</h3>
              <ProgressBar label="Hygiene" value={analytics.avg.hygiene} color="#10b981" />
              <ProgressBar label="Taste" value={analytics.avg.taste} color="#f59e0b" />
              <ProgressBar label="Quality" value={analytics.avg.quality} color="#3b82f6" />
              <div className="overall-score">
                {analytics.avg.overall}<span style={{fontSize:'1rem', color:'#64748b'}}>/5.0</span>
              </div>
            </div>
          </div>

          <div className="glass-panel reviews-panel">
            <div className="flex-between mb-3">
              <h3 className="card-header m-0">💬 Voices</h3>
              <span className="tiny-text">Anonymized</span>
            </div>
            <div className="reviews-list">
              {analytics.reviews.length > 0 ? analytics.reviews.map((r, i) => (
                <div key={i} className="review-card">
                  <div className="flex-between mb-2">
                    <div className="reviewer-tag">
                      <User size={14} /> Verified
                    </div>
                    <span className="rating-pill">{r.rating.toFixed(1)} ★</span>
                  </div>
                  {r.review && <div className="review-text">"{r.review}"</div>}
                  {r.suggestion && <div className="suggestion-text">💡 {r.suggestion}</div>}
                  {r.image && <img src={r.image} alt="Proof" className="review-img" />}
                </div>
              )) : (
                <div className="empty-state">No detailed reviews yet.</div>
              )}
            </div>
          </div>

        </div>
      )}

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
        .upload-box { height: 100px; border: 2px dashed #cbd5e1; border-radius: 12px; display: flex; alignItems: center; justifyContent: center; background-position: center; background-size: cover; background-color: #f8fafc; }
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

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

        /* PHONE RESPONSIVE */
        @media (max-width: 768px) {
            .analytics-layout { grid-template-columns: 1fr; }
            .header-strip { padding: 15px; margin: -20px -20px 20px -20px; border-radius: 0 0 20px 20px; }
            .header-title { font-size: 1.2rem; }
            .header-subtitle { font-size: 0.7rem; }
            .tab-btn { font-size: 0.85rem; padding: 8px 16px; }
            .form-container { padding: 15px; }
            .rating-grid { grid-template-columns: 1fr; gap: 8px; }
            .label-text { font-size: 0.75rem; }
            .glass-input { font-size: 0.85rem; padding: 8px; }
            .form-group { margin-bottom: 15px; }
        }
      `}</style>
    </div>
  );
}

// Sub-Components
function StarRating({ label, value, onChange, disabled }) {
  return (
    <div style={{ textAlign: 'center', background: '#fff', padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft:'15px', paddingRight:'15px' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>{label}</div>
      <div style={{ display: 'flex', gap: '5px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} onClick={() => !disabled && onChange(star)} style={{ cursor: disabled ? 'default' : 'pointer', fontSize: '1.4rem', lineHeight: '1', color: star <= value ? '#f59e0b' : '#e2e8f0', transition: 'color 0.2s' }}>★</span>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, color }) {
  const pct = (value / 5) * 100;
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

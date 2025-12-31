import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Star, TrendingUp, Camera, User, Lock, Clock } from 'lucide-react';

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

  // --- 1. CALCULATE COUNTDOWN TO SUNDAY MIDNIGHT ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const nextSunday = new Date();
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
      nextSunday.setHours(23, 59, 59, 999); // Sunday Midnight

      const diff = nextSunday - now;
      if (diff > 0) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      } else {
        setTimeLeft("Unlocking...");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 2. ANALYTICS LOADER ---
  const loadAnalytics = useCallback(async () => {
    try {
      const res = await api.get(`/mess/analytics?mess=${selectedMess}`);
      setAnalytics(res.data);
    } catch { console.error("Failed to load"); }
  }, [selectedMess]);

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics();
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
      setShowPopup({ open: true, type: 'success', msg: "Thanks for being a Campus Hero! 🛡️ Your feedback helps us keep hygiene high. See you next Sunday!" });
      setForm({ mess_name: '', hygiene: 0, taste: 0, quality: 0, review: '', suggestions: '', image_data: '' });
      setPreview(null);
    } catch (err) {
      setShowPopup({ open: true, type: 'error', msg: err.response?.data?.detail || "Submission failed" });
    }
  };

  return (
    <div className="container fade-in">
      
      {/* --- RGB LOOP POPUP MODAL --- */}
      {showPopup.open && (
        <div className="modal-overlay" onClick={() => setShowPopup({ ...showPopup, open: false })}>
            <div className="glass-panel modal-content rgb-border" onClick={e => e.stopPropagation()} style={{ 
                textAlign: 'center', position: 'relative', padding: '40px', background: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', overflow: 'hidden' 
            }}>
                <div style={{ 
                    width: '80px', height: '80px', margin: '0 auto 20px', 
                    borderRadius: '50%', background: showPopup.type === 'success' ? '#dcfce7' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem'
                }}>
                    {showPopup.type === 'success' ? '🎉' : '⚠️'}
                </div>
                <h2 style={{ color: '#1e293b', marginBottom: '10px', fontSize: '1.5rem' }}>
                    {showPopup.type === 'success' ? 'Submission Successful!' : 'Action Required'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5', marginBottom: '25px' }}>{showPopup.msg}</p>
                <button onClick={() => setShowPopup({ ...showPopup, open: false })} className="btn-grad" style={{ width: '100%', fontSize: '1rem', padding: '12px' }}>Got it!</button>
            </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '5px' }}>🍔 Mess Quality Monitor</h1>
        <p style={{ opacity: 0.95, fontSize: '1rem' }}>
          {user.role === 'student' ? 'Your weekly feedback decides the menu & contract renewal.' : 'Real-time quality metrics and student sentiment.'}
        </p>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          {user.role === 'student' && (
            <button onClick={() => setActiveTab('rate')} className={`btn-ghost ${activeTab === 'rate' ? 'bg-white text-orange-600' : 'text-white'}`} style={{ borderColor: 'white' }}>
              ⭐ Rate This Week
            </button>
          )}
          {user.role !== 'student' && (
              <button onClick={() => setActiveTab('analytics')} className={`btn-ghost ${activeTab === 'analytics' ? 'bg-white text-orange-600' : 'text-white'}`} style={{ borderColor: 'white' }}>
                📊 AI Analytics
              </button>
          )}
        </div>
      </div>

      {/* --- STUDENT RATING FORM --- */}
      {activeTab === 'rate' && user.role === 'student' && (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#ea580c', margin: 0 }}>🗳️ Weekly Feedback</h2>
            <span className="badge" style={{ background: '#ecfdf5', color: '#059669' }}>🔒 Anonymous</span>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label className="label-text">Select Mess</label>
              <select className="glass-input" value={form.mess_name} onChange={e => setForm({...form, mess_name: e.target.value})} required>
                <option value="">Choose Mess...</option>
                {MESSES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="grid-3" style={{ gap: '15px', marginBottom: '25px' }}>
              <StarRating label="Hygiene" value={form.hygiene} onChange={v => setForm({...form, hygiene: v})} />
              <StarRating label="Taste" value={form.taste} onChange={v => setForm({...form, taste: v})} />
              <StarRating label="Quality" value={form.quality} onChange={v => setForm({...form, quality: v})} />
            </div>

            <label className="label-text">Detailed Review (Optional)</label>
            <textarea className="glass-input" rows="2" placeholder="e.g. Rice was undercooked..." value={form.review} onChange={e => setForm({...form, review: e.target.value})} />

            <label className="label-text">Suggestions (Optional)</label>
            <textarea className="glass-input" rows="2" placeholder="e.g. Add more fruits" value={form.suggestions} onChange={e => setForm({...form, suggestions: e.target.value})} />

            <div style={{ marginBottom: '20px' }}>
              <label className="label-text">Photo Evidence (Optional)</label>
              <div onClick={() => document.getElementById('messImg').click()} className="hover-card" style={{ height: '100px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: preview ? `url(${preview}) center/cover` : 'rgba(255,255,255,0.5)' }}>
                {!preview && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b' }}><Camera size={20} /> Upload Plate Photo</div>}
              </div>
              <input id="messImg" type="file" hidden onChange={handleImage} />
            </div>

            <button className="btn-grad" style={{ width: '100%', background: 'linear-gradient(to right, #f97316, #ea580c)' }}>Submit Rating</button>
            
            {/* 💣 TIMER BOMB CLOCK */}
            <div style={{ textAlign: 'center', marginTop: '15px', padding: '10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                <Clock size={18} className="animate-pulse" /> 
                <span>Next Unlock: {timeLeft}</span>
            </div>
          </form>
        </div>
      )}

      {/* --- OFFICIAL AI DASHBOARD (ADMIN ONLY) --- */}
      {activeTab === 'analytics' && user.role !== 'student' && analytics && (
        <div className="grid-2" style={{ alignItems: 'start', gap: '25px' }}>
          
          <div style={{ display: 'grid', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '15px' }}>
              <label className="label-text">Select Mess for Report</label>
              <select className="glass-input" style={{ marginBottom: 0 }} value={selectedMess} onChange={e => setSelectedMess(e.target.value)}>
                {MESSES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="glass-panel" style={{ borderLeft: '5px solid #8b5cf6', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '5rem', opacity: 0.05 }}>🤖</div>
              <h3 style={{ marginTop: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="#8b5cf6" /> AI-Generated Insight
              </h3>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <Badge label="Sentiment" value={analytics.sentiment} color={analytics.sentiment.includes('Excellent') ? 'green' : 'red'} />
                <Badge label="Sample Size" value={`${analytics.total} Students`} color="blue" />
              </div>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', fontSize: '0.9rem', color: '#475569' }}>
                <strong style={{ color: '#1e293b' }}>Action Item:</strong> {analytics.action_item}
              </div>
            </div>

            <div className="glass-panel">
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b' }}>📈 Performance Metrics</h3>
              <ProgressBar label="Hygiene Standards" value={analytics.avg.hygiene} color="#10b981" />
              <ProgressBar label="Food Taste" value={analytics.avg.taste} color="#f59e0b" />
              <ProgressBar label="Ingredient Quality" value={analytics.avg.quality} color="#3b82f6" />
              <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '2rem', fontWeight: '800', color: '#1e293b' }}>
                {analytics.avg.overall}<span style={{ fontSize: '1rem', color: '#64748b' }}>/5.0</span>
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <div className="flex-between" style={{ marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b' }}>💬 Student Voices</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Anonymized Data</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto' }}>
              {analytics.reviews.length > 0 ? analytics.reviews.map((r, i) => (
                <div key={i} style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
                      <User size={16} /> Verified Student
                    </div>
                    <span className="badge" style={{ background: '#fffbeb', color: '#b45309' }}>{r.rating.toFixed(1)} ★</span>
                  </div>
                  {r.review && <div style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '5px' }}>"{r.review}"</div>}
                  {r.suggestion && <div style={{ fontSize: '0.85rem', color: '#059669', fontStyle: 'italic' }}>💡 {r.suggestion}</div>}
                  {r.image && <img src={r.image} alt="Proof" style={{ marginTop: '10px', borderRadius: '8px', width: '100%', maxHeight: '150px', objectFit: 'cover' }} />}
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No detailed reviews yet this week.</div>
              )}
            </div>
          </div>

        </div>
      )}

      <style>{`
        .label-text { display: block; margin-bottom: 5px; font-weight: 600; color: #64748b; font-size: 0.8rem; text-transform: uppercase; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .modal-content { animation: popIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28); width: 90%; max-width: 400px; }
        
        /* RGB BORDER ANIMATION */
        .rgb-border {
            position: relative;
        }
        .rgb-border::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            border-radius: 20px; 
            padding: 3px; 
            background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            background-size: 400%;
            animation: glowing 20s linear infinite;
            pointer-events: none;
        }

        @keyframes glowing {
            0% { background-position: 0 0; }
            50% { background-position: 400% 0; }
            100% { background-position: 0 0; }
        }
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

// Sub-Components
function StarRating({ label, value, onChange }) {
  return (
    <div style={{ textAlign: 'center', background: '#fff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '5px' }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} onClick={() => onChange(star)} style={{ cursor: 'pointer', fontSize: '1.4rem', color: star <= value ? '#f59e0b' : '#e2e8f0', transition: 'color 0.2s' }}>★</span>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, color }) {
  const pct = (value / 5) * 100;
  return (
    <div style={{ marginBottom: '15px' }}>
      <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '5px', fontWeight: '600', color: '#475569' }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.5s' }}></div>
      </div>
    </div>
  );
}

function Badge({ label, value, color }) {
  const colors = { green: ['#dcfce7', '#166534'], red: ['#fee2e2', '#991b1b'], blue: ['#dbeafe', '#1e40af'] };
  const [bg, text] = colors[color] || colors.blue;
  return (
    <div style={{ background: bg, padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', flex: 1 }}>
      <div style={{ color: text, opacity: 0.8, fontSize: '0.7rem' }}>{label}</div>
      <div style={{ color: text, fontWeight: '700', fontSize: '0.95rem' }}>{value}</div>
    </div>
  );
}
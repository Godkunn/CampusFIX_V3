import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Lock, X, Camera, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react'; 

export default function Issues() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('track'); 
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Local UI State
  const [areaType, setAreaType] = useState('Hostel'); 
  const [commentText, setCommentText] = useState('');
  const [ratingData, setRatingData] = useState({ rating: 5, review: '' });
  const [toast, setToast] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '', category: 'Power Failure', sub_location: '', specific_location: '', 
    description: '', priority: 'High', image_data: ''
  });

  // --- DATA LISTS ---
  const LOCATIONS = {
    'Hostel': ["Aryabhatta", "RNT", "Gargi", "Bhaskara", "Other"],
    'Mess': ["1st Year Mess", "Veg Mess", "Eastern Mess", "Northern Mess", "Southern Mess"],
    'Academic': ["Electrical Dept", "ECE Dept", "CSE Dept", "Civil/Mechanical Dept", "Library", "Admin Block"]
  };

  const CATEGORIES = {
    "High": ["Power Failure", "Short Circuit", "Water Leakage", "Fire Safety", "Medical Emergency"],
    "Medium": ["LAN/WiFi Issue", "Fan/Light Fault", "Door/Window Broken", "Sanitation/Cleaning"],
    "Low": ["Furniture Repair", "Lost Item", "General Maintenance"]
  };

  const ALL_CATEGORIES = [...CATEGORIES.High, ...CATEGORIES.Medium, ...CATEGORIES.Low];
  
  // DYNAMIC FILTERS
  const FILTERS = [
    "All", 
    ...(user.role === 'student' ? ["My Tickets"] : []), 
    "Pending", "Solved", "High Priority", 
    "Hostel", "Mess", "Academic", 
    ...ALL_CATEGORIES 
  ];

  // --- AUTO-FILL HOSTEL LOGIC ---
  useEffect(() => {
    if (activeTab === 'report') {
      if (areaType === 'Hostel' && user.role === 'student' && user.hostel) {
        setForm(prev => ({ ...prev, sub_location: user.hostel }));
      } else {
        setForm(prev => ({ ...prev, sub_location: '' }));
      }
    }
  }, [areaType, activeTab, user]);

  const loadIssues = useCallback(async () => {
    try {
      const res = await api.get('/issues');
      setIssues(res.data);
      if (selectedTicket) {
        const updated = res.data.find(i => i.id === selectedTicket.id);
        if(updated) setSelectedTicket(updated);
      }
    } catch { 
      console.error("Load failed"); 
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (activeTab === 'track') loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); 

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const determinePriority = (cat) => {
    if (CATEGORIES.High.includes(cat)) return "High";
    if (CATEGORIES.Medium.includes(cat)) return "Medium";
    return "Low";
  };

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setForm({ ...form, category: cat, priority: determinePriority(cat) });
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if(file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image_data: reader.result });
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setForm({ ...form, image_data: '' });
    setPreviewImage(null);
  }

  const handleReport = async (e) => {
    e.preventDefault();
    try {
      if(!form.sub_location) { showToast('error', "Please select a location"); return; }
      if(!form.image_data) { showToast('error', "Please upload an image evidence."); return; }

      const finalForm = { ...form, priority: determinePriority(form.category) };
      
      await api.post('/issues', finalForm);
      showToast('success', `Ticket Created! Priority: ${finalForm.priority}`);
      
      setForm({ title: '', category: 'Power Failure', sub_location: '', specific_location: '', description: '', priority: 'High', image_data: '' });
      setPreviewImage(null);
      setActiveTab('track');
      loadIssues();
    } catch { showToast('error', "Failed to submit ticket."); }
  };

  const handleComment = async () => {
    if(!commentText.trim()) return;
    await api.post(`/issues/${selectedTicket.id}/comments`, { text: commentText });
    setCommentText('');
    loadIssues();
  };

  const handleRate = async () => {
    await api.patch(`/issues/${selectedTicket.id}/rate`, ratingData);
    loadIssues();
    showToast('success', "Feedback submitted!");
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/issues/${id}/status`, { status });
      loadIssues();
      showToast('success', `Status updated to ${status}`);
    } catch { showToast('error', "Update failed"); }
  };

  const deleteTicket = async (id) => {
    if(confirm("Withdraw this ticket permanently?")) {
      try {
        await api.delete(`/issues/${id}`);
        setSelectedTicket(null);
        loadIssues();
        showToast('success', "Ticket Withdrawn");
      } catch { showToast('error', "Could not delete ticket"); }
    }
  };

  const getSLA = (issue) => {
    if (issue.status === 'Solved') return { t: "RESOLVED", c: "#10b981", icon: "✅" }; 
    const hours = (new Date() - new Date(issue.created_at)) / 36e5;
    const limit = issue.priority === 'High' ? 24 : issue.priority === 'Medium' ? 48 : 72;
    const left = limit - hours;
    if(left < 0) return { t: "OVERDUE", c: "#ef4444", icon: "🔥" }; 
    return { t: `${Math.ceil(left)}h Left`, c: "#f59e0b", icon: "⏱️" }; 
  };

  const filteredIssues = issues.filter(i => {
    if (filter === 'All') return true;
    if (filter === 'My Tickets') return i.owner_name === user.full_name;
    if (['Pending', 'Solved'].includes(filter)) return i.status === filter;
    if (filter === 'High Priority') return i.priority === 'High';
    
    if (filter === 'Hostel' && LOCATIONS.Hostel.includes(i.sub_location)) return true;
    if (filter === 'Mess' && LOCATIONS.Mess.includes(i.sub_location)) return true;
    if (filter === 'Academic' && LOCATIONS.Academic.includes(i.sub_location)) return true;

    return i.category === filter;
  });

  return (
    <div className="container fade-in" style={{ position: 'relative' }}>
      
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.9)', borderRadius: '16px',
          padding: '15px 25px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderLeft: `5px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
          animation: 'slideInRight 0.3s ease-out', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '1.2rem' }}>{toast.type === 'success' ? '🎉' : '⚠️'}</span>
          <span style={{ fontWeight: '600', color: '#1e293b' }}>{toast.msg}</span>
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ background: 'white', display: 'inline-flex', padding: '5px', borderRadius: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setActiveTab('track')} className={`btn-ghost ${activeTab === 'track' ? 'btn-grad' : ''}`} style={{ border: 'none' }}>📋 Public Feed</button>
          {user.role === 'student' && <button onClick={() => setActiveTab('report')} className={`btn-ghost ${activeTab === 'report' ? 'btn-grad' : ''}`} style={{ border: 'none' }}>➕ Report New</button>}
        </div>
      </div>

      {activeTab === 'report' && (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#4f46e5', margin: 0 }}>📝 New Complaint</h2>
            <span className={`badge ${form.priority === 'High' ? 'badge-defected' : 'badge-pending'}`}>
              Auto-Priority: {form.priority}
            </span>
          </div>

          <form onSubmit={handleReport}>
            <div className="grid-2" style={{ gap: '15px' }}>
              <div>
                <label className="label-text">Area Type</label>
                <select className="glass-input" value={areaType} onChange={e => setAreaType(e.target.value)}>
                  <option value="Hostel">Hostel</option>
                  <option value="Mess">Mess</option>
                  <option value="Academic">Academic / Dept</option>
                </select>
              </div>
              
              <div>
                <label className="label-text">Location Name</label>
                {areaType === 'Hostel' && user.role === 'student' && user.hostel ? (
                  <div style={{ position: 'relative' }}>
                    <select className="glass-input" value={user.hostel} disabled style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}>
                      <option>{user.hostel}</option>
                    </select>
                    <div style={{ position: 'absolute', right: '10px', top: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                      <Lock size={14} /> Locked
                    </div>
                  </div>
                ) : (
                  <select className="glass-input" value={form.sub_location} onChange={e => setForm({...form, sub_location: e.target.value})} required>
                    <option value="">Select {areaType}...</option>
                    {LOCATIONS[areaType].map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="grid-2" style={{ gap: '15px' }}>
              <div>
                <label className="label-text">Issue Category</label>
                <select className="glass-input" value={form.category} onChange={handleCategoryChange}>
                  {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label-text">Specific Spot</label>
                <input className="glass-input" placeholder="e.g. Room 304, Lab 2" value={form.specific_location} onChange={e => setForm({...form, specific_location: e.target.value})} required />
              </div>
            </div>

            <label className="label-text">Description</label>
            <textarea className="glass-input" rows="3" placeholder="Describe the problem clearly..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />

            <div style={{ marginBottom: '20px' }}>
              <label className="label-text">Evidence (Mandatory)</label>
              <div 
                onClick={() => document.getElementById('fileInput').click()}
                style={{
                  background: previewImage ? `url(${previewImage}) center/cover` : 'rgba(255,255,255,0.5)',
                  height: '120px', borderRadius: '12px', border: '2px dashed #cbd5e1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease'
                }}
                className="hover-card"
              >
                {!previewImage && (
                  <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <Camera size={24} style={{ marginBottom: '5px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Click to Upload Image</div>
                  </div>
                )}
                {previewImage && (
                  <div onClick={(e) => { e.stopPropagation(); removeImage(); }} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}>
                    <X size={16} color="white" />
                  </div>
                )}
                <input id="fileInput" type="file" hidden accept="image/*" onChange={handleImage} />
              </div>
            </div>

            <button className="btn-grad" style={{ width: '100%' }}>🚀 Submit Complaint</button>
          </form>
        </div>
      )}

      {activeTab === 'track' && (
        <>
          <div style={{ marginBottom: '25px', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '5px', scrollbarWidth: 'none' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} className="btn-ghost" style={{ marginRight: '10px', background: filter === f ? '#e0e7ff' : 'rgba(255,255,255,0.7)', border: filter === f ? '1px solid #4f46e5' : '1px solid #cbd5e1', color: filter === f ? '#4f46e5' : '#64748b', fontWeight: filter === f ? '700' : '500', borderRadius: '20px', padding: '6px 16px', fontSize: '0.85rem' }}>{f}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredIssues.map(issue => {
              const sla = getSLA(issue);
              const isMine = issue.owner_name === user.full_name;
              return (
                <div key={issue.id} className="glass-panel hover-card" onClick={() => setSelectedTicket(issue)} style={{ cursor: 'pointer', borderLeft: `5px solid ${issue.priority === 'High' ? '#ef4444' : '#22c55e'}` }}>
                  <div className="flex-between">
                    <span className="badge" style={{ background: issue.status === 'Solved' ? '#dcfce7' : '#fef9c3', color: issue.status === 'Solved' ? '#166534' : '#854d0e' }}>{issue.status}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: sla.c }}>{sla.icon} {sla.t}</span>
                  </div>
                  
                  <h3 style={{ fontSize: '1.1rem', margin: '10px 0', color: '#1e293b' }}>{issue.title}</h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                    <span>📍 {issue.sub_location}</span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* --- ADMIN ONLY: VIEW STUDENT CREDIT SCORE ON CARD --- */}
                        {user.role !== 'student' && issue.owner_credit_score !== undefined && (
                            <span style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: '700', 
                                color: issue.owner_credit_score < 0 ? '#ef4444' : '#059669',
                                display: 'flex', alignItems: 'center', gap: '2px',
                                background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0'
                            }}>
                                {issue.owner_credit_score < 0 ? <AlertTriangle size={10}/> : <ShieldCheck size={10}/>}
                                {issue.owner_credit_score}
                            </span>
                        )}

                        {issue.rating ? (
                        <span style={{ color: '#f59e0b', fontWeight: '700' }}>⭐ {issue.rating}</span>
                        ) : (
                        <span style={{ fontWeight: isMine ? '700' : '400', color: isMine ? '#4f46e5' : 'inherit' }}>
                            {isMine ? '👤 You' : `👤 ${issue.owner_name}`}
                        </span>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
            <button className="btn-close" onClick={() => setSelectedTicket(null)}>
              <X size={24} />
            </button>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '15px' }}>
              <div className="flex-between" style={{alignItems: 'flex-start'}}>
                  <h2 style={{ margin: 0, color: '#1e293b' }}>{selectedTicket.title}</h2>
                  
                  {/* --- STUDENT CREDIT SCORE (VISIBLE TO ALL) --- */}
                  {selectedTicket.owner_credit_score !== undefined && (
                      <div style={{
                          fontSize: '0.75rem',
                          background: '#f1f5f9',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '600',
                          color: selectedTicket.owner_credit_score < 0 ? '#ef4444' : '#059669'
                      }}>
                          {selectedTicket.owner_credit_score < 0 ? <AlertTriangle size={12}/> : <ShieldCheck size={12}/>}
                          Trust Score: {selectedTicket.owner_credit_score}
                      </div>
                  )}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px', fontSize: '0.85rem', color: '#64748b' }}><span>Ticket #{selectedTicket.id}</span><span>•</span><span>{new Date(selectedTicket.created_at).toLocaleString()}</span></div>
            </div>
            <div className="grid-2" style={{ marginBottom: '20px', gap: '10px' }}>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><div className="label-text">Status</div><b style={{ color: selectedTicket.status === 'Solved' ? '#166534' : '#d97706' }}>{selectedTicket.status.toUpperCase()}</b></div>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><div className="label-text">Priority</div><b style={{ color: selectedTicket.priority === 'High' ? '#ef4444' : '#3b82f6' }}>{selectedTicket.priority}</b></div>
            </div>
            <p style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '12px', color: '#475569' }}>{selectedTicket.description}</p>
            {selectedTicket.image_data && <div style={{ marginBottom: '20px' }}><label className="label-text">Attached Evidence</label><img src={selectedTicket.image_data} alt="Evidence" style={{ width: '100%', borderRadius: '12px', maxHeight: '200px', objectFit: 'cover' }} /></div>}
            
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '10px' }}>💬 Discussion</h4>
              <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                {selectedTicket.comments?.length > 0 ? selectedTicket.comments.map(c => (<div key={c.id} style={{ marginBottom: '8px', fontSize: '0.85rem' }}><span style={{ fontWeight: '700', color: '#4f46e5' }}>{c.user_name}: </span>{c.text}</div>)) : <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>No comments yet.</span>}
              </div>
              {selectedTicket.status !== 'Solved' && (<div style={{ display: 'flex', marginTop: '10px', gap: '5px' }}><input className="glass-input" placeholder="Type a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} style={{ marginBottom: 0 }} /><button onClick={handleComment} className="btn-grad" style={{ padding: '0 20px' }}>Send</button></div>)}
            </div>

            {selectedTicket.status === 'Solved' && (
              <div style={{ marginTop: '20px', padding: '15px', background: '#ecfdf5', borderRadius: '12px', textAlign: 'center' }}>
                {selectedTicket.rating ? (<div><div style={{ fontSize: '1.5rem' }}>{"⭐".repeat(selectedTicket.rating)}</div><div style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#065f46' }}>"{selectedTicket.review}"</div></div>) : user.role === 'student' && selectedTicket.owner_name === user.full_name ? (<><h4 style={{ margin: 0, color: '#065f46' }}>Rate Service</h4><select className="glass-input" style={{ width: 'auto', display: 'inline-block', margin: '10px' }} onChange={e => setRatingData({...ratingData, rating: parseInt(e.target.value)})}>{[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Star</option>)}</select><button onClick={handleRate} className="btn-grad" style={{ background: '#059669' }}>Submit</button></>) : <div style={{ color: '#059669', fontWeight: '600' }}>Issue Resolved ✅</div>}
              </div>
            )}

            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              
              {/* OFFICIAL ACTIONS */}
              {user.role !== 'student' && (
                <>
                  <button onClick={() => updateStatus(selectedTicket.id, 'Solved')} className="btn-grad">Mark Solved (+1)</button>
                  <button 
                      onClick={() => updateStatus(selectedTicket.id, 'Defected')} 
                      className="btn-ghost" 
                      style={{ color: '#ef4444', borderColor: '#ef4444' }}
                  >
                      Flag Defective (-0.5)
                  </button>
                  <button onClick={() => updateStatus(selectedTicket.id, 'In Progress')} className="btn-ghost">
                    {selectedTicket.status === 'Solved' ? 'Re-open' : 'Start Work'}
                  </button>
                </>
              )}

              {/* STUDENT ACTIONS */}
              {user.role === 'student' && selectedTicket.owner_name === user.full_name && (
                <>
                  {selectedTicket.status !== 'Solved' ? (
                    <button 
                        onClick={() => updateStatus(selectedTicket.id, 'Solved')} 
                        className="btn-ghost" 
                        style={{ color: '#10b981', borderColor: '#10b981' }}
                        title="Self-marking as solved does not increase Trust Score"
                    >
                        ✅ I Solved It
                    </button>
                  ) : (
                    <button onClick={() => updateStatus(selectedTicket.id, 'In Progress')} className="btn-ghost" style={{ color: '#f59e0b', borderColor: '#f59e0b' }}>
                      <RefreshCw size={14} style={{marginRight:'5px'}}/> Re-open Ticket
                    </button>
                  )}
                  
                  <button onClick={() => deleteTicket(selectedTicket.id)} className="btn-ghost" style={{ color: '#ef4444', borderColor: '#ef4444' }}>🗑️ Withdraw</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; } .modal-content { width: 90%; max-width: 500px; max-height: 85vh; overflow-y: auto; padding: 25px; animation: slideUp 0.3s; } .label-text { display: block; margin-bottom: 5px; font-weight: 600; color: #64748b; font-size: 0.8rem; text-transform: uppercase; } .btn-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; opacity: 0.5; } @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
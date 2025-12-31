import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Lock, Edit3, ShieldCheck, AlertTriangle, Camera, Save, X } from 'lucide-react';

export default function Profile() {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // FIX 1: Initialize state directly if 'user' exists
  const [formData, setFormData] = useState(user || {});
  
  const [toast, setToast] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestedHostel, setRequestedHostel] = useState('');

  const ALLOWED_HOSTELS = ["RNT", "Aryabhatta", "Gargi", "Dhalai", "Gomati"];

  // FIX 2: Only update form data if 'user' object reference actually changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, ...user }));
    }
  }, [user]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, profile_pic: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      const res = await api.put('/users/me', formData);
      login(res.data, localStorage.getItem('token'));
      showToast('success', "Profile Updated Successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Update failed:", error);
      showToast('error', "Failed to update profile.");
    }
  };

  const submitHostelRequest = async () => {
    try {
      await api.post('/users/request-hostel', { new_hostel: requestedHostel });
      showToast('success', "Request sent to Admin!");
      setShowRequestModal(false);
      const res = await api.get('/users/me');
      login(res.data, localStorage.getItem('token'));
    } catch (error) {
      console.error("Request failed:", error);
      showToast('error', "Failed to send request.");
    }
  };

  const getTrustColor = (score) => {
    if (score >= 10) return '#10b981'; // Emerald
    if (score >= 5) return '#3b82f6';  // Blue
    if (score >= 0) return '#f59e0b';  // Amber
    return '#ef4444';                  // Red
  };

  return (
    <div className="page-wrapper fade-in">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`glass-toast ${toast.type}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      )}

      {/* Hostel Request Modal */}
      {showRequestModal && (
        <div className="glass-modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="section-title">Request Hostel Change</h3>
            <p className="modal-desc">Select your preferred hostel. Pending Admin approval.</p>

            <select className="glass-input modal-select" value={requestedHostel} onChange={e => setRequestedHostel(e.target.value)}>
              <option value="">Select New Hostel</option>
              {ALLOWED_HOSTELS.filter(h => h !== user.hostel).map(h => <option key={h} value={h}>{h}</option>)}
            </select>

            <button onClick={submitHostelRequest} className="glass-btn primary full-width" disabled={!requestedHostel}>
              Send Request
            </button>
          </div>
        </div>
      )}

      {/* Main Profile Container */}
      <div className="profile-container">
        
        {/* NEW: Wrapper for the rotating thin border around the card */}
        <div className="card-border-wrapper">
          <div className="card-vibgyor-border"></div>
          
          {/* Main Card with Aurora Background INSIDE */}
          <div className="glass-card main-card aurora-card-bg">
            
            {/* Header / Avatar Section */}
            <div className="profile-header">
              
              {/* Avatar with Rotating Ring */}
              <div className="avatar-wrapper-outer">
                <div className="avatar-vibgyor-ring"></div>
                <div className="avatar-container-inner">
                  <img 
                    src={formData.profile_pic || `https://ui-avatars.com/api/?name=${user.full_name}&background=random`} 
                    alt="Profile" 
                    className="avatar-img" 
                  />
                  {isEditing && (
                    <label className="edit-avatar-btn">
                      <Camera size={16} />
                      <input type="file" hidden accept="image/*" onChange={handleImage} />
                    </label>
                  )}
                </div>
              </div>

              <h2 className="user-name">{user.full_name}</h2>
              
              <div className="badge-row">
                <span className="glass-badge role">{user.role}</span>
                {user.role === 'student' && (
                  <span className="glass-badge trust" style={{ color: getTrustColor(user.credit_score || 0), borderColor: getTrustColor(user.credit_score || 0) }}>
                    {user.credit_score < 0 ? <AlertTriangle size={13}/> : <ShieldCheck size={13}/>}
                    Trust Score: {user.credit_score ?? 0}
                  </span>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="info-grid">
              
              <DetailGroup title="Personal Info">
                <DetailItem label="Email" value={user.email} />
                {isEditing && user.role !== 'student' ? (
                  <EditInput label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
                ) : (
                  user.role !== 'student' && <DetailItem label="Phone" value={user.phone} />
                )}
                {user.role !== 'student' && <DetailItem label="Dept" value={user.department} />}
              </DetailGroup>

              {user.role === 'student' && (
                <>
                  <DetailGroup title="Academic">
                    <DetailItem label="Enrollment" value={user.enrollment_no} />
                    {isEditing ? (
                      <EditInput label="Semester" name="semester" value={formData.semester} onChange={handleChange} />
                    ) : (
                      <DetailItem label="Semester" value={user.semester} />
                    )}
                  </DetailGroup>

                  <DetailGroup title="Accommodation">
                    {isEditing ? (
                      <div className="edit-hostel-group">
                        {user.hostel ? (
                            <div className="locked-hostel-display">
                              <div className="locked-row">
                                <span className="val">{user.hostel}</span>
                                <span className="locked-tag"><Lock size={10} /> Locked</span>
                              </div>
                              {user.requested_hostel ? (
                                <div className="status-pending">Pending: {user.requested_hostel}</div>
                              ) : (
                                <div className="req-change-btn" onClick={() => setShowRequestModal(true)}>
                                  Request Change
                                </div>
                              )}
                            </div>
                          ) : (
                            <select name="hostel" value={formData.hostel} onChange={handleChange} className="glass-input">
                              <option value="">Select Hostel</option>
                              {ALLOWED_HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          )}
                          <div className="grid-2-col">
                            <EditInput label="Block" name="block" value={formData.block} onChange={handleChange} />
                            <EditInput label="Room" name="room_no" value={formData.room_no} onChange={handleChange} />
                          </div>
                      </div>
                    ) : (
                      <>
                        <DetailItem label="Hostel" value={user.hostel} />
                        <div className="split-row">
                          <DetailItem label="Block" value={user.block} />
                          <DetailItem label="Room" value={user.room_no} />
                        </div>
                      </>
                    )}
                  </DetailGroup>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="action-footer">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="glass-btn primary">
                    <Save size={16} /> Save
                  </button>
                  <button onClick={() => { setIsEditing(false); setFormData(user); }} className="glass-btn secondary">
                    <X size={16} /> Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="glass-btn ghost">
                  <Edit3 size={16} /> Edit Profile
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        /* --- 1. GENERAL PAGE SETUP --- */
        .page-wrapper {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 15px;
          font-family: 'Inter', sans-serif;
          background: transparent; /* Clean outer background */
        }
        
        .profile-container {
          width: 100%;
          max-width: 650px;
        }

        /* --- 2. ROTATING BORDER WRAPPER --- */
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .card-border-wrapper {
          position: relative;
          padding: 3px; /* Thickness of the rotating border */
          border-radius: 26px; /* Slightly larger than card */
          overflow: hidden;
          background: transparent;
        }

        .card-vibgyor-border {
          position: absolute;
          inset: -50%; /* Extend far beyond to ensure coverage during rotation */
          width: 200%;
          height: 200%;
          background: conic-gradient(
            transparent, 
            #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, 
            transparent 70%
          );
          animation: spinSlow 15s linear infinite;
          top: -50%; 
          left: -50%;
        }

        /* --- 3. MAIN CARD (Aurora BG Inside) --- */
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .main-card {
          position: relative;
          z-index: 10;
          height: 100%;
          width: 100%;
          border-radius: 24px;
          overflow: hidden;
        }

        .aurora-card-bg {
          /* The colorful background is now confined HERE */
          background: linear-gradient(-45deg, #fce7f3, #e0e7ff, #f3e8ff, #fae8ff);
          background-size: 400% 400%;
          animation: gradientMove 15s ease infinite;
        }

        /* --- 4. AVATAR RING --- */
        .avatar-wrapper-outer {
          position: relative;
          width: 114px;
          height: 114px;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .avatar-vibgyor-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(
            #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000
          );
          animation: spinSlow 4s linear infinite;
          filter: blur(2px); 
          opacity: 0.8;
        }
        .avatar-container-inner {
          position: relative;
          width: 106px;
          height: 106px;
          background: white;
          border-radius: 50%;
          padding: 3px;
          z-index: 2;
        }
        .avatar-img {
          width: 100%; height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }
        .edit-avatar-btn {
          position: absolute; bottom: 0; right: 0;
          background: #1e293b; color: white;
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
          z-index: 3;
          border: 2px solid white;
        }
        .edit-avatar-btn:hover { transform: scale(1.1); }


        /* --- 5. GLASS UI ELEMENTS --- */
        .glass-card {
          /* Base glass styles for modal & main card */
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
        }

        .glass-input {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 12px;
          padding: 10px 14px;
          width: 100%;
          font-size: 0.9rem;
          color: #1e293b;
          outline: none;
          transition: all 0.2s;
        }
        .glass-input:focus {
          background: rgba(255, 255, 255, 0.95);
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }

        .profile-header {
          padding: 35px 20px 25px;
          text-align: center;
          background: linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0));
        }

        .user-name {
          margin: 0;
          font-size: 1.8rem;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.5px;
        }

        .badge-row { display: flex; justify-content: center; gap: 8px; margin-top: 10px; }
        .glass-badge {
          padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .glass-badge.role { background: rgba(99, 102, 241, 0.1); color: #4f46e5; border: 1px solid rgba(99, 102, 241, 0.2); }
        .glass-badge.trust { background: rgba(255,255,255,0.8); border: 1px solid; display: flex; align-items: center; gap: 4px; }


        /* --- INFO GRID --- */
        .info-grid { padding: 0 30px; display: grid; gap: 15px; }
        .detail-group {
          background: rgba(255,255,255,0.6);
          border-radius: 16px; padding: 15px 20px;
          border: 1px solid rgba(255,255,255,0.5);
        }
        .group-title { font-size: 0.7rem; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 10px; letter-spacing: 1px; }
        .detail-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed rgba(0,0,0,0.05); }
        .detail-item:last-child { border-bottom: none; }
        .lbl { font-size: 0.85rem; color: #64748b; font-weight: 500; }
        .val { font-size: 0.9rem; color: #1e293b; font-weight: 600; }

        .edit-input-wrapper { margin-bottom: 8px; }
        .edit-lbl { display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 4px; }
        
        .locked-hostel-display { background: rgba(203, 213, 225, 0.3); padding: 10px; border-radius: 12px; }
        .locked-row { display: flex; justify-content: space-between; align-items: center; }
        .locked-tag { font-size: 0.7rem; color: #64748b; display: flex; align-items: center; gap: 3px; }
        .req-change-btn { font-size: 0.75rem; color: #4f46e5; font-weight: 600; cursor: pointer; margin-top: 4px; }
        .status-pending { font-size: 0.75rem; color: #d97706; margin-top: 4px; font-weight: 600; }
        .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
        .split-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }


        /* --- BUTTONS --- */
        .action-footer { padding: 25px 30px 30px; display: flex; justify-content: center; gap: 12px; }
        .glass-btn {
          border: none; cursor: pointer; border-radius: 12px; padding: 10px 24px;
          font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 8px;
          transition: transform 0.2s;
        }
        .glass-btn:active { transform: scale(0.96); }
        .glass-btn.primary { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
        .glass-btn.secondary { background: rgba(255,255,255,0.6); color: #475569; border: 1px solid rgba(255,255,255,0.5); }
        .glass-btn.ghost { background: white; color: #1e293b; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .full-width { width: 100%; justify-content: center; margin-top: 15px; }


        /* --- MODAL & TOAST --- */
        .glass-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);
          z-index: 2000; display: flex; align-items: center; justify-content: center;
        }
        .modal-content { padding: 30px; width: 90%; max-width: 400px; animation: slideUp 0.3s; background: white; }
        .section-title { margin-top: 0; font-size: 1.4rem; color: #1e293b; }
        .modal-desc { color: #64748b; font-size: 0.9rem; margin-bottom: 20px; line-height: 1.4; }
        .modal-select { padding: 12px; background: rgba(241, 245, 249, 0.9); }
        
        .glass-toast {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
          z-index: 3000; padding: 10px 20px; border-radius: 50px;
          backdrop-filter: blur(12px); font-weight: 600; font-size: 0.9rem;
          display: flex; align-items: center; gap: 8px;
          animation: slideDown 0.4s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .glass-toast.success { background: rgba(255, 255, 255, 0.95); color: #059669; border: 1px solid #34d399; }
        .glass-toast.error { background: rgba(255, 255, 255, 0.95); color: #dc2626; border: 1px solid #f87171; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }


        /* --- RESPONSIVENESS --- */
        @media (max-width: 992px) { .profile-container { max-width: 550px; } }
        @media (max-width: 600px) {
          .page-wrapper { padding: 10px; align-items: flex-start; padding-top: 30px; }
          .profile-header { padding: 25px 15px 15px; }
          .info-grid { padding: 0 15px; gap: 10px; }
          .detail-group { padding: 12px 15px; }
          .split-row { gap: 10px; }
          .avatar-wrapper-outer { width: 98px; height: 98px; }
          .avatar-container-inner { width: 90px; height: 90px; }
          .user-name { font-size: 1.5rem; }
          .action-footer { padding: 20px; }
        }
        @media (max-width: 380px) {
          .detail-item { flex-direction: column; align-items: flex-start; gap: 2px; }
          .val { font-size: 0.85rem; }
          .glass-btn { padding: 10px 16px; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  );
}

// Sub-components
function DetailGroup({ title, children }) { return <div className="detail-group"><h4 className="group-title">{title}</h4><div>{children}</div></div>; }
function DetailItem({ label, value }) { return <div className="detail-item"><span className="lbl">{label}</span><span className="val">{value || 'N/A'}</span></div>; }
function EditInput({ label, name, value, onChange }) { return <div className="edit-input-wrapper"><label className="edit-lbl">{label}</label><input name={name} value={value || ''} onChange={onChange} className="glass-input" /></div>; }

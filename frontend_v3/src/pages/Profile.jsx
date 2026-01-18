import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import { Lock, Edit3, ShieldCheck, AlertTriangle, Camera, Save, X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import Cropper from 'react-easy-crop';

export default function Profile() {
  
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
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(user || {});
  const [toast, setToast] = useState(null);
  
  // Hostel Request States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestedHostel, setRequestedHostel] = useState('');

  // --- CROPPER STATES ---
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const ALLOWED_HOSTELS = ["RNT", "Aryabhatta", "Gargi", "Dhalai", "Gomati"];

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // 1. Triggered when user selects a file
  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result);
        setShowCropModal(true); // Open the crop modal
      });
      reader.readAsDataURL(file);
    }
  };

  // 2. Triggered when crop area changes
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 3. Generate the final cropped image
  const showCroppedImage = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      setFormData({ ...formData, profile_pic: croppedImage });
      setShowCropModal(false);
      setImageSrc(null); // Reset
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to crop image');
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
    if (score >= 10) return '#10b981'; 
    if (score >= 5) return '#3b82f6';  
    if (score >= 0) return '#f59e0b';  
    return '#ef4444';                  
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

      {/* --- CROP MODAL (NEW) --- */}
      {showCropModal && (
        <div className="glass-modal-overlay">
          <div className="glass-card crop-modal-content">
            <h3 className="section-title">Adjust Profile Picture</h3>
            <div className="crop-container">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="slider-container">
              <ZoomOut size={16} className="slider-icon" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(e.target.value)}
                className="zoom-slider"
              />
              <ZoomIn size={16} className="slider-icon" />
            </div>

            <div className="modal-actions">
              <button onClick={() => { setShowCropModal(false); setImageSrc(null); }} className="glass-btn secondary">
                <X size={16} /> Cancel
              </button>
              <button onClick={showCroppedImage} className="glass-btn primary">
                <Check size={16} /> Set Profile Picture
              </button>
            </div>
          </div>
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
        
        <div className="card-border-wrapper">
          <div className="card-vibgyor-border"></div>
          
          <div className="glass-card main-card aurora-card-bg">
            
            <div className="profile-header">
              
              {/* Avatar Section */}
              <div className="avatar-wrapper-outer">
                <div className="avatar-vibgyor-ring"></div>
                
                {/* 1. Inner Container: HIDDEN OVERFLOW (Only for image) */}
                <div className="avatar-container-inner">
                  <img 
                    src={formData.profile_pic || `https://ui-avatars.com/api/?name=${user?.full_name || 'User'}&background=random`} 
                    alt="Profile" 
                    className="avatar-img" 
                  />
                </div>

                {/* 2. Camera Button: VISIBLE (Outside inner container, inside outer wrapper) */}
                {isEditing && (
                    <label className="edit-avatar-btn">
                      <Camera size={16} />
                      <input type="file" hidden accept="image/*" onChange={onFileChange} />
                    </label>
                  )}
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
                <button onClick={() => {setFormData(user); setIsEditing(true)}} className="glass-btn ghost">
                  <Edit3 size={16} /> Edit Profile
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        /* --- GENERAL PAGE SETUP --- */
        .page-wrapper {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 15px;
          font-family: 'Inter', sans-serif;
          background: transparent;
        }
        
        .profile-container {
          width: 100%;
          max-width: 650px;
        }

        /* --- BORDERS & ANIMATIONS --- */
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .card-border-wrapper {
          position: relative;
          padding: 3px;
          border-radius: 26px;
          overflow: hidden;
          background: transparent;
        }

        .card-vibgyor-border {
          position: absolute;
          inset: -50%;
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
          background: linear-gradient(-45deg, #fce7f3, #e0e7ff, #f3e8ff, #fae8ff);
          background-size: 400% 400%;
          animation: gradientMove 15s ease infinite;
        }

        /* --- AVATAR & CROPPER --- */
        .avatar-wrapper-outer {
          position: relative;
          width: 114px;
          height: 114px;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Important: Parent does NOT have overflow hidden, so camera can pop out */
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
          border-radius: 50%;
          background: #ffffff;
          padding: 0;
          display: block; 
          z-index: 5;
          border: 3px solid white;
          overflow: hidden; /* Only crops the image */
        }

        .avatar-img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100% !important; 
          height: 100% !important; 
          object-fit: cover;
          border-radius: 50%;
          display: block;
          z-index: 1;
        }

        /* --- CAMERA BUTTON (FIXED) --- */
        .edit-avatar-btn {
          position: absolute;
          bottom: 5px;   /* Adjusted to align nicely on the ring */
          right: 5px;    /* Adjusted to align nicely on the ring */
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #1e293b;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          cursor: pointer;
          z-index: 20;   /* Higher than everything */
          transition: transform 0.2s;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .edit-avatar-btn:hover { transform: scale(1.1); }

        /* --- CROP MODAL STYLES --- */
        .crop-modal-content {
           padding: 20px;
           width: 95%;
           max-width: 500px;
           background: white;
           display: flex;
           flex-direction: column;
           gap: 15px;
        }
        
        .crop-container {
          position: relative;
          width: 100%;
          height: 300px;
          background: #333;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .slider-container {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 10px;
        }
        
        .zoom-slider {
          flex: 1;
          accent-color: #4f46e5;
        }
        
        .slider-icon { color: #64748b; }
        
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 10px;
        }

        /* --- UI ELEMENTS --- */
        .glass-card {
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

// --- HELPER FUNCTION FOR CROPPING ---
async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new Promise((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result);
          reader.readAsDataURL(blob);
      }));
    }, 'image/jpeg');
  });
}

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

// Sub-components
function DetailGroup({ title, children }) { return <div className="detail-group"><h4 className="group-title">{title}</h4><div>{children}</div></div>; }
function DetailItem({ label, value }) { return <div className="detail-item"><span className="lbl">{label}</span><span className="val">{value || 'N/A'}</span></div>; }
function EditInput({ label, name, value, onChange }) { return <div className="edit-input-wrapper"><label className="edit-lbl">{label}</label><input name={name} value={value || ''} onChange={onChange} className="glass-input" /></div>; }

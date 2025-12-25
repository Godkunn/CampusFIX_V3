import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../App';

export default function Profile() {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) setFormData(user);
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
    } catch (err) {
      showToast('error', "Failed to update profile.");
    }
  };

  return (
    <div className="container fade-in">
      
      {/* Toast Notification */}
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

      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '0', overflow: 'hidden' }}>
        
        {/* Banner Section */}
        <div style={{ height: '150px', background: 'linear-gradient(135deg, #4f46e5, #ec4899)', position: 'relative' }}></div>

        {/* Content Section */}
        <div style={{ padding: '0 3rem 3rem', marginTop: '-60px', position: 'relative' }}>
          
          {/* Avatar */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{ 
                width: '120px', height: '120px', borderRadius: '50%', 
                background: 'white', padding: '5px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)', overflow: 'hidden'
              }}>
                {formData.profile_pic ? (
                  <img src={formData.profile_pic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold', color: '#4f46e5' }}>
                    {user.full_name?.charAt(0)}
                  </div>
                )}
              </div>
              {isEditing && (
                <label style={{ 
                  position: 'absolute', bottom: '5px', right: '5px', 
                  background: '#4f46e5', color: 'white', borderRadius: '50%', 
                  width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}>
                  ✏️
                  <input type="file" hidden accept="image/*" onChange={handleImage} />
                </label>
              )}
            </div>
            
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '5px' }}>{user.full_name}</h2>
            <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {user.role}
            </span>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            <DetailGroup title="Contact Information">
              <DetailItem label="Email" value={user.email} />
              {isEditing && (user.role === 'official' || user.role === 'admin') ? (
                <EditInput label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
              ) : (user.role === 'official' || user.role === 'admin') && (
                <DetailItem label="Phone" value={user.phone} />
              )}
            </DetailGroup>

            {user.role === 'student' && (
              <DetailGroup title="Academic Details">
                <DetailItem label="Enrollment No" value={user.enrollment_no} />
                {isEditing ? (
                  <EditInput label="Semester" name="semester" value={formData.semester} onChange={handleChange} />
                ) : (
                  <DetailItem label="Semester" value={user.semester} />
                )}
              </DetailGroup>
            )}

            {user.role === 'student' && (
              <DetailGroup title="Accommodation">
                {isEditing ? (
                  <>
                    <EditInput label="Hostel" name="hostel" value={formData.hostel} onChange={handleChange} />
                    <EditInput label="Block" name="block" value={formData.block} onChange={handleChange} />
                    <EditInput label="Room No" name="room_no" value={formData.room_no} onChange={handleChange} />
                  </>
                ) : (
                  <>
                    <DetailItem label="Hostel" value={user.hostel} />
                    <DetailItem label="Block" value={user.block} />
                    <DetailItem label="Room No" value={user.room_no} />
                  </>
                )}
              </DetailGroup>
            )}

            {(user.role === 'official' || user.role === 'admin') && (
              <DetailGroup title="Department Info">
                <DetailItem label="Department" value={user.department} />
              </DetailGroup>
            )}

          </div>

          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            {isEditing ? (
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button onClick={handleSave} className="btn-grad" style={{ padding: '12px 30px', fontSize: '0.9rem' }}>Save Changes</button>
                <button onClick={() => { setIsEditing(false); setFormData(user); }} className="btn-ghost" style={{ padding: '12px 30px', fontSize: '0.9rem' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="btn-ghost" style={{ fontSize: '0.9rem', padding: '12px 30px' }}>Edit Profile</button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// Helpers
function DetailGroup({ title, children }) {
  return (
    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '15px' }}>{title}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{children}</div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
      <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '500' }}>{label}</span>
      <span style={{ color: '#1e293b', fontWeight: '600', fontSize: '0.95rem' }}>{value || 'N/A'}</span>
    </div>
  );
}

function EditInput({ label, name, value, onChange }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>{label}</label>
      <input 
        name={name} value={value || ''} onChange={onChange} 
        className="glass-input" 
        style={{ padding: '8px 12px', fontSize: '0.9rem', marginBottom: 0, background: 'white' }} 
      />
    </div>
  );
}
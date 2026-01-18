import React, { useEffect, useState } from 'react';
import api from '../api';
import { ShieldCheck, AlertTriangle } from 'lucide-react'; // Import icons

export default function Students() {
  
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

  const [students, setStudents] = useState([]);
  const [toast, setToast] = useState(null);

  const loadStudents = React.useCallback(() => {
  api.get('/users/all')
    .then(res => setStudents(res.data))
    .catch(console.error);
}, []);

useEffect(() => {
  loadStudents();
}, [loadStudents]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRequest = async (id, action) => {
    try {
      await api.post(`/users/${id}/manage-hostel`, { action });
      showToast('success', `Request ${action}ed`);
      loadStudents();
    } catch {
      showToast('error', "Action failed");
    }
  };

  // Helper for Trust Score Color
  const getTrustColor = (score) => {
      if (score >= 10) return '#22c55e'; // Green
      if (score >= 5) return '#3b82f6';  // Blue
      if (score >= 0) return '#eab308';  // Yellow
      return '#ef4444';                  // Red
  };

  return (
    <div className="container fade-in">
      
      {/* Toast */}
      {toast && (
        <div style={{ 
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: 'white', padding: '15px 25px', borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)', borderLeft: `5px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`
        }}>
          {toast.message}
        </div>
      )}

      <div className="glass-panel">
        <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>🎓 Registered Students</h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Student</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Trust Score</th> {/* NEW COLUMN */}
                <th style={{ padding: '15px', textAlign: 'left' }}>Enrollment</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Current Hostel</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Change Request</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#4f46e5' }}>
                      {s.full_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{s.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.email}</div>
                    </div>
                  </td>
                  
                  {/* --- NEW: TRUST SCORE CELL --- */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '5px',
                        background: '#f8fafc',
                        border: `1px solid ${getTrustColor(s.credit_score || 0)}`,
                        color: getTrustColor(s.credit_score || 0),
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                    }}>
                        {s.credit_score < 0 ? <AlertTriangle size={14}/> : <ShieldCheck size={14}/>}
                        {s.credit_score !== undefined ? s.credit_score : 0}
                    </div>
                  </td>

                  <td style={{ padding: '15px', color: '#475569' }}>{s.enrollment_no || '-'}</td>
                  <td style={{ padding: '15px' }}>
                    {s.hostel ? (
                      <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                        {s.hostel} - {s.room_no}
                      </span>
                    ) : <span style={{ color: '#94a3b8' }}>Not Assigned</span>}
                  </td>
                  <td style={{ padding: '15px' }}>
                    {s.requested_hostel ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: '600', color: '#d97706' }}>To: {s.requested_hostel}</span>
                        <button onClick={() => handleRequest(s.id, 'approve')} style={{ background: '#dcfce7', border: 'none', padding: '5px 10px', borderRadius: '6px', color: '#166534', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>✓ Approve</button>
                        <button onClick={() => handleRequest(s.id, 'reject')} style={{ background: '#fee2e2', border: 'none', padding: '5px 10px', borderRadius: '6px', color: '#991b1b', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}>✗ Reject</button>
                      </div>
                    ) : <span style={{ color: '#cbd5e1' }}>-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
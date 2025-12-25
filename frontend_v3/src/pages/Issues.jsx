import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../App';

export default function Issues() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('track'); 
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState('All');

  // Form State
  const [form, setForm] = useState({
    title: '', category: 'Hostel', sub_location: '', specific_location: '', 
    description: '', priority: 'Medium', image_data: ''
  });

  const HOSTELS = ["Aryabhatta", "RNT", "Gargi"];
  const MESSES = ["1st Year Mess", "Veg Mess", "Eastern Mess", "Northern Mess", "Southern Mess"];
  const FILTERS = ["All", "Pending", "In Progress", "Solved", "Hostel", "Mess", "Electricity", "Plumbing", "Carpenter", "Academic"];

  useEffect(() => {
    if (activeTab === 'track') {
      api.get('/issues').then(res => setIssues(res.data));
    }
  }, [activeTab]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, image_data: reader.result });
    if (file) reader.readAsDataURL(file);
  };

  const handleReport = async (e) => {
    e.preventDefault();
    try {
      if(!form.sub_location || !form.specific_location) {
        alert("Please fill in location details.");
        return;
      }
      
      await api.post('/issues', form);
      alert("✅ Issue Reported Successfully!");
      setForm({ title: '', category: 'Hostel', sub_location: '', specific_location: '', description: '', priority: 'Medium', image_data: '' });
      setActiveTab('track');
    } catch (err) { 
      console.error(err);
      alert("Failed to report issue. Check connection."); 
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/issues/${id}/status`, { status });
      setIssues(issues.map(i => i.id === id ? { ...i, status } : i));
    } catch (err) { 
      console.error(err);
      alert("Failed to update status."); 
    }
  };

  const getBadgeClass = (status) => {
    const map = { 'Pending': 'badge-pending', 'Solved': 'badge-resolved', 'Defected': 'badge-defected', 'Duplicate': 'badge-duplicate', 'Unnecessary': 'badge-unnecessary' };
    return map[status] || 'badge-pending';
  };

  // Filter Logic
  const filteredIssues = issues.filter(i => {
    if (filter === 'All') return true;
    if (['Pending', 'In Progress', 'Solved'].includes(filter)) return i.status === filter;
    return i.category === filter;
  });

  return (
    <div className="container fade-in">
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ background: 'white', display: 'inline-flex', padding: '5px', borderRadius: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setActiveTab('track')} className={`btn-ghost ${activeTab === 'track' ? 'btn-grad' : ''}`} style={{ border: 'none' }}>📋 Track Issues</button>
          {user.role === 'student' && (
            <button onClick={() => setActiveTab('report')} className={`btn-ghost ${activeTab === 'report' ? 'btn-grad' : ''}`} style={{ border: 'none' }}>➕ Report New</button>
          )}
        </div>
      </div>

      {activeTab === 'report' && (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '20px', color: '#4f46e5' }}>📝 Report an Issue</h2>
          <form onSubmit={handleReport}>
            <div className="grid-2" style={{ gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Title</label>
                <input className="glass-input" placeholder="e.g. Fan Broken" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Category</label>
                <select className="glass-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  <option>Hostel</option><option>Mess</option><option>Electricity</option><option>Plumbing</option><option>Carpenter</option><option>Academic</option><option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                  {['Hostel', 'Mess'].includes(form.category) ? `Select ${form.category}` : 'Building Name'}
                </label>
                {['Hostel', 'Mess'].includes(form.category) ? (
                  <select className="glass-input" value={form.sub_location} onChange={e => setForm({...form, sub_location: e.target.value})} required>
                    <option value="">Select...</option>
                    {(form.category === 'Hostel' ? HOSTELS : MESSES).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input className="glass-input" placeholder="Building Name" value={form.sub_location} onChange={e => setForm({...form, sub_location: e.target.value})} required />
                )}
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Specific Location</label>
                <input className="glass-input" placeholder="e.g. Block B - 240" value={form.specific_location} onChange={e => setForm({...form, specific_location: e.target.value})} required />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Priority</label>
                <select className="glass-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Attach Photo</label>
                <input type="file" className="glass-input" style={{ padding: '10px' }} accept="image/*" onChange={handleImage} />
              </div>
            </div>

            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Description</label>
            <textarea className="glass-input" rows="4" placeholder="Describe the issue..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />

            <button className="btn-grad" style={{ width: '100%', marginTop: '10px' }}>🚀 Submit Complaint</button>
          </form>
        </div>
      )}

      {activeTab === 'track' && (
        <>
          <div style={{ marginBottom: '20px', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '10px' }}>
            {FILTERS.map(s => (
              <button key={s} onClick={() => setFilter(s)} className="btn-ghost" style={{ marginRight: '10px', background: filter === s ? '#e2e8f0' : 'white', fontSize: '0.85rem', border: filter === s ? '1px solid #4f46e5' : '1px solid #e2e8f0', color: filter === s ? '#4f46e5' : 'inherit' }}>{s}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredIssues.map(issue => (
              <div key={issue.id} className="glass-panel" style={{ position: 'relative' }}>
                <div className="flex-between" style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>📅 {new Date(issue.created_at).toLocaleDateString()}</span>
                  <span className={`badge ${getBadgeClass(issue.status)}`}>{issue.status}</span>
                </div>
                
                {issue.image_data && <img src={issue.image_data} alt="Evidence" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' }} />}
                
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{issue.title}</h3>
                <div style={{ fontSize: '0.85rem', color: '#475569', margin: '5px 0 10px' }}>{issue.description}</div>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>📍 {issue.sub_location}, {issue.specific_location}</span>
                  <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>🏷️ {issue.category}</span>
                  <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>👤 {issue.owner_name}</span>
                </div>

                {/* Only Officials can see action buttons */}
                {user.role !== 'student' && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '5px' }}>OFFICIAL ACTIONS:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                      <button onClick={() => updateStatus(issue.id, 'Solved')} className="btn-grad" style={{ fontSize: '0.7rem', padding: '8px' }}>✅ Solve</button>
                      <button onClick={() => updateStatus(issue.id, 'Defected')} className="btn-ghost" style={{ fontSize: '0.7rem', padding: '8px', color: '#ef4444', borderColor: '#ef4444' }}>❌ Defect</button>
                      <button onClick={() => updateStatus(issue.id, 'Duplicate')} className="btn-ghost" style={{ fontSize: '0.7rem', padding: '8px' }}>📑 Duplicate</button>
                      <button onClick={() => updateStatus(issue.id, 'Unnecessary')} className="btn-ghost" style={{ fontSize: '0.7rem', padding: '8px' }}>🚫 Ignore</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
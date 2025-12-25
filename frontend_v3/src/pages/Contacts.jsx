import React from 'react';

export default function Contacts() {
  const contacts = [
    { name: "Dr. S. Sharma", role: "Chief Warden", phone: "9876543210" },
    { name: "Security Control", role: "Main Gate", phone: "0381-2546630" },
    { name: "Ambulance", role: "Medical Unit", phone: "108" },
    { name: "Mr. A. Das", role: "Warden (Aryabhatta)", phone: "9876500001" },
    { name: "Ms. P. Roy", role: "Warden (Gargi)", phone: "9876500002" },
    { name: "Mr. K. Singh", role: "Warden (RNT)", phone: "9876500003" },
    { name: "Electrical Dept", role: "Maintenance", phone: "9998887771" },
    { name: "Plumbing Dept", role: "Maintenance", phone: "9998887772" },
    { name: "Network Center", role: "Wi-Fi Issues", phone: "0381-254856" },
    { name: "Mess Manager", role: "1st Year Mess", phone: "8887776661" },
    { name: "Mess Manager", role: "Veg Mess", phone: "8887776662" },
    { name: "Mess Manager", role: "Non-Veg Mess", phone: "8887776663" },
    { name: "Anti-Ragging", role: "Helpline", phone: "1800-180-5522" },
    { name: "Director Office", role: "Admin", phone: "0381-2546629" },
    { name: "Registrar", role: "Admin", phone: "0381-2546630" },
  ];

  return (
    <div className="container fade-in">
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#1e293b' }}>📞 Emergency & Important Contacts</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {contacts.map((c, i) => (
          <div key={i} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '50px', height: '50px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              {i < 3 ? '🚨' : '👤'}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e293b' }}>{c.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{c.role}</div>
              <a href={`tel:${c.phone}`} style={{ color: '#4f46e5', fontWeight: '700', textDecoration: 'none', display: 'block', marginTop: '5px' }}>
                {c.phone}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
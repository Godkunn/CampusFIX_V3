import React, { useState } from 'react';
import { 
  AlertTriangle, Calendar, Clock, MapPin, 
  Megaphone, Zap, Droplets, ShieldAlert, 
  Utensils, Info, Filter 
} from 'lucide-react';

export default function Notices() {
  const [filter, setFilter] = useState('All');

  const notices = [
    {
      id: 1,
      type: "Urgent",
      category: "Power",
      title: "⚠️ Planned Power Maintenance - Block B",
      desc: "Electricity will be cut off for urgent transformer repairs. Please charge your laptops and devices in advance to avoid disruption during study hours.",
      date: "Dec 21, 2025",
      time: "10:00 AM - 02:00 PM",
      location: "Block B, Aryabhatta Hostel",
      icon: <Zap size={20} />
    },
    {
      id: 2,
      type: "Maintenance",
      category: "Water",
      title: "🚰 Water Tank Cleaning",
      desc: "Water supply will be disrupted due to scheduled cleaning of the main overhead tanks. Please store sufficient water for your morning needs in advance.",
      date: "Dec 22, 2025",
      time: "08:00 AM - 12:00 PM",
      location: "Gargi Hostel",
      icon: <Droplets size={20} />
    },
    {
      id: 3,
      type: "Info",
      category: "Tech", // Changed to Tech for better categorization if needed, or keep Info
      title: "📡 WiFi Server Upgrade",
      desc: "Internet connectivity might be intermittent or slow during this period as we upgrade the central server for better bandwidth.",
      date: "Dec 23, 2025",
      time: "02:00 AM - 04:00 AM",
      location: "All Campus Areas",
      icon: <Info size={20} /> // Or a Wifi icon if imported
    },
     {
      id: 4,
      type: "Security",
      category: "Security",
      title: "🚫 Main Gate Entry Restrictions",
      desc: "Entry from the Main Gate will not be allowed for outsiders after 8:00 AM except for emergency cases. Please carry your ID cards at all times.",
      date: "Effective Immediately",
      time: "After 08:00 AM", // Based on your input, assuming PM for evening restriction or strictly AM as requested
      location: "Main Gate",
      icon: <ShieldAlert size={20} />
    },
    {
      id: 5,
      type: "Admin",
      category: "Mess",
      title: "❄️ Winter Vacation Mess Schedule",
      desc: "All regular messes will remain closed during the winter vacation. Only 'Northern Mess' will function on a payment basis for students staying back.",
      date: "Dec 18 - Jan 04, 2026",
      time: "All Meals",
      location: "Northern Mess",
      icon: <Utensils size={20} />
    },
    {
      id: 6,
      type: "Info",
      category: "Mess",
      title: "🚚 Eastern Mess Relocation",
      desc: "The Eastern Mess facility is shifting from the RNT basement to the new Aryabhatta Dining Hall extension. Breakfast will be served at the new location.",
      date: "Starting Jan 05, 2026",
      time: "07:30 AM Onwards",
      location: "Aryabhatta Extension",
      icon: <Megaphone size={20} />
    }
  ];

  // Helper to get styles based on type
  const getStyles = (type) => {
    switch (type) {
      case 'Urgent': return { border: '#ef4444', bg: '#fee2e2', text: '#991b1b', badge: '#ef4444' };
      case 'Security': return { border: '#7c3aed', bg: '#f3e8ff', text: '#6b21a8', badge: '#8b5cf6' };
      case 'Maintenance': return { border: '#f59e0b', bg: '#fef3c7', text: '#92400e', badge: '#f59e0b' };
      case 'Admin': return { border: '#3b82f6', bg: '#dbeafe', text: '#1e40af', badge: '#3b82f6' };
      case 'Info': return { border: '#10b981', bg: '#d1fae5', text: '#065f46', badge: '#10b981' };
      default: return { border: '#64748b', bg: '#f1f5f9', text: '#475569', badge: '#64748b' };
    }
  };

  const filteredNotices = filter === 'All' ? notices : notices.filter(n => n.category === filter || n.type === filter);

  return (
    <div className="container fade-in">
      
      {/* --- OFFICIAL HEADER --- */}
      <div className="glass-panel" style={{ 
        marginBottom: '30px', textAlign: 'center', 
        background: 'linear-gradient(to right, #ffffff, #f8fafc)',
        borderBottom: '4px solid #4f46e5'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '50%', color: '#4f46e5' }}>
            <Megaphone size={32} />
          </div>
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '5px', letterSpacing: '-0.5px' }}>
          Official Campus Circulars
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '500' }}>
          Office of the Chief Warden • Student Affairs Council
        </p>
      </div>

      {/* --- FILTER TABS --- */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', overflowX: 'auto', paddingBottom: '5px' }}>
        {['All', 'Urgent', 'Security', 'Mess', 'Water', 'Power'].map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)}
            className="btn-ghost"
            style={{ 
              background: filter === f ? '#1e293b' : 'white', 
              color: filter === f ? 'white' : '#64748b',
              border: '1px solid #e2e8f0',
              padding: '8px 20px',
              borderRadius: '25px',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* --- NOTICE GRID --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
        {filteredNotices.map(n => {
          const style = getStyles(n.type);
          return (
            <div key={n.id} className="glass-panel hover-card" style={{ 
              borderLeft: `6px solid ${style.border}`, 
              padding: '0', 
              overflow: 'hidden',
              position: 'relative'
            }}>
              
              {/* Header Part */}
              <div style={{ padding: '20px 25px', borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex-between" style={{ marginBottom: '10px' }}>
                  <span style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', 
                    color: style.badge, letterSpacing: '0.5px'
                  }}>
                    {n.icon} {n.type} NOTICE
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>#{n.id.toString().padStart(3, '0')}</span>
                </div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', lineHeight: '1.4' }}>{n.title}</h3>
              </div>

              {/* Body Part */}
              <div style={{ padding: '20px 25px', background: 'rgba(255,255,255,0.5)' }}>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                  {n.desc}
                </p>

                {/* Meta Details */}
                <div style={{ display: 'grid', gap: '12px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#334155', fontWeight: '500' }}>
                    <Calendar size={16} color="#64748b" /> {n.date}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#334155', fontWeight: '500' }}>
                    <Clock size={16} color="#64748b" /> {n.time}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#334155', fontWeight: '500' }}>
                    <MapPin size={16} color="#64748b" /> {n.location}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      <style>{`
        .hover-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .hover-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
      `}</style>
    </div>
  );
}
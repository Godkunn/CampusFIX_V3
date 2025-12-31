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
      category: "Tech",
      title: "📡 WiFi Server Upgrade",
      desc: "Internet connectivity might be intermittent or slow during this period as we upgrade the central server for better bandwidth.",
      date: "Dec 23, 2025",
      time: "02:00 AM - 04:00 AM",
      location: "All Campus Areas",
      icon: <Info size={20} />
    },
    {
      id: 4,
      type: "Security",
      category: "Security",
      title: "🚫 Main Gate Entry Restrictions",
      desc: "Entry from the Main Gate will not be allowed for outsiders after 8:00 AM except for emergency cases.",
      date: "Effective Immediately",
      time: "After 08:00 AM",
      location: "Main Gate",
      icon: <ShieldAlert size={20} />
    },
    {
      id: 5,
      type: "Admin",
      category: "Mess",
      title: "❄️ Winter Vacation Mess Schedule",
      desc: "All regular messes will remain closed. Only 'Northern Mess' will function on payment basis.",
      date: "Dec 18 - Jan 04",
      time: "All Meals",
      location: "Northern Mess",
      icon: <Utensils size={20} />
    },
    {
      id: 6,
      type: "Info",
      category: "Mess",
      title: "🚚 Eastern Mess Relocation",
      desc: "The Eastern Mess facility is shifting from the RNT basement to the new Aryabhatta Dining Hall extension.",
      date: "Jan 05, 2026",
      time: "07:30 AM",
      location: "Aryabhatta Ext.",
      icon: <Megaphone size={20} />
    }
  ];

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
    <div className="container fade-in notices-wrapper">
      
      {/* --- RESPONSIVE COMPACT HEADER --- */}
      <div className="glass-panel header-panel">
        <div className="header-icon-container">
          <Megaphone className="header-icon" />
        </div>
        <div className="header-text-container">
          <h1 className="header-title">Official Circulars</h1>
          <p className="header-subtitle">Office of the Chief Warden • Student Affairs Council</p>
        </div>
      </div>

      {/* --- COMPACT FILTERS --- */}
      <div className="filter-scroll-container">
        {['All', 'Urgent', 'Security', 'Mess', 'Water', 'Power'].map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)}
            className={`btn-ghost filter-btn ${filter === f ? 'active' : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* --- COMPACT GRID --- */}
      <div className="notices-grid">
        {filteredNotices.map(n => {
          const style = getStyles(n.type);
          return (
            <div 
              key={n.id} 
              className="glass-panel hover-card notice-card" 
              style={{ borderLeft: `5px solid ${style.border}` }}
            >
              {/* Card Header */}
              <div className="card-header">
                <div className="flex-between mb-1">
                  <span className="notice-badge" style={{ color: style.badge }}>
                    {n.icon} {n.type}
                  </span>
                  <span className="notice-id">#{n.id}</span>
                </div>
                <h3 className="card-title">{n.title}</h3>
              </div>

              {/* Card Body */}
              <div className="card-body">
                <p className="card-desc">
                  {n.desc}
                </p>

                {/* Meta Info */}
                <div className="meta-container">
                  <div className="meta-item">
                    <Calendar size={13} className="meta-icon" /> {n.date}
                  </div>
                  <div className="meta-item">
                    <Clock size={13} className="meta-icon" /> {n.time}
                  </div>
                  <div className="meta-item full-width-meta">
                    <MapPin size={13} className="meta-icon" /> {n.location}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        /* --- 1. DEFAULT DESKTOP (Large Screens) --- */
        .notices-wrapper { padding-bottom: 50px; }
        
        .header-panel {
          margin-bottom: 25px;
          text-align: center;
          background: linear-gradient(to right, #ffffff, #f8fafc);
          border-bottom: 4px solid #4f46e5;
          padding: 25px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .header-icon-container {
          background: #e0e7ff; padding: 12px; border-radius: 50%; color: #4f46e5;
          margin-bottom: 8px; display: inline-flex;
        }
        .header-icon { width: 28px; height: 28px; }
        .header-title { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 4px; letter-spacing: -0.5px; }
        .header-subtitle { color: #64748b; font-size: 0.9rem; font-weight: 500; margin: 0; }

        .filter-scroll-container { display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        .filter-btn {
          background: white; color: #64748b; border: 1px solid #e2e8f0;
          padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;
          white-space: nowrap; transition: all 0.2s;
        }
        .filter-btn.active { background: #1e293b; color: white; border-color: #1e293b; }

        .notices-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .notice-card { padding: 0; overflow: hidden; position: relative; transition: transform 0.2s; }
        
        .card-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
        .notice-badge { display: flex; align-items: center; gap: 5px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .notice-id { font-size: 0.75rem; color: #94a3b8; }
        .card-title { margin: 0; color: #1e293b; font-size: 1.15rem; lineHeight: 1.3; font-weight: 700; }
        
        .card-body { padding: 16px 20px; background: rgba(255,255,255,0.5); }
        .card-desc { color: #475569; font-size: 0.9rem; line-height: 1.5; margin: 0 0 15px 0; }
        
        .meta-container { display: flex; flex-wrap: wrap; gap: 10px; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; }
        .meta-item { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #334155; font-weight: 500; }
        .meta-icon { color: #64748b; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; }
        .mb-1 { margin-bottom: 6px; }


        /* --- 2. MOBILE & TABLET COMPACT MODE (Max 768px) --- */
        @media (max-width: 768px) {
          
          /* HEADER: Ultra Compact Strip */
          .header-panel {
            flex-direction: row; 
            padding: 10px 15px;      /* Very small padding */
            margin-bottom: 15px;     /* Less gap below */
            gap: 12px;
            text-align: left;
            justify-content: flex-start;
            border-bottom-width: 3px;
          }
          
          .header-icon-container {
            margin-bottom: 0;
            padding: 8px;            /* Smaller circle */
            min-width: 36px; height: 36px; 
          }
          .header-icon { width: 18px; height: 18px; }
          
          .header-text-container { display: flex; flex-direction: column; justify-content: center; }
          .header-title { 
            font-size: 1.1rem;       /* Much smaller font */
            margin-bottom: 0; 
            line-height: 1;
          }
          .header-subtitle { 
            display: none;           /* HIDE subtitle to save space */
          }

          /* FILTERS: Smaller */
          .filter-btn { padding: 5px 12px; font-size: 0.75rem; }
          
          /* GRID: Single Column */
          .notices-grid { grid-template-columns: 1fr; gap: 12px; }
          
          /* CARD: Tighter Spacing */
          .card-header, .card-body { padding: 12px 15px; } /* Reduced padding */
          .card-title { font-size: 1rem; }
          .card-desc { font-size: 0.85rem; margin-bottom: 12px; }
          
          /* META: Compact Rows */
          .meta-container { padding: 8px 10px; gap: 8px; }
          .meta-item { font-size: 0.75rem; width: 48%; } /* 2 per row */
          .full-width-meta { width: 100%; } /* Location gets full row */
        }

        /* --- 3. SMALL PHONES (Max 380px) --- */
        @media (max-width: 380px) {
          .header-title { font-size: 1rem; }
          .filter-btn { padding: 4px 10px; font-size: 0.7rem; }
          .card-title { font-size: 0.95rem; }
          .meta-item { width: 100%; } /* Stack meta items vertically */
        }
      `}</style>
    </div>
  );
}

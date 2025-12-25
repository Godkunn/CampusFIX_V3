import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then(res => setStats(res.data)).catch(console.error);
  }, []);

  if (!stats) return <div className="flex-center" style={{color:'#4f46e5'}}>Loading Dashboard...</div>;

  // Calculate Resolution Percentage
  const resolutionRate = stats.total_issues > 0 
    ? Math.round((stats.resolved / stats.total_issues) * 100) 
    : 0;

  return (
    <div className="container fade-in">
      
      {/* 1. Hero Banner */}
      <div className="glass-panel" style={{ 
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
        color: 'white', 
        border: 'none', 
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            Welcome, {user.full_name.split(' ')[0]}! 👋
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px' }}>
            {user.role === 'student' 
              ? 'Track your hostel complaints and facility status in real-time.' 
              : 'Overview of campus maintenance activity and staff performance.'}
          </p>
        </div>
      </div>

      {/* 2. Main Stats Grid */}
      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
        <StatCard 
          icon="📂" 
          value={stats.total_issues} 
          label="Total Issues" 
          color="rgba(255, 255, 255, 0.9)" 
          textColor="#1e293b" 
          borderColor="#e2e8f0"
        />
        <StatCard 
          icon="⏳" 
          value={stats.pending} 
          label="Pending" 
          color="#fffbeb" 
          textColor="#b45309" 
          borderColor="#fcd34d"
        />
        <StatCard 
          icon="✅" 
          value={stats.resolved} 
          label="Resolved" 
          color="#f0fdf4" 
          textColor="#15803d" 
          borderColor="#86efac"
        />
        {user.role === 'student' && (
          <StatCard 
            icon="👤" 
            value={stats.my_issues} 
            label="My Reports" 
            color="#eef2ff" 
            textColor="#4338ca" 
            borderColor="#a5b4fc"
          />
        )}
      </div>

      {/* 3. Analytics & Actions Section */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        
        {/* Left: Resolution Health */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>📊 Campus Health</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '25px' }}>
            
            {/* Circular Progress */}
            <div style={{ 
              width: '100px', height: '100px', borderRadius: '50%', 
              background: `conic-gradient(#16a34a ${resolutionRate}%, #e2e8f0 0)`, // Green Progress
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{ width: '82px', height: '82px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.05)' }}>
                <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.4rem', lineHeight: 1 }}>{resolutionRate}%</span>
                <span style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Success</span>
              </div>
            </div>

            {/* Breakdown Text */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '3px' }}>
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>✅ Resolved</span>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{stats.resolved}</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px' }}>
                  <div style={{ width: `${(stats.resolved / (stats.total_issues || 1)) * 100}%`, height: '100%', background: '#16a34a', borderRadius: '4px' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '3px' }}>
                  <span style={{ color: '#b45309', fontWeight: '600' }}>⏳ Pending</span>
                  <span style={{ fontWeight: '700', color: '#1e293b' }}>{stats.pending}</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px' }}>
                  <div style={{ width: `${(stats.pending / (stats.total_issues || 1)) * 100}%`, height: '100%', background: '#f59e0b', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>

          </div>

          <div style={{ padding: '15px', background: 'rgba(255,255,255,0.6)', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Maintenance Status</span>
              <span style={{ color: '#15803d' }}>● Teams Active</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Maintenance staff is currently resolving tickets.</div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>🚀 Quick Actions</h3>
          <div style={{ display: 'grid', gap: '15px' }}>
            
            <Link to="/issues" className="btn-grad" style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span>{user.role === 'student' ? '➕ Report New Issue' : '📋 Manage Issues'}</span>
            </Link>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <Link to="/contacts" className="btn-ghost" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px' }}>
                <span style={{ fontSize: '1.5rem', marginBottom: '5px' }}>📞</span>
                Contacts
              </Link>
              <Link to="/profile" className="btn-ghost" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px' }}>
                <span style={{ fontSize: '1.5rem', marginBottom: '5px' }}>👤</span>
                Profile
              </Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color, textColor, borderColor }) {
  return (
    <div className="glass-panel" style={{ 
      background: color, 
      display: 'flex', alignItems: 'center', gap: '15px', 
      border: `1px solid ${borderColor}`,
      padding: '1.5rem'
    }}>
      <div style={{ fontSize: '2.2rem' }}>{icon}</div>
      <div>
        <h3 style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1, color: textColor }}>{value}</h3>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8, color: textColor, margin: 0 }}>{label}</p>
      </div>
    </div>
  );
}
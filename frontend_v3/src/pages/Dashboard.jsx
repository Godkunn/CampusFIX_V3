import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { requestPermissionAndGetToken } from '../firebase';
import {
  AlertTriangle, Info, Zap, Droplets, Hammer, UserCheck,
  Activity, Star, List, FileText, FileSpreadsheet, Maximize2,
  MapPin, Tag
} from 'lucide-react';
import CampusMap from '../components/CampusMap';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // --- CORE DATA STATES ---
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [delayedCount, setDelayedCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // --- HEATMAP STATES ---
  const [heatmapIndex, setHeatmapIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState(null);
  const HEATMAP_IMAGES = [
    "/HeatMap/HeatMap1.png", "/HeatMap/HeatMap2.png", "/HeatMap/HeatMap3.png",
    "/HeatMap/HeatMap4.png", "/HeatMap/HeatMap5.png", "/HeatMap/HeatMap6.png", "/HeatMap/HeatMap7.png"
  ];
  
  // --- MODAL STATES ---
  const [showEscalation, setShowEscalation] = useState(false);
  const [showAllNotices, setShowAllNotices] = useState(false);
  const [reportModal, setReportModal] = useState({ open: false, type: '' });
  
  // --- REPORT GENERATION STATES ---
  const [reportConfig, setReportConfig] = useState({ range: 'week', format: 'pdf' });
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState("Initializing...");
  const [toast, setToast] = useState(null);
  
  // --- MOCK WORKER DATA ---
  const WORKER_PERFORMANCE = [
    { role: "Electrician", rating: 4.8, tasks: 120, icon: <Zap size={18} /> },
    { role: "Plumber", rating: 4.2, tasks: 85, icon: <Droplets size={18} /> },
    { role: "Carpenter", rating: 3.9, tasks: 45, icon: <Hammer size={18} /> },
    { role: "Cleaning", rating: 4.5, tasks: 200, icon: <UserCheck size={18} /> },
  ];
  
  const NOTICES_LIST = [
    "⚠️ Power maintenance scheduled for Block B tomorrow (10 AM - 2 PM).",
    "💧 Water supply affected in Block A due to pipe repair.",
    "📚 Library will remain closed this Sunday for renovation.",
    "🎉 Annual Sports Meet registration closes on Friday."
  ];
  const URGENT_NOTICE_TEXT = NOTICES_LIST.join(" • ");

  // =============================================
  // 📡 OPTIMIZED DATA FETCHING
  // =============================================
  useEffect(() => {
    let isMounted = true;
    let statsRetryAttempt = 0;
    const MAX_RETRIES = 3;
    
    // ✅ FAST STATS LOADING
    const loadStats = async () => {
      try {
        const response = await Promise.race([
          api.get('/stats'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
        ]);
        
        if (isMounted) {
          setStats(response.data);
          setStatsLoading(false);
        }
      } catch (err) {
        console.warn('⚠️ Background refresh failed', err);
        if (statsRetryAttempt < MAX_RETRIES && isMounted) {
          statsRetryAttempt++;
          setTimeout(() => loadStats(), 1000 * statsRetryAttempt);
        } else if (isMounted) {
          setStats({ total_issues: 0, pending: 0, resolved: 0, my_issues: 0 });
          setStatsLoading(false);
        }
      }
    };
    
    loadStats();
    
    // ✅ LOAD ISSUES
    api.get('/issues')
      .then(res => {
        if (!isMounted) return;
        const issues = res.data;
        
        if (user.role === 'student') {
          // 🛡️ Robust Filter: Checks owner_id OR user_id OR email to ensure data always shows
          const myIssues = issues.filter(i => 
            (i.owner_id && i.owner_id === user.id) || 
            (i.user_id && i.user_id === user.id) ||
            (i.email && i.email === user.email)
          );
          setRecentActivity(myIssues.slice(0, 3));
        } else {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const delayed = issues.filter(i => 
            i.status === 'Pending' && new Date(i.created_at) < threeDaysAgo
          ).length;
          setDelayedCount(delayed);
        }
      })
      .catch(err => console.error("Issues fetch error:", err));
    
    // ✅ SETUP NOTIFICATIONS
    const setupNotifications = async () => {
      try {
        const token = await requestPermissionAndGetToken();
        if (token && isMounted) {
          await api.put('/users/fcm-token', { token: token });
        }
      } catch (err) {
        console.error("Notification setup failed:", err);
      }
    };
    setupNotifications();
    
    return () => {
      isMounted = false;
      setRecentActivity([]); // ✅ KEEPS THE REFRESH SMOOTH
      setDelayedCount(0);
    };
  }, [user?.role, user?.id, user?.email]);

  // =============================================
  // 🎨 HEATMAP AUTO-SLIDER
  // =============================================
  useEffect(() => {
    const interval = setInterval(() => {
      setHeatmapIndex((prev) => (prev + 1) % HEATMAP_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [HEATMAP_IMAGES.length]);

  // reset reportConfig when modal opens / type changes
  useEffect(() => {
    if (!reportModal.open) return;
    if (reportModal.type === 'issues') {
      setReportConfig({ range: 'today', format: 'pdf' });
    } else if (reportModal.type === 'mess') {
      setReportConfig({ range: 'week', format: 'pdf' });
    } else {
      setReportConfig({ range: 'week', format: 'pdf' });
    }
  }, [reportModal.open, reportModal.type]);

  // =============================================
  // 🎯 HELPER FUNCTIONS
  // =============================================
  const closeReportModal = () => {
    setReportModal({ open: false, type: '' });
    setReportConfig({ range: 'week', format: 'pdf' });
    setGenerationProgress(0)
    setIsGenerating(false);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const startReportGeneration = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    setLoadingText("Initializing Secure Protocol...");
    
    const steps = [10, 30, 55, 75, 90, 100];
    let stepIndex = 0;
    
    const interval = setInterval(() => {
      const prog = steps[stepIndex];
      setGenerationProgress(prog);
      
      if (prog < 30) setLoadingText("🔐 Accessing Secure Data Vault...");
      else if (prog < 60) setLoadingText("📡 Aggregating Live Metrics...");
      else if (prog < 85) setLoadingText("🤖 AI Agent: Evaluating Patterns...");
      else setLoadingText("📄 Finalizing Document Structure...");
      
      stepIndex++;
      if (stepIndex >= steps.length) {
        clearInterval(interval);
        downloadRealFile();
      }
    }, 600);
  };

  const downloadRealFile = async () => {
  try {
    console.log("📥 Downloading...", {
      type: reportModal.type,
      range: reportConfig.range,
      format: reportConfig.format
    });

    // map UI values to backend-meaningful range keys (keeps your UI values intact)
    const rangeMap = {
      "today": "today",
      "yesterday": "yesterday",
      "3days": "3days",
      "week": "week",
      "2weeks": "2weeks",
      "month": "month",
      // map UI's 3months to backend's month or semester
      "3months": "3months",
      "semester": "semester",
      "all": "all"
    };

    const finalRange = rangeMap[reportConfig.range] || reportConfig.range;

    const resp = await api.get('/reports/download', {
      params: {
        type: reportModal.type.toLowerCase(),
        range: finalRange,
        format: reportConfig.format
      },
      responseType: 'blob'
    });

    // ensure valid file blob
    const blob = new Blob([resp.data]);
    const ext = reportConfig.format === 'excel' ? 'csv' : 'pdf';
    // use finalRange for filename so it matches what was sent
    const name = `CampusFix_${reportModal.type}_${finalRange}.${ext}`;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    showToast('success', 'Report Downloaded Successfully!');
    setIsGenerating(false);
    closeReportModal();

  } catch (error) {
    console.error("Report download failed:", error);
    showToast('error', 'Download failed. Check console.');
    setIsGenerating(false);
  }
};

  const resolutionRate = stats && stats.total_issues > 0 
    ? Math.round((stats.resolved / stats.total_issues) * 100) 
    : 0;

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} size={16} fill="#fbbf24" stroke="#fbbf24" />
        ))}
        {hasHalfStar && (
          <div style={{ position: 'relative', width: '16px', height: '16px' }}>
            <Star size={16} fill="none" stroke="#fbbf24" style={{ position: 'absolute', top: 0, left: 0 }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', overflow: 'hidden' }}>
              <Star size={16} fill="#fbbf24" stroke="#fbbf24" />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} size={16} fill="none" stroke="#cbd5e1" />
        ))}
        <span style={{ marginLeft: '6px', fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  // =============================================
  // 🎨 RENDER
  // =============================================
  return (
    <div className="container fade-in" style={{ position: 'relative', paddingBottom: '50px' }}>
      
      {/* ========== NOTICE BAR ========== */}
      <div className="notice-bar" style={{ 
        background: '#fff1f2', 
        border: '1px solid #fecdd3', 
        borderRadius: '12px', 
        color: '#be123c', 
        marginBottom: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        height: '45px', 
        overflow: 'hidden' 
      }}>
        <div style={{ 
          padding: '0 15px', 
          background: '#fff1f2', 
          zIndex: 10, 
          fontWeight: '700', 
          fontSize: '0.9rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          height: '100%' 
        }}>
          <AlertTriangle size={18} /> <span className="notice-label">NOTICE:</span>
        </div>
        <div style={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
          <div className="marquee-content" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            {URGENT_NOTICE_TEXT}
          </div>
        </div>
        <div style={{ 
          zIndex: 10, 
          background: '#fff1f2', 
          padding: '0 15px', 
          borderLeft: '1px solid #fecdd3', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <button 
            onClick={() => setShowAllNotices(true)} 
            className="view-all-btn" 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#9f1239', 
              fontWeight: '700', 
              fontSize: '0.8rem', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px' 
            }}
          >
            <List size={14} /> <span>View All</span>
          </button>
        </div>
      </div>

      {/* ========== HERO BANNER ========== */}
      <div 
        className="glass-panel hero-banner" 
        style={{ 
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
          color: 'white', 
          border: 'none', 
          marginBottom: '2rem' 
        }}
      >
        <div className="hero-date" style={{ 
          fontSize: '0.9rem', 
          opacity: 0.8, 
          textTransform: 'uppercase', 
          letterSpacing: '1px', 
          marginBottom: '5px' 
        }}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <h1 className="hero-title" style={{ 
          fontSize: '2.5rem', 
          fontWeight: '800', 
          marginBottom: '0.5rem' 
        }}>
          Welcome, {(user?.full_name || 'User').split(' ')[0]}! 👋
        </h1>
        <p className="hero-desc" style={{ 
          fontSize: '1.1rem', 
          opacity: 0.9, 
          maxWidth: '600px' 
        }}>
          {user.role === 'student' 
            ? 'Track your complaints & view campus updates.' 
            : 'Overview of maintenance performance & analytics.'}
        </p>
        <button 
          onClick={() => setShowEscalation(true)} 
          className="hero-btn" 
          style={{ 
            marginTop: '20px', 
            background: 'white', 
            color: '#4f46e5', 
            border: 'none', 
            padding: '10px 20px', 
            borderRadius: '8px', 
            fontWeight: '600', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer' 
          }}
        >
          <Info size={18} /> <span>How Escalation Works</span>
        </button>
      </div>

      {/* ========== STATS GRID ========== */}
      <div 
        className="stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '2rem'
        }}
      >
        {statsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard 
              link="/issues" 
              icon="📂" 
              value={stats.total_issues} 
              label="Total Issues" 
              color="rgba(255, 255, 255, 0.9)" 
              textColor="#1e293b" 
              borderColor="#e2e8f0" 
            />
            <StatCard 
              link="/issues" 
              icon="⏳" 
              value={stats.pending} 
              label="Pending" 
              color="#fffbeb" 
              textColor="#b45309" 
              borderColor="#fcd34d" 
            />
            <StatCard 
              link="/issues" 
              icon="✅" 
              value={stats.resolved} 
              label="Resolved" 
              color="#f0fdf4" 
              textColor="#15803d" 
              borderColor="#86efac" 
            />
            {user.role === 'student' ? (
              <StatCard 
                link="/issues" 
                icon="👤" 
                value={stats.my_issues} 
                label="My Reports" 
                color="#eef2ff" 
                textColor="#4338ca" 
                borderColor="#a5b4fc" 
              />
            ) : (
              <StatCard 
                link="/issues" 
                icon="🔥" 
                value={delayedCount} 
                label="Delayed (>3 Days)" 
                color="#fee2e2" 
                textColor="#991b1b" 
                borderColor="#fca5a5" 
              />
            )}
          </>
        )}
      </div>

      {/* ========== MAIN GRID ========== */}
      <div className="grid-2 main-grid" style={{ alignItems: 'start', gap: '25px' }}>
        
        {/* === LEFT COLUMN === */}
        <div className="left-column" style={{ display: 'grid', gap: '20px' }}>
          
          {/* HEATMAP */}
          <div className="glass-panel heatmap-panel" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
            <div style={{ 
              padding: '15px', 
              borderBottom: '1px solid #e2e8f0', 
              background: 'white', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <h3 className="panel-title" style={{ 
                fontSize: '1.1rem', 
                fontWeight: 700, 
                color: '#1e293b', 
                margin: 0, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                🔥 Live Heatmap
              </h3>
              <div className="heatmap-counter" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {heatmapIndex + 1} / 7
              </div>
            </div>
            <div 
              className="heatmap-img-container" 
              style={{ 
                position: 'relative', 
                height: '220px', 
                background: '#f1f5f9', 
                cursor: 'zoom-in' 
              }} 
              onClick={() => setZoomImage(HEATMAP_IMAGES[heatmapIndex])}
            >
              <img 
                src={HEATMAP_IMAGES[heatmapIndex]} 
                alt="Heatmap" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  transition: 'opacity 0.5s ease-in-out' 
                }} 
                onError={(e) => { e.target.src = '/HeatMap/HeatMap1.png' }} 
              />
              <div 
                className="zoom-badge" 
                style={{ 
                  position: 'absolute', 
                  bottom: '10px', 
                  right: '10px', 
                  background: 'rgba(0,0,0,0.6)', 
                  color: 'white', 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  fontSize: '0.7rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}
              >
                <Maximize2 size={12} /> <span className="zoom-text">Full Screen</span>
              </div>
            </div>
            <div className="heatmap-dots" style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '6px', 
              padding: '10px' 
            }}>
              {HEATMAP_IMAGES.map((_, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setHeatmapIndex(idx)} 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: idx === heatmapIndex ? '#4f46e5' : '#cbd5e1', 
                    cursor: 'pointer', 
                    transition: 'all 0.3s' 
                  }} 
                />
              ))}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="glass-panel quick-actions-panel">
            <h3 className="panel-title" style={{ 
              fontSize: '1.2rem', 
              fontWeight: 700, 
              color: '#1e293b', 
              marginBottom: '1.5rem' 
            }}>
              🚀 Quick Actions
            </h3>
            <div className="quick-actions-grid" style={{ display: 'grid', gap: '10px' }}>
              <Link 
                to="/issues" 
                className="btn-grad main-action-btn" 
                style={{ 
                  textAlign: 'center', 
                  textDecoration: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px' 
                }}
              >
                <span>{user.role === 'student' ? '➕ Report Issue' : '📋 Manage Issues'}</span>
              </Link>
              <div className="action-grid-2" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '10px' 
              }}>
                <Link to="/contacts" className="btn-ghost action-btn" style={{ textAlign: 'center' }}>
                  <span className="action-icon">📞</span> <span className="action-text">Contacts</span>
                </Link>
                <Link to="/profile" className="btn-ghost action-btn" style={{ textAlign: 'center' }}>
                  <span className="action-icon">👤</span> <span className="action-text">Profile</span>
                </Link>
                {user.role !== 'student' && (
                  <Link to="/students" className="btn-ghost action-btn" style={{ textAlign: 'center' }}>
                    <span className="action-icon">🎓</span> <span className="action-text">Students</span>
                  </Link>
                )}
                {user.role !== 'student' && (
                  <Link 
                    to="/mess-rating" 
                    className="btn-ghost action-btn" 
                    style={{ textAlign: 'center', borderColor: '#f97316', color: '#ea580c' }}
                  >
                    <span className="action-icon">🍔</span> <span className="action-text">Mess</span>
                  </Link>
                )}
              </div>
              
              {user.role !== 'student' && (
                <div className="admin-reports" style={{ 
                  marginTop: '15px', 
                  borderTop: '1px solid #e2e8f0', 
                  paddingTop: '15px' 
                }}>
                  <div className="admin-label" style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '700', 
                    color: '#94a3b8', 
                    textTransform: 'uppercase', 
                    marginBottom: '10px' 
                  }}>
                    Admin Reports
                  </div>
                  <div className="report-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '10px' 
                  }}>
                    <button 
                      onClick={() => {
                      setReportModal({ open: true, type: 'issues' });
                      setReportConfig({ range: 'today', format: 'pdf' });
                    }}
                      className="btn-ghost report-btn" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '5px', 
                        borderColor: '#6366f1', 
                        color: '#6366f1' 
                      }}
                    >
                      <FileText size={16} /> <span>Issues</span>
                    </button>
                    <button 
                      onClick={() => {
                      setReportModal({ open: true, type: 'mess' });
                      setReportConfig({ range: 'week', format: 'pdf' });
                    }}
                      className="btn-ghost report-btn" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '5px', 
                        borderColor: '#ec4899', 
                        color: '#ec4899' 
                      }}
                    >
                      <FileSpreadsheet size={16} /> <span>Mess</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STATUS BOARD */}
          <div className="glass-panel status-panel">
            <h3 className="panel-title" style={{ 
              fontSize: '1.2rem', 
              fontWeight: 700, 
              color: '#1e293b', 
              marginBottom: '1.5rem' 
            }}>
              📊 Campus Resolution Pulse
            </h3>
            <div style={{ marginBottom: '15px' }}>
              <div className="flex-between" style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                <span className="progress-label" style={{ fontWeight: '600', color: '#475569' }}>
                  Overall Progress
                </span>
                <span className="progress-value" style={{ fontWeight: '700', color: '#4f46e5' }}>
                  {resolutionRate}%
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '10px', 
                background: '#e2e8f0', 
                borderRadius: '5px', 
                overflow: 'hidden', 
                display: 'flex' 
              }}>
                <div style={{ 
                  width: `${resolutionRate}%`, 
                  background: '#10b981', 
                  transition: 'width 1s ease' 
                }}></div>
                <div style={{ 
                  width: `${100 - resolutionRate}%`, 
                  background: '#f59e0b', 
                  transition: 'width 1s ease' 
                }}></div>
              </div>
            </div>
            <div className="status-metrics" style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '15px' 
            }}>
              <div className="metric-card" style={{ 
                background: '#f8fafc', 
                padding: '10px', 
                borderRadius: '8px' 
              }}>
                <div className="metric-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Avg. Solve Time
                </div>
                <div className="metric-value" style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '700', 
                  color: '#1e293b' 
                }}>
                  28 Hours
                </div>
              </div>
              <div className="metric-card" style={{ 
                background: '#f8fafc', 
                padding: '10px', 
                borderRadius: '8px' 
              }}>
                <div className="metric-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Satisfaction
                </div>
                <div className="metric-value" style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '700', 
                  color: '#d97706' 
                }}>
                  4.2 / 5.0
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="right-column" style={{ display: 'grid', gap: '20px' }}>
          
          <CampusMap role={user.role} issueCount={stats ? stats.pending : 0} />

          {user.role === 'student' ? (
            <div 
              className="glass-panel mess-rating-panel" 
              style={{ 
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', 
                border: '1px solid #fed7aa', 
                textAlign: 'center', 
                padding: '1.5rem' 
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🍔</div>
              <h3 className="mess-title" style={{ 
                fontSize: '1.2rem', 
                fontWeight: '800', 
                color: '#9a3412', 
                marginBottom: '5px' 
              }}>
                Mess Quality Rating
              </h3>
              <Link 
                to="/mess-rating" 
                className="btn-grad mess-btn" 
                style={{ 
                  background: 'linear-gradient(to right, #f97316, #ea580c)', 
                  display: 'inline-block', 
                  width: '100%', 
                  textDecoration: 'none', 
                  padding: '10px', 
                  fontSize: '0.9rem' 
                }}
              >
                ⭐ Rate Now
              </Link>
            </div>
          ) : (
            <div className="glass-panel staff-panel">
              <h3 className="panel-title" style={{ 
                fontSize: '1.2rem', 
                fontWeight: 700, 
                color: '#1e293b', 
                marginBottom: '1.5rem' 
              }}>
                👷 Staff Performance
              </h3>
              <div className="staff-list" style={{ display: 'grid', gap: '12px' }}>
                {WORKER_PERFORMANCE.map((w, i) => (
                  <div 
                    key={i} 
                    className="staff-card" 
                    style={{
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div 
                        className="staff-icon" 
                        style={{ 
                          background: '#e0e7ff', 
                          padding: '10px', 
                          borderRadius: '10px', 
                          color: '#4338ca' 
                        }}
                      >
                        {w.icon}
                      </div>
                      <div className="staff-info">
                        <div 
                          className="staff-role" 
                          style={{ 
                            fontWeight: '700', 
                            color: '#1e293b', 
                            fontSize: '0.95rem', 
                            marginBottom: '2px' 
                          }}
                        >
                          {w.role}
                        </div>
                        <div className="staff-tasks" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {w.tasks} Tasks
                        </div>
                      </div>
                    </div>
                    <div className="staff-rating">{renderStars(w.rating)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.role === 'student' ? (
            <div className="glass-panel activity-panel">
              <h3 className="panel-title" style={{ 
                fontSize: '1.2rem', 
                fontWeight: 700, 
                color: '#1e293b', 
                marginBottom: '1.5rem' 
              }}>
                ⚡ Your Activity
              </h3>
              <div className="activity-list" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px' 
              }}>
                {recentActivity.length > 0 ? recentActivity.map(issue => {
                  const displayTitle = issue.title || issue.description || issue.category || "Untitled Issue";
                  const truncatedTitle = displayTitle.length > 30 
                    ? displayTitle.slice(0, 30) + '...' 
                    : displayTitle;
                  const statusColor = issue.status === 'Solved' ? '#16a34a' :
                    issue.status === 'In Progress' ? '#d97706' : '#991b1b';
                  const statusBg = issue.status === 'Solved' ? '#dcfce7' :
                    issue.status === 'In Progress' ? '#fef3c7' : '#fee2e2';
                  
                  return (
                    <Link
                      key={issue.id}
                      to="/issues"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      <div 
                        className="activity-item" 
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #f1f5f9',
                          background: '#fafafa',
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fafafa';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div className="flex-between activity-header" style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ 
                              background: statusBg, 
                              padding: '6px', 
                              borderRadius: '50%', 
                              color: statusColor 
                            }}>
                              <Activity size={14}/>
                            </div>
                            <span 
                              className="activity-title" 
                              style={{ 
                                fontWeight: '700', 
                                fontSize: '0.85rem', 
                                color: '#1e293b' 
                              }}
                            >
                              {truncatedTitle}
                            </span>
                          </div>
                        </div>
                        <div 
                          className="activity-tags" 
                          style={{ 
                            display: 'flex', 
                            gap: '12px', 
                            fontSize: '0.75rem', 
                            color: '#64748b', 
                            marginLeft: '30px' 
                          }}
                        >
                          {issue.category && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Tag size={12} />
                              <span>{issue.category}</span>
                            </div>
                          )}
                          {issue.sub_location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} />
                              <span>{issue.sub_location}</span>
                            </div>
                          )}
                        </div>
                        <div 
                          className="flex-between activity-footer" 
                          style={{ marginTop: '8px', marginLeft: '30px' }}
                        >
                          <span 
                            className="activity-status" 
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: statusBg,
                              color: statusColor,
                              fontWeight: '600'
                            }}
                          >
                            {issue.status || 'Pending'}
                          </span>
                          <span className="activity-date" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {new Date(issue.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                }) : (
                  <div 
                    className="no-activity" 
                    style={{
                      textAlign: 'center', 
                      color: '#94a3b8', 
                      fontSize: '0.9rem', 
                      padding: '20px'
                    }}
                  >
                    No recent issues. <Link to="/issues" style={{ color: '#4f46e5', fontWeight: '600' }}>
                      Report one now!
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel department-panel">
              <h3 className="panel-title" style={{ 
                fontSize: '1.2rem', 
                fontWeight: 700, 
                color: '#1e293b', 
                marginBottom: '1.5rem' 
              }}>
                🏢 Department Status
              </h3>
              <div className="department-list" style={{ display: 'grid', gap: '10px' }}>
                <div className="flex-between dept-item" style={{ fontSize: '0.9rem' }}>
                  <span style={{ color: '#475569' }}>Academic Blocks</span>
                  <span className="dept-value" style={{ fontWeight: '700', color: '#1e293b' }}>
                    12 Active
                  </span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '6px', 
                  background: '#e2e8f0', 
                  borderRadius: '3px' 
                }}>
                  <div style={{ 
                    width: '30%', 
                    height: '100%', 
                    background: '#3b82f6', 
                    borderRadius: '3px' 
                  }}></div>
                </div>
                <div 
                  className="flex-between dept-item" 
                  style={{ fontSize: '0.9rem', marginTop: '10px' }}
                >
                  <span style={{ color: '#475569' }}>Hostels</span>
                  <span className="dept-value" style={{ fontWeight: '700', color: '#1e293b' }}>
                    45 Active
                  </span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '6px', 
                  background: '#e2e8f0', 
                  borderRadius: '3px' 
                }}>
                  <div style={{ 
                    width: '70%', 
                    height: '100%', 
                    background: '#ef4444', 
                    borderRadius: '3px' 
                  }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== MODALS ========== */}
      
      {/* ZOOM HEATMAP */}
      {zoomImage && (
        <div 
          className="modal-overlay" 
          onClick={() => setZoomImage(null)} 
          style={{ background: 'rgba(0,0,0,0.9)', zIndex: 3000 }}
        >
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <button 
              onClick={() => setZoomImage(null)} 
              style={{ 
                position: 'absolute', 
                top: '20px', 
                right: '30px', 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                fontSize: '3rem', 
                cursor: 'pointer', 
                zIndex: 3001 
              }}
            >
              &times;
            </button>
            <img 
              src={zoomImage} 
              alt="Full Heatmap" 
              style={{ 
                maxWidth: '95%', 
                maxHeight: '95vh', 
                borderRadius: '8px', 
                boxShadow: '0 0 50px rgba(0,0,0,0.5)' 
              }} 
            />
          </div>
        </div>
      )}

      {/* REPORT GENERATION MODAL */}
      {reportModal.open && (
        <div 
          className="modal-overlay" 
          onClick={() => !isGenerating && closeReportModal()} 
        >
          <div 
            className="glass-panel modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ width: '400px', textAlign: 'center' }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                CampusFix Intelligence
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Generate {reportModal.type} reports
              </p>
            </div>

            {isGenerating ? (
              <div style={{ padding: '20px 0' }}>
                <div style={{ 
                  marginBottom: '15px', 
                  fontWeight: '700', 
                  color: '#4f46e5', 
                  fontSize: '1.2rem' 
                }}>
                  {generationProgress}%
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '8px', 
                  background: '#e2e8f0', 
                  borderRadius: '4px', 
                  overflow: 'hidden', 
                  marginBottom: '15px' 
                }}>
                  <div style={{ 
                    width: `${generationProgress}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #4f46e5, #ec4899)', 
                    transition: 'width 0.3s ease' 
                  }}></div>
                </div>
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: '#64748b', 
                  fontStyle: 'italic', 
                  height: '20px', 
                  transition: 'all 0.3s ease' 
                }}>
                  {loadingText}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.85rem', 
                    fontWeight: '600', 
                    color: '#475569', 
                    marginBottom: '5px' 
                  }}>
                    Time Range
                  </label>
                  <select 
                    className="glass-input" 
                    value={reportConfig.range} 
                    onChange={e => setReportConfig({ ...reportConfig, range: e.target.value })} 
                    style={{ width: '100%' }}
                  >
                    {reportModal.type === 'issues' ? (
                      <>
                        <option value="today">Today</option>
                        <option value="yesterday">Till Yesterday</option>
                        <option value="3days">Last 3 Days</option>
                        <option value="week">Last Week</option>
                        <option value="month">Last 1 Month</option>
                        <option value="semester">Full Semester</option>
                        <option value="all">All Time History</option>
                      </>
                    ) : (
                      <>
                        <option value="week">This Week</option>
                        <option value="2weeks">Last 2 Weeks</option>
                        <option value="month">1 Month</option>
                        <option value="3months">Last 3 Months</option>
                        <option value="semester">Full Semester</option>
                      </>
                    )}
                    </select>

                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.85rem', 
                      fontWeight: '600', 
                      color: '#475569', 
                      marginBottom: '8px' 
                    }}>
                      Format
                    </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => setReportConfig({ ...reportConfig, format: 'pdf' })} 
                      style={{ 
                        flex: 1, 
                        padding: '10px', 
                        borderRadius: '8px', 
                        border: reportConfig.format === 'pdf' ? '2px solid #ef4444' : '1px solid #e2e8f0', 
                        background: reportConfig.format === 'pdf' ? '#fef2f2' : 'white', 
                        color: reportConfig.format === 'pdf' ? '#ef4444' : '#64748b', 
                        fontWeight: '600', 
                        cursor: 'pointer' 
                      }}
                    >
                      📄 PDF
                    </button>
                    <button 
                      onClick={() => setReportConfig({ ...reportConfig, format: 'excel' })} 
                      style={{ 
                        flex: 1, 
                        padding: '10px', 
                        borderRadius: '8px', 
                        border: reportConfig.format === 'excel' ? '2px solid #10b981' : '1px solid #e2e8f0', 
                        background: reportConfig.format === 'excel' ? '#ecfdf5' : 'white', 
                        color: reportConfig.format === 'excel' ? '#10b981' : '#64748b', 
                        fontWeight: '600', 
                        cursor: 'pointer' 
                      }}
                    >
                      📊 Excel
                    </button>
                  </div>
                </div>

                <button 
                  onClick={startReportGeneration} 
                  className="btn-grad" 
                  style={{ width: '100%', padding: '12px' }}
                >
                  Download Report
                </button>
              </div>
            )}

            {!isGenerating && (
              <button 
                onClick={closeReportModal}
                className="btn-close"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* NOTICES MODAL */}
      {showAllNotices && (
        <div className="modal-overlay" onClick={() => setShowAllNotices(false)}>
          <div 
            className="glass-panel modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ width: '90%', maxWidth: '500px' }}
          >
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h2 style={{ color: '#be123c', fontSize: '1.4rem', fontWeight: '800' }}>
                Campus Notices
              </h2>
              <button 
                className="btn-close" 
                style={{ position: 'static' }} 
                onClick={() => setShowAllNotices(false)}
              >
                ×
              </button>
            </div>
            <div style={{ 
              display: 'grid', 
              gap: '15px', 
              maxHeight: '60vh', 
              overflowY: 'auto', 
              paddingRight: '5px' 
            }}>
              {NOTICES_LIST.map((notice, index) => (
                <div 
                  key={index} 
                  style={{ 
                    padding: '15px', 
                    background: '#fff1f2', 
                    borderLeft: '4px solid #be123c', 
                    borderRadius: '0 8px 8px 0', 
                    color: '#881337', 
                    fontSize: '0.95rem' 
                  }}
                >
                  {notice}
                </div>
              ))}
            </div>
            <div style={{ 
              marginTop: '20px', 
              display: 'flex', 
              justifyContent: 'space-between' 
            }}>
              <button 
                onClick={() => navigate('/notices')} 
                style={{ 
                  background: '#4f46e5', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: '600' 
                }}
              >
                View All History
              </button>
              <button 
                onClick={() => setShowAllNotices(false)} 
                style={{ 
                  background: '#334155', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  cursor: 'pointer' 
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESCALATION MODAL */}
      {showEscalation && (
        <div className="modal-overlay" onClick={() => setShowEscalation(false)}>
          <div 
            className="glass-panel modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ textAlign: 'center' }}
          >
            <button className="btn-close" onClick={() => setShowEscalation(false)}>×</button>
            <h2 style={{ color: '#4f46e5', marginBottom: '10px' }}>🚀 Escalation Protocol</h2>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '15px' 
            }}>
              <LevelCard 
                title="Level 1: Technician" 
                desc="Assigned immediately. SLA: 24-48h" 
                color="#e0e7ff" 
                icon="🔧" 
              />
              <div style={{ height: '20px', width: '2px', background: '#cbd5e1' }}></div>
              <LevelCard 
                title="Level 2: Warden" 
                desc="Auto-notified if breached Level 1." 
                color="#fef9c3" 
                icon="👮" 
              />
              <div style={{ height: '20px', width: '2px', background: '#cbd5e1' }}></div>
              <LevelCard 
                title="Level 3: Chief Warden" 
                desc="Escalated if unresolved for 72h." 
                color="#fed7aa" 
                icon="👔" 
              />
              <div style={{ height: '20px', width: '2px', background: '#cbd5e1' }}></div>
              <LevelCard 
                title="Level 4: Director" 
                desc="Final Escalation for critical failures." 
                color="#fecdd3" 
                icon="🚨" 
              />
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div 
          className="toast-notification" 
          style={{ 
            position: 'fixed', 
            bottom: '30px', 
            right: '30px', 
            zIndex: 9999, 
            background: 'rgba(255, 255, 255, 0.9)', 
            backdropFilter: 'blur(10px)', 
            padding: '15px 25px', 
            borderRadius: '12px', 
            border: '1px solid white', 
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)', 
            borderLeft: `5px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            animation: 'slideUp 0.3s ease-out' 
          }}
        >
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span style={{ fontWeight: '600', color: '#1e293b' }}>{toast.message}</span>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .marquee-content { 
          display: inline-block; 
          white-space: nowrap; 
          animation: marquee 35s linear infinite; 
          padding-left: 100%; 
        }
        .marquee-content:hover { animation-play-state: paused; }
        
        @keyframes marquee { 
          0% { transform: translateX(0); } 
          100% { transform: translateX(-100%); } 
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes shimmer {
          0% { background-position: -468px 0; }
          100% { background-position: 468px 0; }
        }
        
        .skeleton {
          animation: shimmer 1.5s infinite;
          background: linear-gradient(to right, #f0f0f0 8%, #e0e0e0 18%, #f0f0f0 33%);
          background-size: 800px 104px;
        }
        
        .modal-overlay { 
          position: fixed; 
          top: 0; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          background: rgba(0,0,0,0.5); 
          backdrop-filter: blur(5px); 
          z-index: 2000; 
          display: flex; 
          align-items: center; 
          justify-content: center;
        }
        
        .modal-content { 
          width: 90%; 
          max-width: 450px; 
          padding: 30px; 
          position: relative; 
          animation: fadeIn 0.3s; 
          background: white; 
          border-radius: 16px;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .btn-close { 
          position: absolute; 
          top: 15px; 
          right: 15px; 
          background: none; 
          border: none; 
          font-size: 1.5rem; 
          cursor: pointer; 
          opacity: 0.5; 
          color: #333; 
        }
        .btn-close:hover { opacity: 1; }
        
        .stats-grid .stat-card {
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .stats-grid .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.12);
        }
        
        .stats-grid .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }
        
        .stats-grid .stat-card:hover::before {
          left: 100%;
        }
        
        .stat-card-icon {
          font-size: 2.2rem;
          display: block;
          margin-bottom: 8px;
        }
        
        .stat-card-value {
          font-size: 2rem;
          font-weight: 800;
          line-height: 1;
          margin: 0;
        }
        
        .stat-card-label {
          font-size: 0.9rem;
          font-weight: 600;
          opacity: 0.8;
          margin: 4px 0 0 0;
        }
        
        /* RESPONSIVE DESIGN */
        @media (min-width: 1920px) {
          .container { max-width: 1800px; margin: 0 auto; padding: 0 40px !important; }
          .hero-title { font-size: 3rem !important; }
          .glass-panel { padding: 2rem !important; }
          .main-grid { gap: 35px !important; }
        }
        
        @media (min-width: 1440px) and (max-width: 1919px) {
          .container { max-width: 1400px; margin: 0 auto; }
          .hero-title { font-size: 2.5rem !important; }
        }
        
        @media (min-width: 1024px) and (max-width: 1439px) {
          .container { padding: 0 20px !important; }
          .hero-title { font-size: 2.2rem !important; }
        }
        
        @media (min-width: 768px) and (max-width: 1023px) {
          .container { padding: 0 16px !important; }
          .main-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
          .stats-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 10px !important; }
          .stats-grid .stat-card { padding: 14px !important; border-radius: 14px !important; }
          .stat-card-icon { font-size: 1.6rem !important; }
          .stat-card-value { font-size: 1.4rem !important; }
          .stat-card-label { font-size: 0.75rem !important; }
          .hero-title { font-size: 1.9rem !important; }
          .hero-desc { font-size: 1rem !important; }
          .panel-title { font-size: 1.05rem !important; }
          .glass-panel { padding: 18px !important; }
          
          /* Modal on Tablet/Mobile */
          .modal-content { width: 95% !important; padding: 20px !important; }
          .escalation-card { padding: 12px !important; gap: 10px !important; }
          .escalation-icon { font-size: 1.3rem !important; }
          .escalation-title { font-size: 0.95rem !important; }
          .escalation-desc { font-size: 0.8rem !important; }
        }
        
        @media (min-width: 480px) and (max-width: 767px) {
          .container { padding: 0 10px !important; padding-bottom: 30px !important; }
          .stats-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; margin-bottom: 1.5rem !important; }
          .stats-grid .stat-card { padding: 10px !important; border-radius: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important; }
          .stat-card-icon { font-size: 1.3rem !important; margin-bottom: 4px !important; }
          .stat-card-value { font-size: 1.1rem !important; margin-bottom: 2px !important; }
          .stat-card-label { font-size: 0.7rem !important; line-height: 1.2 !important; }
          .notice-bar { height: 38px !important; font-size: 0.75rem !important; margin-bottom: 14px !important; border-radius: 8px !important; }
          .notice-label { font-size: 0.7rem !important; }
          .view-all-btn { font-size: 0.7rem !important; gap: 3px !important; }
          .hero-banner { padding: 16px !important; margin-bottom: 1.5rem !important; border-radius: 12px !important; }
          .hero-date { font-size: 0.7rem !important; margin-bottom: 4px !important; }
          .hero-title { font-size: 1.6rem !important; margin-bottom: 0.4rem !important; line-height: 1.2 !important; }
          .hero-desc { font-size: 0.85rem !important; max-width: 100% !important; line-height: 1.4 !important; }
          .hero-btn { padding: 8px 14px !important; font-size: 0.8rem !important; margin-top: 14px !important; }
          .main-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .left-column, .right-column { gap: 16px !important; }
          .glass-panel { padding: 12px !important; border-radius: 10px !important; }
          .panel-title { font-size: 0.95rem !important; margin-bottom: 1rem !important; }
          .heatmap-img-container { height: 160px !important; }
          .zoom-badge { padding: 3px 6px !important; font-size: 0.6rem !important; }
          .zoom-text { display: none !important; }
          .heatmap-dots { gap: 4px !important; padding: 8px !important; }
          .heatmap-dots div { width: 6px !important; height: 6px !important; }
          .quick-actions-grid { gap: 8px !important; }
          .main-action-btn { padding: 10px !important; font-size: 0.85rem !important; }
          .action-grid-2 { gap: 8px !important; }
          .action-btn { padding: 10px 6px !important; font-size: 0.75rem !important; display: flex !important; flex-direction: column !important; align-items: center !important; gap: 4px !important; }
          .action-icon { font-size: 1.3rem !important; }
          .action-text { font-size: 0.7rem !important; }
          .staff-list { gap: 10px !important; }
          .staff-card { padding: 10px !important; flex-direction: column !important; text-align: center !important; gap: 8px !important; }
          .staff-role { font-size: 0.85rem !important; }
          .staff-tasks { font-size: 0.7rem !important; }
          .activity-item { padding: 10px !important; }
          .activity-title { font-size: 0.8rem !important; }
          .activity-tags { margin-left: 0 !important; font-size: 0.7rem !important; }
          .activity-status { font-size: 0.65rem !important; }
          
          /* FIX: Speed up marquee on mobile */
          .marquee-content { animation-duration: 11s !important; }
        }
        
        @media (min-width: 375px) and (max-width: 479px) {
          .container { padding: 0 8px !important; padding-bottom: 25px !important; }
          .stats-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 6px !important; margin-bottom: 1.2rem !important; }
          .stats-grid .stat-card { padding: 8px 6px !important; border-radius: 10px !important; box-shadow: 0 3px 10px rgba(0,0,0,0.05) !important; }
          .stat-card-icon { font-size: 1.1rem !important; margin-bottom: 3px !important; }
          .stat-card-value { font-size: 0.95rem !important; font-weight: 700 !important; }
          .stat-card-label { font-size: 0.6rem !important; line-height: 1.1 !important; word-break: break-word !important; }
          .hero-banner { padding: 14px !important; margin-bottom: 1.2rem !important; }
          .hero-title { font-size: 1.4rem !important; }
          .hero-desc { font-size: 0.8rem !important; }
          .main-grid { gap: 14px !important; }
          .left-column, .right-column { gap: 14px !important; }
          .glass-panel { padding: 10px !important; }
          .panel-title { font-size: 0.9rem !important; }
          
           /* FIX: Speed up marquee on mobile */
           .marquee-content { animation-duration: 11s !important; }
        }
        
        @media (max-width: 374px) {
          .container { padding: 0 6px !important; padding-bottom: 20px !important; }
          .stats-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 4px !important; margin-bottom: 1rem !important; }
          .stats-grid .stat-card { padding: 6px 4px !important; border-radius: 8px !important; box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important; }
          .stat-card-icon { font-size: 0.95rem !important; margin-bottom: 2px !important; }
          .stat-card-value { font-size: 0.85rem !important; font-weight: 700 !important; }
          .stat-card-label { font-size: 0.55rem !important; line-height: 1.1 !important; word-break: break-word !important; hyphens: auto !important; }
          .hero-banner { padding: 12px !important; margin-bottom: 1rem !important; }
          .hero-date { font-size: 0.6rem !important; }
          .hero-title { font-size: 1.2rem !important; }
          .hero-desc { font-size: 0.75rem !important; }
          .main-grid { gap: 12px !important; }
          .left-column, .right-column { gap: 12px !important; }
          .glass-panel { padding: 8px !important; }
          .panel-title { font-size: 0.85rem !important; }
          .heatmap-img-container { height: 120px !important; }
          .main-action-btn { padding: 8px !important; font-size: 0.75rem !important; }
          .action-btn { padding: 8px 4px !important; }
          .action-icon { font-size: 1.1rem !important; }
          .action-text { font-size: 0.6rem !important; }
          
           /* FIX: Speed up marquee on mobile */
           .marquee-content { animation-duration: 11s !important; }
           
           /* Modal fixes specific for tiny phones */
           .modal-content { width: 98% !important; padding: 15px !important; }
           .escalation-card { padding: 10px !important; gap: 8px !important; }
           .escalation-title { font-size: 0.85rem !important; }
           .escalation-desc { font-size: 0.75rem !important; }
        }
      `}</style>
    </div>
  );
}

// =============================================
// 🎨 COMPONENT: STAT CARD
// =============================================
function StatCard({ icon, value, label, color, textColor, borderColor, link }) {
  const cardContent = (
    <div 
      className="glass-panel stat-card" 
      style={{
        background: color,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        border: `1px solid ${borderColor}`,
        padding: '20px',
        cursor: link ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '120px'
      }}
    >
      <span className="stat-card-icon">{icon}</span>
      <h3 className="stat-card-value" style={{ color: textColor }}>{value}</h3>
      <p className="stat-card-label" style={{ color: textColor }}>{label}</p>
    </div>
  );
  
  return link ? (
    <Link to={link} style={{ textDecoration: 'none' }}>{cardContent}</Link>
  ) : cardContent;
}

// =============================================
// 🎨 COMPONENT: SKELETON LOADING
// =============================================
function StatCardSkeleton() {
  return (
    <div 
      className="glass-panel stat-card skeleton" 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        border: '1px solid #e2e8f0',
        padding: '20px',
        minHeight: '120px',
        background: '#f8fafc'
      }}
    >
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '50%', 
        background: '#e2e8f0', 
        marginBottom: '8px' 
      }}></div>
      <div style={{ 
        width: '60px', 
        height: '24px', 
        borderRadius: '4px', 
        background: '#e2e8f0', 
        marginBottom: '4px' 
      }}></div>
      <div style={{ 
        width: '80px', 
        height: '16px', 
        borderRadius: '4px', 
        background: '#e2e8f0' 
      }}></div>
    </div>
  );
}

// =============================================
// 🎨 COMPONENT: ESCALATION LEVEL CARD
// =============================================
function LevelCard({ title, desc, color, icon }) {
  return (
    <div className="escalation-card" style={{ 
      background: color, 
      padding: '15px', 
      borderRadius: '12px', 
      width: '100%', 
      textAlign: 'left', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '15px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)' 
    }}>
      <div className="escalation-icon" style={{ fontSize: '1.5rem' }}>{icon}</div>
      <div>
        <div className="escalation-title" style={{ fontWeight: '700', color: '#1e293b' }}>{title}</div>
        <div className="escalation-desc" style={{ fontSize: '0.8rem', color: '#475569' }}>{desc}</div>
      </div>
    </div>
  );
}
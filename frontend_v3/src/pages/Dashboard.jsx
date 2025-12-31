import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import { requestPermissionAndGetToken } from '../firebase'; 
import { 
  AlertTriangle, Info, Zap, Droplets, Hammer, UserCheck, 
  Activity, Star, List, FileText, FileSpreadsheet, X, Maximize2
} from 'lucide-react';
import CampusMap from '../components/CampusMap'; // ✅ Correctly Imported

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  
  // --- REAL DATA STATES ---
  const [delayedCount, setDelayedCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);

  // --- HEATMAP STATES ---
  const [heatmapIndex, setHeatmapIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState(null);
  // Ensure these images exist in public/HeatMap/ folder
  const HEATMAP_IMAGES = [
    "/HeatMap/HeatMap1.png", "/HeatMap/HeatMap2.png", "/HeatMap/HeatMap3.png", 
    "/HeatMap/HeatMap4.png", "/HeatMap/HeatMap5.png", "/HeatMap/HeatMap6.png", "/HeatMap/HeatMap7.png"
  ];

  // Modal States
  const [showEscalation, setShowEscalation] = useState(false);
  const [showAllNotices, setShowAllNotices] = useState(false);
  const [reportModal, setReportModal] = useState({ open: false, type: '' }); 
  
  // Report Generation States
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

  const URGENT_NOTICE_TEXT = NOTICES_LIST.join("   •   ");

  // --- 1. INITIAL DATA FETCHING ---
  useEffect(() => {
    // Fetch Stats
    api.get('/stats').then(res => setStats(res.data)).catch(err => console.error("Stats error", err));

    // Fetch Issues for "Real Delayed Count" & "Student Activity"
    api.get('/issues').then(res => {
        const issues = res.data;
        if (user.role === 'student') {
            // Get recent activity (Top 3)
            setRecentActivity(issues.slice(0, 3));
        } else {
            // Calculate Delayed Issues (> 3 days old and still Pending)
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const delayed = issues.filter(i => i.status === 'Pending' && new Date(i.created_at) < threeDaysAgo).length;
            setDelayedCount(delayed);
        }
    }).catch(err => console.error("Issues fetch error", err));

    // Notification Setup
    const setupNotifications = async () => {
      try {
        const token = await requestPermissionAndGetToken();
        if (token) await api.put('/users/fcm-token', { token: token });
      } catch (err) { console.error("Notification setup failed:", err); }
    };
    setupNotifications();
  }, [user.role]);

  // --- 2. HEATMAP AUTO-SLIDER ---
  useEffect(() => {
    const interval = setInterval(() => {
        setHeatmapIndex((prev) => (prev + 1) % HEATMAP_IMAGES.length);
    }, 4000); // Slide every 4 seconds
    return () => clearInterval(interval);
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // --- 3. REPORT GENERATION LOGIC (PRESERVED) ---
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
        const response = await api.get('/reports/download', {
            params: { type: reportModal.type, range: reportConfig.range, format: reportConfig.format },
            responseType: 'blob' 
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `CampusFix_${reportModal.type}_Report.${reportConfig.format === 'excel' ? 'csv' : 'pdf'}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setLoadingText("Download Complete!");
        showToast('success', `Report Downloaded Successfully!`);
        setTimeout(() => {
            setIsGenerating(false);
            setReportModal({ open: false, type: '' });
            setGenerationProgress(0);
        }, 1000);
    } catch (error) {
        setIsGenerating(false);
        showToast('error', "Download Failed.");
    }
  };

  if (!stats) return <div className="flex-center" style={{color:'#4f46e5', height: '100vh'}}>Loading Dashboard...</div>;

  const resolutionRate = stats.total_issues > 0 ? Math.round((stats.resolved / stats.total_issues) * 100) : 0;

  return (
    <div className="container fade-in" style={{ position: 'relative', paddingBottom: '50px' }}>
      
      {/* --- TOP: NOTICE BAR --- */}
      <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#be123c', marginBottom: '20px', display: 'flex', alignItems: 'center', height: '45px', overflow: 'hidden' }}>
        <div style={{ padding: '0 15px', background: '#fff1f2', zIndex: 10, fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', height: '100%' }}>
          <AlertTriangle size={18} /> NOTICE:
        </div>
        <div style={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
          <div className="marquee-content" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            {URGENT_NOTICE_TEXT} &nbsp; • &nbsp; {URGENT_NOTICE_TEXT}
          </div>
        </div>
        <div style={{ zIndex: 10, background: '#fff1f2', padding: '0 15px', borderLeft: '1px solid #fecdd3', height: '100%', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setShowAllNotices(true)} style={{ background: 'transparent', border: 'none', color: '#9f1239', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <List size={14} /> View All
          </button>
        </div>
      </div>

      {/* --- TOP: HERO BANNER --- */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white', border: 'none', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>Welcome, {user.full_name.split(' ')[0]}! 👋</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px' }}>
            {user.role === 'student' ? 'Track your complaints & view campus updates.' : 'Overview of maintenance performance & analytics.'}
        </p>
        <button onClick={() => setShowEscalation(true)} style={{ marginTop: '20px', background: 'white', color: '#4f46e5', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <Info size={18} /> How Escalation Works
        </button>
      </div>

      {/* --- MIDDLE: STATS GRID --- */}
      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '2rem' }}>
        <StatCard icon="📂" value={stats.total_issues} label="Total Issues" color="rgba(255, 255, 255, 0.9)" textColor="#1e293b" borderColor="#e2e8f0" />
        <StatCard icon="⏳" value={stats.pending} label="Pending" color="#fffbeb" textColor="#b45309" borderColor="#fcd34d" />
        <StatCard icon="✅" value={stats.resolved} label="Resolved" color="#f0fdf4" textColor="#15803d" borderColor="#86efac" />
        {user.role === 'student' ? (
          <StatCard icon="👤" value={stats.my_issues} label="My Reports" color="#eef2ff" textColor="#4338ca" borderColor="#a5b4fc" />
        ) : (
          <StatCard icon="🔥" value={delayedCount} label="Delayed (>3 Days)" color="#fee2e2" textColor="#991b1b" borderColor="#fca5a5" />
        )}
      </div>

      {/* --- BOTTOM: MAIN GRID (LEFT: Heatmap, RIGHT: Map) --- */}
      <div className="grid-2" style={{ alignItems: 'start', gap: '25px' }}>
        
        {/* === LEFT COLUMN === */}
        <div style={{ display: 'grid', gap: '20px' }}>
          
          {/* 1. HEATMAP IMAGE SLIDER (Now for everyone) */}
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
              <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>🔥 Live Heatmap</h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{heatmapIndex + 1} / 7</div>
              </div>
              <div style={{ position: 'relative', height: '220px', background: '#f1f5f9', cursor: 'zoom-in' }} onClick={() => setZoomImage(HEATMAP_IMAGES[heatmapIndex])}>
                  <img src={HEATMAP_IMAGES[heatmapIndex]} alt="Heatmap" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.5s ease-in-out' }} onError={(e) => { e.target.src = '/HeatMap/HeatMap1.png' }} />
                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Maximize2 size={12} /> Full Screen</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '10px' }}>
                  {HEATMAP_IMAGES.map((_, idx) => (
                      <div key={idx} onClick={() => setHeatmapIndex(idx)} style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx === heatmapIndex ? '#4f46e5' : '#cbd5e1', cursor: 'pointer', transition: 'all 0.3s' }} />
                  ))}
              </div>
          </div>

          {/* 2. Status Board */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>📊 Campus Resolution Pulse</h3>
            <div style={{ marginBottom: '15px' }}>
              <div className="flex-between" style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                <span style={{ fontWeight: '600', color: '#475569' }}>Overall Progress</span>
                <span style={{ fontWeight: '700', color: '#4f46e5' }}>{resolutionRate}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${resolutionRate}%`, background: '#10b981', transition: 'width 1s ease' }}></div>
                <div style={{ width: `${100 - resolutionRate}%`, background: '#f59e0b', transition: 'width 1s ease' }}></div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Avg. Solve Time</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>28 Hours</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Satisfaction</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#d97706' }}>4.2 / 5.0</div>
              </div>
            </div>
          </div>

          {/* 3. Worker Performance (Admin) */}
          {user.role !== 'student' && (
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>👷 Staff Performance</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {WORKER_PERFORMANCE.map((w, i) => (
                  <div key={i} className="flex-between" style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '8px', color: '#4338ca' }}>{w.icon}</div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{w.role}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{w.tasks} Tasks</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: '700', color: '#d97706' }}>⭐ {w.rating}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Student Activity (Student) */}
          {user.role === 'student' && (
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>⚡ Your Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivity.length > 0 ? recentActivity.map(issue => (
                    <div key={issue.id} className="flex-between" style={{ paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: issue.status === 'Solved' ? '#dcfce7' : '#fee2e2', padding: '6px', borderRadius: '50%', color: issue.status === 'Solved' ? '#16a34a' : '#991b1b' }}><Activity size={14}/></div>
                            <span style={{ fontSize: '0.9rem', color: '#334155' }}>
                                Reported <strong>"{issue.title.length > 20 ? issue.title.slice(0,20)+'...' : issue.title}"</strong>
                            </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(issue.created_at).toLocaleDateString()}</span>
                    </div>
                )) : <div style={{textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem'}}>No recent issues.</div>}
              </div>
            </div>
          )}
        </div>

        {/* === RIGHT COLUMN === */}
        <div style={{ display: 'grid', gap: '20px' }}>
          
          {/* 1. REAL LIVE MAP (LEAFLET) */}
          <CampusMap role={user.role} issueCount={stats ? stats.pending : 0} />

          {/* 2. Quick Actions */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>🚀 Quick Actions</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              <Link to="/issues" className="btn-grad" style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span>{user.role === 'student' ? '➕ Report Issue' : '📋 Manage Issues'}</span>
              </Link>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Link to="/contacts" className="btn-ghost" style={{ textAlign: 'center' }}>📞 Contacts</Link>
                <Link to="/profile" className="btn-ghost" style={{ textAlign: 'center' }}>👤 Profile</Link>
                {user.role !== 'student' && <Link to="/students" className="btn-ghost" style={{ textAlign: 'center' }}>🎓 Students</Link>}
                {user.role !== 'student' && <Link to="/mess-rating" className="btn-ghost" style={{ textAlign: 'center', borderColor: '#f97316', color: '#ea580c' }}>🍔 Mess Ratings</Link>}
              </div>

              {/* ADMIN REPORTS */}
              {user.role !== 'student' && (
                <div style={{ marginTop: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>Admin Reports</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button onClick={() => setReportModal({ open: true, type: 'issues' })} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', borderColor: '#6366f1', color: '#6366f1' }}><FileText size={16} /> Issues</button>
                        <button onClick={() => setReportModal({ open: true, type: 'mess' })} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', borderColor: '#ec4899', color: '#ec4899' }}><FileSpreadsheet size={16} /> Mess</button>
                    </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. MESS RATING (STUDENT) */}
          {user.role === 'student' && (
            <div className="glass-panel" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1px solid #fed7aa', textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🍔</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#9a3412', marginBottom: '5px' }}>Mess Quality Rating</h3>
                <Link to="/mess-rating" className="btn-grad" style={{ background: 'linear-gradient(to right, #f97316, #ea580c)', display: 'inline-block', width: '100%', textDecoration: 'none', padding: '10px', fontSize: '0.9rem' }}>⭐ Rate Now</Link>
            </div>
          )}

          {/* 4. Department Breakdown (Admin) */}
          {user.role !== 'student' && (
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>🏢 Department Status</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div className="flex-between" style={{ fontSize: '0.9rem' }}><span style={{ color: '#475569' }}>Academic Blocks</span><span style={{ fontWeight: '700', color: '#1e293b' }}>12 Active</span></div>
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px' }}><div style={{ width: '30%', height: '100%', background: '#3b82f6', borderRadius: '3px' }}></div></div>
                <div className="flex-between" style={{ fontSize: '0.9rem', marginTop: '10px' }}><span style={{ color: '#475569' }}>Hostels</span><span style={{ fontWeight: '700', color: '#1e293b' }}>45 Active</span></div>
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px' }}><div style={{ width: '70%', height: '100%', background: '#ef4444', borderRadius: '3px' }}></div></div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- MODALS --- */}
      {/* 1. Zoom Heatmap */}
      {zoomImage && (
        <div className="modal-overlay" onClick={() => setZoomImage(null)} style={{ background: 'rgba(0,0,0,0.9)', zIndex: 3000 }}>
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <button onClick={() => setZoomImage(null)} style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', fontSize: '3rem', cursor: 'pointer', zIndex: 3001 }}>&times;</button>
                <img src={zoomImage} alt="Full Heatmap" style={{ maxWidth: '95%', maxHeight: '95vh', borderRadius: '8px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} />
            </div>
        </div>
      )}

      {/* 2. Report Generation */}
      {reportModal.open && (
        <div className="modal-overlay" onClick={() => !isGenerating && setReportModal({ ...reportModal, open: false })}>
            <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px', textAlign: 'center' }}>
                <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>CampusFix Intelligence</h2>
                    <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Generate {reportModal.type} reports</p>
                </div>
                {isGenerating ? (
                    <div style={{ padding: '20px 0' }}>
                        <div style={{ marginBottom: '15px', fontWeight: '700', color: '#4f46e5', fontSize: '1.2rem' }}>{generationProgress}%</div>
                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}><div style={{ width: `${generationProgress}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #ec4899)', transition: 'width 0.3s ease' }}></div></div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', height: '20px', transition: 'all 0.3s ease' }}>{loadingText}</div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>Time Range</label>
                            <select className="glass-input" value={reportConfig.range} onChange={e => setReportConfig({ ...reportConfig, range: e.target.value })} style={{ width: '100%' }}>
                                <option value="week">Past 7 Days</option><option value="month">Last Month</option><option value="semester">Full Semester</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Format</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setReportConfig({ ...reportConfig, format: 'pdf' })} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: reportConfig.format === 'pdf' ? '2px solid #ef4444' : '1px solid #e2e8f0', background: reportConfig.format === 'pdf' ? '#fef2f2' : 'white', color: reportConfig.format === 'pdf' ? '#ef4444' : '#64748b', fontWeight: '600', cursor: 'pointer' }}>📄 PDF</button>
                                <button onClick={() => setReportConfig({ ...reportConfig, format: 'excel' })} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: reportConfig.format === 'excel' ? '2px solid #10b981' : '1px solid #e2e8f0', background: reportConfig.format === 'excel' ? '#ecfdf5' : 'white', color: reportConfig.format === 'excel' ? '#10b981' : '#64748b', fontWeight: '600', cursor: 'pointer' }}>📊 Excel</button>
                            </div>
                        </div>
                        <button onClick={startReportGeneration} className="btn-grad" style={{ width: '100%', padding: '12px' }}>Download Report</button>
                    </div>
                )}
                {!isGenerating && <button onClick={() => setReportModal({ ...reportModal, open: false })} className="btn-close">×</button>}
            </div>
        </div>
      )}

      {/* 3. Notices */}
      {showAllNotices && (
        <div className="modal-overlay" onClick={() => setShowAllNotices(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
               <h2 style={{ color: '#be123c', fontSize: '1.4rem', fontWeight: '800' }}>Campus Notices</h2>
               <button className="btn-close" style={{ position: 'static' }} onClick={() => setShowAllNotices(false)}>×</button>
            </div>
            <div style={{ display: 'grid', gap: '15px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px' }}>
              {NOTICES_LIST.map((notice, index) => (
                <div key={index} style={{ padding: '15px', background: '#fff1f2', borderLeft: '4px solid #be123c', borderRadius: '0 8px 8px 0', color: '#881337', fontSize: '0.95rem' }}>{notice}</div>
              ))}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => navigate('/notices')} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>View All History</button>
                <button onClick={() => setShowAllNotices(false)} style={{ background: '#334155', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Escalation */}
      {showEscalation && (
        <div className="modal-overlay" onClick={() => setShowEscalation(false)}>
          <div className="glass-panel modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <button className="btn-close" onClick={() => setShowEscalation(false)}>×</button>
            <h2 style={{ color: '#4f46e5', marginBottom: '10px' }}>🚀 Escalation Protocol</h2>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <LevelCard title="Level 1: Technician" desc="Assigned immediately. SLA: 24-48h" color="#e0e7ff" icon="🔧" />
              <div style={{ height: '20px', width: '2px', background: '#cbd5e1' }}></div>
              <LevelCard title="Level 2: Warden" desc="Auto-notified if breached Level 1." color="#fef9c3" icon="👮" />
              <div style={{ height: '20px', width: '2px', background: '#cbd5e1' }}></div>
              <LevelCard title="Level 3: Chief Warden" desc="Escalated if unresolved for 72h." color="#fed7aa" icon="👔" />
              <div style={{ height: '20px', width: '2px', background: '#cbd5e1' }}></div>
              <LevelCard title="Level 4: Director" desc="Final Escalation for critical failures." color="#fecdd3" icon="🚨" />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', padding: '15px 25px', borderRadius: '12px', border: '1px solid white', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', borderLeft: `5px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`, display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideUp 0.3s ease-out' }}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span><span style={{ fontWeight: '600', color: '#1e293b' }}>{toast.message}</span>
        </div>
      )}
      
      <style>{`
        .marquee-content { display: inline-block; white-space: nowrap; animation: marquee 35s linear infinite; padding-left: 100%; }
        .marquee-content:hover { animation-play-state: paused; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .modal-content { width: 90%; max-width: 450px; padding: 30px; position: relative; animation: fadeIn 0.3s; background: white; borderRadius: 16px; }
        .btn-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; opacity: 0.5; color: #333; }
        .btn-close:hover { opacity: 1; }
      `}</style>
    </div>
  );
}

function StatCard({ icon, value, label, color, textColor, borderColor }) {
  return (
    <div className="glass-panel" style={{ background: color, display: 'flex', alignItems: 'center', gap: '15px', border: `1px solid ${borderColor}`, padding: '1.5rem' }}>
      <div style={{ fontSize: '2.2rem' }}>{icon}</div>
      <div>
        <h3 style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1, color: textColor }}>{value}</h3>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8, color: textColor, margin: 0 }}>{label}</p>
      </div>
    </div>
  );
}

function LevelCard({ title, desc, color, icon }) {
  return (
    <div style={{ background: color, padding: '15px', borderRadius: '12px', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      <div>
        <div style={{ fontWeight: '700', color: '#1e293b' }}>{title}</div>
        <div style={{ fontSize: '0.8rem', color: '#475569' }}>{desc}</div>
      </div>
    </div>
  );
}
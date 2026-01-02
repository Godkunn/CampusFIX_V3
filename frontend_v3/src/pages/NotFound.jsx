import React from "react";
import { Link } from "react-router-dom";
import { Home, RefreshCw } from "lucide-react";


export default function NotFound() {
  return (
    <div style={styles.wrapper}>


      {/* ✨ Animated Neon Mist Background */}
      <div style={styles.gradient}></div>


      {/* ✨ Soft Floating Light Orbs */}
      <div style={styles.orb1}></div>
      <div style={styles.orb2}></div>


      {/* 🟢 SYSTEM STATUS GREEN NEON CORE */}
      <div style={styles.greenRadar}></div>
      <div style={styles.greenRing}></div>
      <div style={styles.greenPulse}></div>


      {/* 🌟 Glass Card */}
      <div style={styles.card} className="glass-notfound">


        {/* 🔥 Logo + Bot */}
        <div style={styles.hero}>
          
          {/* Glow Aura */}
          <div style={styles.glow}></div>


          {/* Logo */}
          <img src="/logo.png" alt="CampusFix" style={styles.logo} />


          {/* Bot */}
          <img src="/botchar.png" alt="Bot" style={styles.bot} />
        </div>


        <h1 style={styles.title}>Hang Tight! 🛠️</h1>


        <p style={styles.subText}>
          We are currently in a <b style={{ color: "#ef4444" }}>
            Technical Maintenance Phase
          </b>.
        </p>


        <p style={styles.desc}>
          The page may be moved or our servers are taking a short nap.
          We'll be back online shortly!
        </p>


        <div style={styles.buttons}>
          <Link to="/dashboard" style={styles.retry}>
            <RefreshCw size={18} /> Retry
          </Link>


          <Link to="/dashboard" style={styles.home}>
            <Home size={18} /> Back Home
          </Link>
        </div>


        <p style={styles.footer}>
          System monitored • Secure • Stable 💚
          <p>Thank you for your patience & support ❤️</p>
        </p>
      </div>


      {/* Animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) }
          50% { transform: translateY(-12px) }
          100% { transform: translateY(0px) }
        }


        @keyframes neonFlow {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }


        /* 🟢 ROTATING GREEN RING */
        @keyframes rotateRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }


        /* 🟢 SCANNING RADAR SWEEP */
        @keyframes radarSweep {
          0% { transform: rotate(0deg); opacity: 0.7; }
          100% { transform: rotate(360deg); opacity: 0.7; }
        }


        /* 🟢 HEARTBEAT PULSE */
        @keyframes pulseGreen {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.3; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }


        .glass-notfound {
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
      `}</style>
    </div>
  );
}


/* ---- STYLES ---- */
const styles = {
  wrapper: {
    minHeight: "85vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },


  gradient: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(120deg, #ff7eb3, #ec4899, #8b5cf6, #3b82f6, #22d3ee)",
    backgroundSize: "400% 400%",
    animation: "neonFlow 14s ease infinite",
    opacity: 0.55,
    zIndex: -3,
  },


  orb1: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
    filter: "blur(35px)",
    top: "10%",
    left: "8%",
    zIndex: -2,
  },


  orb2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.22)",
    filter: "blur(32px)",
    bottom: "8%",
    right: "8%",
    zIndex: -2,
  },


  /* 🟢 Green Neon Backend Effects */
  greenRadar: {
    position: "absolute",
    width: 650,
    height: 650,
    borderRadius: "50%",
    border: "2px dashed rgba(34,197,94,0.6)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    animation: "rotateRing 16s linear infinite",
    opacity: 0.8,
    zIndex: -1,
  },


  greenRing: {
    position: "absolute",
    width: 780,
    height: 780,
    borderRadius: "50%",
    border: "3px solid rgba(16,185,129,0.45)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    animation: "radarSweep 10s linear infinite",
    zIndex: -1,
  },


  greenPulse: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.35), rgba(0,0,0,0))",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    animation: "pulseGreen 3.5s infinite ease-in-out",
    zIndex: -1,
  },


  card: {
    width: "95%",
    maxWidth: 520,
    padding: "38px 32px",
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,0.7)",
    background: "rgba(255,255,255,0.78)",
    textAlign: "center",
    color: "#0f172a",
    boxShadow: "0 35px 80px rgba(0,0,0,0.25)",
  },


  hero: {
    position: "relative",
    height: 130,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },


  glow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.4)",
    filter: "blur(4px)",
    animation: "float 3.5s infinite ease-in-out",
  },


  logo: { width: 85, zIndex: 2 },


  bot: {
    width: 120,
    position: "absolute",
    right: -40,
    bottom: -10,
    animation: "float 3s infinite ease-in-out",
  },


  title: {
    fontSize: "2rem",
    fontWeight: 900,
    background: "linear-gradient(to right,#4f46e5,#ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },


  subText: {
    fontSize: "1rem",
    color: "#475569",
    fontWeight: 700,
  },


  desc: {
    fontSize: ".9rem",
    color: "#64748b",
    maxWidth: 420,
    margin: "10px auto 25px",
  },


  buttons: {
    display: "flex",
    gap: 14,
    justifyContent: "center",
  },


  retry: {
    padding: "11px 20px",
    borderRadius: 50,
    border: "1px solid #e2e8f0",
    background: "white",
    cursor: "pointer",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    color: "#0f172a",
  },


  home: {
    padding: "11px 26px",
    borderRadius: 50,
    textDecoration: "none",
    color: "white",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "linear-gradient(135deg,#4f46e5,#06b6d4)",
    boxShadow: "0 10px 28px rgba(79,70,229,0.45)",
  },


  footer: {
    marginTop: 22,
    fontSize: ".82rem",
    color: "#334155",
  },
};

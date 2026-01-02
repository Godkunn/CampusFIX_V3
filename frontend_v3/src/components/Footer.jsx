import React, { useState } from 'react';
import { Github, Linkedin, AlertCircle, Code, Heart, ShieldAlert, X } from 'lucide-react';

export default function Footer() {
  const [showLegal, setShowLegal] = useState(false);

  return (
    <>
      <footer
        style={{
          marginTop: "40px",
          position: "relative",
          overflow: "hidden",
          borderTop: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 -10px 40px rgba(0,0,0,0.12)"
        }}
      >

        {/* 🔥 Animated Neon Aura */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, rgba(255,140,0,0.35), rgba(255,0,128,0.35), rgba(120,0,255,0.3))",
            backgroundSize: "300% 300%",
            animation: "neonMove 15s ease infinite",
            filter: "blur(40px)",
            opacity: 0.9,
            zIndex: 0
          }}
        />

        {/* Frosted Glass */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            zIndex: 1
          }}
        />

        {/* CONTENT */}
        <div style={{ position: "relative", zIndex: 2, padding: "40px 20px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

            {/* GRID */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "40px",
                marginBottom: "30px",
                borderBottom: "1px solid rgba(79, 70, 229, 0.15)",
                paddingBottom: "30px"
              }}
            >

              {/* TEAM SECTION */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h4
                  style={{
                    color: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "1rem",
                    fontWeight: "800"
                  }}
                >
                  <Code size={20} color="#4f46e5" /> Meet The Team 🚀
                </h4>

                <div style={{ display: "flex", gap: "20px" }}>

                  {/* AYUSH */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ayush"
                      alt="Ayush"
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        border: "2px solid #4f46e5",
                        background: "white"
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: "800", color: "#111827", fontSize: "0.95rem" }}>
                        Ayush Chaudhary
                      </div>
                      <div
                        style={{
                          color: "#4f46e5",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          marginBottom: "4px"
                        }}
                      >
                        Full Stack Lead
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <a className="footer-icon" href="https://github.com/Godkunn"><Github size={14} /></a>
                        <a className="footer-icon" href="https://www.linkedin.com/in/ayush-chaudharyy/"><Linkedin size={14} /></a>
                      </div>
                    </div>
                  </div>

                  {/* TEAMMATE */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Team"
                      alt="Team"
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        border: "2px solid #ec4899",
                        background: "white"
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: "800", color: "#111827", fontSize: "0.95rem" }}>
                        Vishesh Choudhary
                      </div>
                      <div
                        style={{
                          color: "#ec4899",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          marginBottom: "4px"
                        }}
                      >
                        Product Designer
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <a className="footer-icon" href="https://github.com/Vishesh003-ai"><Github size={14} /></a>
                        <a className="footer-icon" href="https://www.linkedin.com/in/vishesh-choudhary-855151326/"><Linkedin size={14} /></a>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* DISCLAIMER */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fff1f2 0%, #fff 100%)",
                  padding: "20px",
                  borderRadius: "16px",
                  border: "1px solid #fecdd3"
                }}
              >
                <h4
                  style={{
                    color: "#be123c",
                    marginBottom: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.95rem",
                    fontWeight: "700"
                  }}
                >
                  <AlertCircle size={18} /> Campus Disclaimer
                </h4>

                <p
                  style={{
                    fontSize: "0.8rem",
                    lineHeight: "1.6",
                    color: "#881337",
                    margin: 0
                  }}
                >
                  CampusFix is a student-led initiative for NIT/IIIT Agartala. This portal
                  facilitates issue tracking but is
                  <strong> not a substitute for official administrative channels</strong>.
                  <br />
                  <span
                    onClick={() => setShowLegal(true)}
                    style={{
                      color: "#4f46e5",
                      fontWeight: "700",
                      cursor: "pointer",
                      textDecoration: "underline",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "5px"
                    }}
                  >
                    View Legal & DMCA Policy <ShieldAlert size={12} />
                  </span>
                </p>
              </div>
            </div>

            {/* COPYRIGHT */}
            <div
              style={{
                textAlign: "center",
                fontSize: "0.85rem",
                color: "#334155",
                fontWeight: "600"
              }}
            >
              © 2025 <strong>Team TechTitans</strong>. Built with{" "}
              <Heart size={12} fill="#ef4444" color="#ef4444" /> at GDG Hackathon.
            </div>
          </div>

          {/* Styles */}
          <style>
            {`
              .footer-icon { color: #94a3b8; transition: all 0.2s; }
              .footer-icon:hover { color: #4f46e5; transform: scale(1.1); }

              @keyframes neonMove {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
            `}
          </style>
        </div>
      </footer>

      {/* LEGAL MODAL */}
      {showLegal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(5px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setShowLegal(false)}
        >
          <div
            style={{
              background: "white",
              width: "90%",
              maxWidth: "500px",
              borderRadius: "20px",
              padding: "30px",
              position: "relative",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLegal(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b"
              }}
            >
              <X size={24} />
            </button>

            <h2
              style={{
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px"
              }}
            >
              <ShieldAlert color="#4f46e5" /> Legal & DMCA
            </h2>

            <div
              style={{
                maxHeight: "60vh",
                overflowY: "auto",
                fontSize: "0.9rem",
                color: "#475569",
                lineHeight: "1.6"
              }}
            >
              <p><strong>1. Content Ownership:</strong> All images (issues, mess ratings) are user-generated. CampusFix claims no ownership over user uploads.</p>
              <p><strong>2. DMCA / Takedown:</strong> If you find sensitive personal data or copyrighted material exposed, please contact the Lead Developer immediately at <span style={{color:'#4f46e5'}}>godayush10@campusfix.com</span>.</p>
              <p><strong>3. Liability:</strong> We are not responsible for delays in maintenance work. This tool serves purely as a communication bridge.</p>
              <p><strong>4. Privacy:</strong> We store minimal data (Email/Name) solely for authentication. No data is sold to third parties.</p>
            </div>

            <button
              onClick={() => setShowLegal(false)}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "12px",
                background: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  );
}

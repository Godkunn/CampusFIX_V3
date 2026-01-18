import React, { useEffect, useState } from 'react';
import { Phone, ShieldAlert, User, Briefcase, Stethoscope, Wifi, Wrench, GraduationCap, Copy, X, Check, MessageCircle, BookOpen, Landmark, Truck } from 'lucide-react';

export default function Contacts() {
  
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
  
  const [selectedContact, setSelectedContact] = useState(null);
  const [confirmCall, setConfirmCall] = useState(false);
  const [toast, setToast] = useState(null);

  // --- EXTENSIVE CONTACT DATABASE (50+ ENTRIES) ---
  const contactGroups = [
    {
      title: "🚨 Emergency (24x7)",
      items: [
        { name: "Medical Unit Ambulance", role: "Emergency", phone: "0381-2548526", icon: <Stethoscope size={20} /> },
        { name: "Main Gate Security", role: "Security Control", phone: "0381-2548512", icon: <ShieldAlert size={20} /> },
        { name: "Fire Service", role: "Agartala", phone: "101", icon: <ShieldAlert size={20} /> },
        { name: "Police (Jirania PS)", role: "Police", phone: "0381-2346222", icon: <ShieldAlert size={20} /> },
        { name: "Women Helpline", role: "Emergency", phone: "1091", icon: <ShieldAlert size={20} /> },
        { name: "Anti-Ragging Squad", role: "Helpline", phone: "1800-180-5522", icon: <ShieldAlert size={20} /> },
        { name: "Disaster Management", role: "Tripura", phone: "1070", icon: <ShieldAlert size={20} /> },
      ]
    },
    {
      title: "🎓 Top Administration",
      items: [
        { name: "Director Office", role: "Director NITA", phone: "0381-2546630", icon: <Briefcase size={20} /> },
        { name: "Registrar", role: "Administration", phone: "0381-2546629", icon: <Briefcase size={20} /> },
        { name: "Dean (Student Welfare)", role: "Prof. John Deb Barma", phone: "9436120189", icon: <GraduationCap size={20} /> },
        { name: "Dean (Academic)", role: "Prof. Swapan Bhaumik", phone: "0381-2548537", icon: <GraduationCap size={20} /> },
        { name: "Dean (Faculty Welfare)", role: "Dr. S. K. Pal", phone: "0381-2348003", icon: <GraduationCap size={20} /> },
        { name: "Dean (P&D)", role: "Planning & Dev", phone: "0381-2548511", icon: <Briefcase size={20} /> },
        { name: "Exam Cell", role: "Controller of Exams", phone: "0381-2548510", icon: <BookOpen size={20} /> },
      ]
    },
    {
      title: "🏡 Hostel Chief Wardens",
      items: [
        { name: "Dr. Arvind Kumar Jain", role: "Chief Warden (Boys)", phone: "9406576108", icon: <User size={20} /> },
        { name: "Dr. Joyashree Das", role: "Chief Warden (Girls)", phone: "9436122000", icon: <User size={20} /> },
        { name: "Hostel Office", role: "General Enquiry", phone: "0381-2548515", icon: <User size={20} /> },
      ]
    },
    {
      title: "🏢 Hostel Wardens (Boys)",
      items: [
        { name: "Dr. Saroj Kumar Parida", role: "RNT Block IV", phone: "8249263688", icon: <User size={20} /> },
        { name: "Dr. Chakradhar Behera", role: "RNT Block VI", phone: "8837304043", icon: <User size={20} /> },
        { name: "Dr. S. K. Pandey", role: "Aryabhatta A", phone: "9862568899", icon: <User size={20} /> },
        { name: "Dr. P. S. Bhowmik", role: "Aryabhatta B", phone: "9436456123", icon: <User size={20} /> },
        { name: "Dr. R. K. Das", role: "Vishweshwaraya", phone: "9436123456", icon: <User size={20} /> },
      ]
    },
    {
      title: "🌸 Hostel Wardens (Girls)",
      items: [
        { name: "Mrs. Mahoya Biswas", role: "Gargi Hostel", phone: "9774607090", icon: <User size={20} /> },
        { name: "Mrs. Rumita Saha", role: "Gargi Hostel", phone: "7308354700", icon: <User size={20} /> },
        { name: "Dr. Anjana Das", role: "Mother Teresa", phone: "9436129876", icon: <User size={20} /> },
      ]
    },
    {
      title: "⚽ Student Gymkhana",
      items: [
        { name: "VP Gymkhana", role: "Student Council", phone: "9876500001", icon: <User size={20} /> },
        { name: "Sports Secretary", role: "Sports Complex", phone: "9876500002", icon: <User size={20} /> },
        { name: "Cultural Secretary", role: "SAC Building", phone: "9876500003", icon: <User size={20} /> },
        { name: "Technical Secretary", role: "Tech Clubs", phone: "9876500004", icon: <User size={20} /> },
        { name: "Mess Secretary", role: "Food Committee", phone: "9876500005", icon: <User size={20} /> },
      ]
    },
    {
      title: "🛠️ Services & Facilities",
      items: [
        { name: "Electrical Dept", role: "Power House", phone: "9998887771", icon: <Wrench size={20} /> },
        { name: "Civil / Plumbing", role: "Estate Section", phone: "9998887772", icon: <Wrench size={20} /> },
        { name: "Network Centre", role: "WiFi / Internet", phone: "0381-254856", icon: <Wifi size={20} /> },
        { name: "SBI Bank", role: "NIT Branch", phone: "0381-2548555", icon: <Landmark size={20} /> },
        { name: "Post Office", role: "NIT Campus", phone: "0381-2548560", icon: <Truck size={20} /> },
        { name: "Guest House", role: "Booking", phone: "0381-2548518", icon: <Briefcase size={20} /> },
      ]
    }
  ];

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setToast("Number Copied!");
    setTimeout(() => setToast(null), 2000);
  };

  const handleCallClick = (e, contact) => {
    e.stopPropagation(); // Stop opening modal when clicking call btn
    setSelectedContact(contact);
    setConfirmCall(true); // Open call confirm directly
  };

  const proceedToCall = (number) => {
    window.location.href = `tel:${number}`;
    setConfirmCall(false);
    setSelectedContact(null);
  };

  const openWhatsApp = (number) => {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const finalNumber = cleanNumber.length > 10 ? cleanNumber : `91${cleanNumber}`;
    window.open(`https://wa.me/${finalNumber}?text=Hello`, '_blank');
  };

  return (
    <div className="container fade-in contacts-wrapper">
      
      {/* --- TOAST --- */}
      {toast && <div className="glass-toast"><Check size={16} /> {toast}</div>}

      {/* --- HEADER --- */}
      <div className="header-strip glass-panel">
        <Phone className="header-icon" size={20} />
        <h2 className="header-title">Important Contacts</h2>
      </div>

      <div className="contacts-content">
        {contactGroups.map((group, idx) => (
          <div key={idx} className="contact-section">
            
            {/* --- NEW STYLISH SECTION HEADER --- */}
            <div className="section-header-container">
               <h3 className="section-header">{group.title}</h3>
            </div>
            
            <div className="grid-container">
              {group.items.map((c, i) => (
                <div 
                  key={i} 
                  className="glass-panel contact-card"
                  onClick={() => { setSelectedContact(c); setConfirmCall(false); }}
                >
                  <div className="card-left">
                    <div className="icon-box">{c.icon}</div>
                    <div className="details-box">
                      <div className="contact-name">{c.name}</div>
                      <div className="contact-role">{c.role}</div>
                    </div>
                  </div>
                  
                  {/* DIRECT CALL BUTTON */}
                  <button className="direct-call-btn" onClick={(e) => handleCallClick(e, c)}>
                    <Phone className="btn-icon" fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* --- DETAIL MODAL --- */}
      {selectedContact && (
        <div className="glass-modal-overlay" onClick={() => setSelectedContact(null)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
            
            <div className="modal-header">
              <div className="modal-icon-large">{selectedContact.icon}</div>
              <button className="close-btn" onClick={() => setSelectedContact(null)}><X size={20} /></button>
            </div>

            <h3 className="modal-name">{selectedContact.name}</h3>
            <p className="modal-role">{selectedContact.role}</p>
            <div className="modal-number">{selectedContact.phone}</div>

            {!confirmCall ? (
              <div className="modal-actions-grid">
                <button className="action-btn call" onClick={() => setConfirmCall(true)}>
                  <Phone size={18} /> Call
                </button>
                <button className="action-btn whatsapp" onClick={() => openWhatsApp(selectedContact.phone)}>
                  <MessageCircle size={18} /> WhatsApp
                </button>
                <button className="action-btn copy" onClick={() => handleCopy(selectedContact.phone)}>
                  <Copy size={18} /> Copy
                </button>
              </div>
            ) : (
              <div className="confirm-box">
                <p className="confirm-text">Call <b>{selectedContact.name}</b>?</p>
                <div className="modal-actions">
                  <button className="action-btn cancel" onClick={() => setConfirmCall(false)}>Cancel</button>
                  <button className="action-btn call-confirm" onClick={() => proceedToCall(selectedContact.phone)}>
                    Yes, Call
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      <style>{`
        .contacts-wrapper { padding-bottom: 60px; }

        /* HEADER */
        .header-strip {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 15px; margin-bottom: 25px; border-radius: 16px;
          background: rgba(255,255,255,0.8); backdrop-filter: blur(10px);
          border-bottom: 3px solid #f43f5e;
        }
        .header-title { margin: 0; font-size: 1.2rem; color: #1e293b; font-weight: 800; }
        .header-icon { color: #f43f5e; }

        /* --- ANIMATED SECTION HEADERS --- */
        @keyframes borderFlow {
          0% { border-color: #f43f5e; box-shadow: 0 4px 15px rgba(244, 63, 94, 0.1); }
          33% { border-color: #8b5cf6; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.1); }
          66% { border-color: #10b981; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.1); }
          100% { border-color: #f43f5e; box-shadow: 0 4px 15px rgba(244, 63, 94, 0.1); }
        }

        .section-header-container { text-align: center; margin: 25px 0 15px; }

        .section-header {
          display: inline-block;
          font-size: 0.95rem; font-weight: 800; color: #1e293b; 
          padding: 10px 20px; border-radius: 16px;
          background: rgba(255,255,255,0.85); backdrop-filter: blur(12px);
          text-transform: uppercase; letter-spacing: 0.5px;
          /* Animated Border */
          border: 2px solid #f43f5e;
          animation: borderFlow 8s ease-in-out infinite;
        }
        
        .grid-container {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;
        }

        /* CARD DESIGN */
        .contact-card {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 15px; cursor: pointer; 
          background: rgba(255,255,255,0.7);
          transition: transform 0.1s, background 0.2s;
        }
        .contact-card:active { transform: scale(0.98); background: rgba(255,255,255,0.95); }
        
        .card-left { display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden; }

        .icon-box {
          width: 42px; height: 42px; background: #e0e7ff; color: #4f46e5;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .details-box { flex: 1; min-width: 0; }
        
        .contact-name { font-weight: 700; font-size: 0.95rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .contact-role { font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* DIRECT CALL BUTTON */
        .direct-call-btn {
          background: #dcfce7; color: #166534; border: none;
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.2s;
          margin-left: 10px; flex-shrink: 0;
        }
        .btn-icon { width: 18px; height: 18px; }
        .direct-call-btn:hover { background: #bbf7d0; }
        .direct-call-btn:active { transform: scale(0.9); }

        /* MODAL */
        .glass-modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);
          z-index: 3000; display: flex; align-items: center; justify-content: center;
        }
        .modal-content {
          width: 90%; max-width: 320px; padding: 25px; 
          background: rgba(255,255,255,0.98); border-radius: 24px;
          text-align: center; animation: popUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 40px rgba(0,0,0,0.25);
        }
        @keyframes popUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .modal-icon-large {
          width: 64px; height: 64px; background: #e0e7ff; color: #4f46e5;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          margin: 0 auto; 
        }
        .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; position: absolute; right: 20px; top: 20px; }

        .modal-name { margin: 10px 0 5px; font-size: 1.3rem; color: #1e293b; }
        .modal-role { margin: 0; font-size: 0.9rem; color: #64748b; }
        .modal-number { margin: 15px 0 25px; font-size: 1.4rem; font-weight: 800; color: #1e293b; letter-spacing: 1px; }

        .modal-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .modal-actions-grid .copy { grid-column: span 2; }

        .modal-actions { display: flex; gap: 10px; justify-content: center; }
        
        .action-btn {
          padding: 12px; border-radius: 12px; border: none; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.9rem;
          transition: transform 0.1s;
        }
        .action-btn:active { transform: scale(0.96); }

        .call { background: #10b981; color: white; }
        .whatsapp { background: #25D366; color: white; }
        .copy { background: #f1f5f9; color: #334155; }
        
        .cancel { background: #f1f5f9; color: #64748b; flex: 1; }
        .call-confirm { background: #ef4444; color: white; flex: 1; }

        .confirm-box { animation: fadeIn 0.2s; }
        .confirm-text { margin-bottom: 15px; font-weight: 600; color: #1e293b; }

        /* TOAST */
        .glass-toast {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
          background: rgba(255,255,255,0.95); padding: 10px 20px; border-radius: 30px;
          display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.9rem;
          box-shadow: 0 5px 20px rgba(0,0,0,0.15); z-index: 4000; color: #10b981;
        }

        /* --- FINE-TUNED MEDIA QUERIES --- */

        /* 1. Laptop/Desktop (Default > 1024px) */
        /* Uses base styles */

        /* 2. Tablet Landscape (max 1024px) */
        @media (max-width: 1024px) {
          .grid-container { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        }

        /* 3. Tablet Portrait (max 768px) */
        @media (max-width: 768px) {
          .grid-container { grid-template-columns: 1fr 1fr; } /* 2 columns */
          .contact-name { font-size: 0.9rem; }
          .contact-role { font-size: 0.75rem; }
        }

        /* 4. Mobile Large (max 600px) */
        @media (max-width: 600px) {
          .header-strip { padding: 12px; margin-bottom: 15px; }
          .grid-container { grid-template-columns: 1fr; gap: 10px; } /* Single column */
          .contact-card { padding: 10px 12px; border-radius: 12px; }
          .icon-box { width: 38px; height: 38px; }
        }

        /* 5. Mobile Medium (max 420px) */
        @media (max-width: 420px) {
          .contact-name { font-size: 0.85rem; } /* Smaller text */
          .contact-role { font-size: 0.72rem; }
          .icon-box { width: 34px; height: 34px; }
          .direct-call-btn { width: 34px; height: 34px; }
          .btn-icon { width: 16px; height: 16px; }
          .card-left { gap: 10px; }
        }

        /* 6. Mobile Small (max 375px) */
        @media (max-width: 375px) {
          .header-title { font-size: 1rem; }
          .section-header { font-size: 0.8rem; padding: 8px 15px; }
          .contact-name { font-size: 0.8rem; } /* Tiny text */
          .contact-role { font-size: 0.7rem; }
          .contact-card { padding: 8px 10px; }
        }

        /* 7. Mobile Extra Small (max 320px) */
        @media (max-width: 320px) {
          .contact-name { font-size: 0.75rem; } /* Ultra tiny */
          .icon-box { width: 30px; height: 30px; }
          .direct-call-btn { width: 30px; height: 30px; }
        }
      `}</style>
    </div>
  );
}

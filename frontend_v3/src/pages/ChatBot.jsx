import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import { MessageSquare, X, Send, Sparkles, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- OFFLINE KNOWLEDGE BASE (Same as before) ---
const KNOWLEDGE_BASE = {
  "Hostel": [
    { q: "What are the hostel in-time rules?", a: "**Hostel Curfew:**\n- **Boys:** 10:00 PM\n- **Girls:** 9:30 PM\nLate entry requires prior permission from the Warden via the MIS portal." },
    { q: "How to complain about room maintenance?", a: "**Maintenance Issues:**\nLog a complaint in the **Hostel Caretaker's Register** kept at the entrance. For urgent electrical/plumbing issues, contact the maintenance cell number displayed on the notice board." },
    { q: "Is Wi-Fi available in rooms?", a: "**Wi-Fi & LAN:**\nYes, LAN ports are available in most rooms. Wi-Fi signals are strongest in common rooms. If internet is down, file a ticket at the **Computer Center (CCC)**." },
    { q: "Can guests stay in my room?", a: "**Guest Policy:**\nStrictly **NO**. Guests are not allowed inside hostel rooms. You can meet parents/guardians in the hostel lobby or designated visitor areas." },
    { q: "How to change my room?", a: "**Room Change:**\nSubmit a written application to the **Chief Warden**. Changes are only approved for valid medical reasons or mutual swapping during semester breaks." },
    { q: "What constitutes ragging?", a: "**Zero Tolerance:**\nRagging includes any act of physical/mental abuse. It is a criminal offense. Report immediately to the **Anti-Ragging Squad** or call the helpline." },
    { q: "Laundry facilities?", a: "**Laundry:**\nWashing machines are available in select blocks (paid usage). Private laundry services also visit the hostel gate daily in the evening." },
  ],
  "Mess": [
    { q: "What is the mess menu timing?", a: "**Mess Timings:**\n- **Breakfast:** 7:30 AM - 9:00 AM\n- **Lunch:** 12:00 PM - 2:00 PM\n- **Snacks:** 5:00 PM - 6:00 PM\n- **Dinner:** 7:30 PM - 9:30 PM" },
    { q: "Food is uncooked/bad quality.", a: "**Quality Complaint:**\nDon't argue with staff. Write in the **Complaint Register** available at the mess counter. Escalate to the **Mess Secretary** if repeated." },
    { q: "How to apply for mess rebate?", a: "**Mess Rebate:**\nYou can apply for a rebate if you are away for **more than 3 consecutive days** with approved leave. Submit the form to the Mess Manager *before* leaving." },
    { q: "Can I change my mess?", a: "**Mess Change:**\nAllowed only at the **beginning of the month**. Submit a request to the Chief Warden's office by the 25th of the previous month." },
    { q: "Is non-veg served daily?", a: "**Menu:**\nNon-veg (Chicken/Egg/Fish) is usually served **3-4 times a week** during dinner. Vegetarian alternatives (Paneer/Mushroom) are always available." },
    { q: "Guest dining charges?", a: "**Guest Coupon:**\nGuests can eat by purchasing a coupon. **Breakfast: ₹40**, **Lunch/Dinner: ₹60**. (Rates subject to change)." },
  ],
  "Academic": [
    { q: "What is the attendance criteria?", a: "**Attendance Rule:**\nMinimum **75% attendance** is mandatory to sit for End-Sem exams. Between 65-75% requires a medical certificate and Dean's approval." },
    { q: "How to download grade card?", a: "**Grade Card:**\nLogin to the **MIS Portal** (nita.ac.in/mis). Go to 'Academic' > 'Grade Card'. Physical copies are distributed by the Academic Section." },
    { q: "Process for backlog registration?", a: "**Backlogs:**\nRegister for backlog courses at the start of the semester via MIS. Fee is approx **₹400 per subject**. Exams happen alongside regular end-sems." },
    { q: "How to contact Faculty Advisor?", a: "**Faculty Advisor:**\nList is available on the department notice board. They are your first point of contact for course registration and academic issues." },
    { q: "Library opening hours?", a: "**Central Library:**\n- **Mon-Fri:** 9:00 AM - 8:00 PM\n- **Sat:** 9:00 AM - 5:00 PM\n- **Exam Time:** Open till 12:00 AM (Midnight)." },
    { q: "Scholarship information?", a: "**Scholarships:**\nVisit the **Academic Section** (Ground Floor, Admin Block). Notices for NSP, State Scholarships, and Alumni grants are posted regularly." },
  ],
  "Medical": [
    { q: "Where is the medical unit?", a: "**Location:**\nThe Institute Hospital is located near the **Sports Complex**, opposite the cricket ground." },
    { q: "Is the ambulance 24/7?", a: "**Emergency:**\nYes. Ambulance is available 24/7. **Emergency Contact:** Save the Security Gate number. They coordinate the ambulance immediately." },
    { q: "OPD Timings?", a: "**Doctor Availability:**\n- **Morning:** 9:00 AM - 1:00 PM\n- **Evening:** 4:00 PM - 7:00 PM\nEmergency staff is available overnight." },
    { q: "Is medicine free?", a: "**Pharmacy:**\nBasic medicines prescribed by the Institute Doctor are provided **free of cost** from the hospital pharmacy." },
  ],
  "Placements": [
    { q: "Eligibility for placement?", a: "**Placement Criteria:**\nGenerally requires **CGPA > 6.0** (or 6.5 for some companies) and **No Active Backlogs**. Specific criteria vary by company." },
    { q: "How to make a CV?", a: "**CV Format:**\nUse the **standard NIT Agartala CCD format**. Workshops are conducted by the placement cell in the 6th semester." },
    { q: "Internship opportunities?", a: "**Internships:**\nCompanies visit for 3rd-year internships starting from **August**. Keep your coding profiles (LeetCode/GFG) updated." },
  ],
  "Sports": [
    { q: "Gym timings?", a: "**Gymnasium:**\nLocated in the Sports Complex. **Boys:** 6-8 AM & 5-8 PM. **Girls:** Separate slot usually 4-5 PM (Check notice board)." },
    { q: "Swimming pool access?", a: "**Swimming Pool:**\nOpen during summer semesters. Requires a **swimming pass** from the Sports Officer. Proper swimwear is mandatory." },
    { q: "How to join college team?", a: "**College Teams:**\nSelections happen in **August/September** for Inter-NIT and other tournaments. Contact the captains at the Sports Complex." },
  ],
  "General": [
    { q: "Bank & ATM locations?", a: "**Banking:**\n- **SBI Branch:** Inside campus near the main gate.\n- **ATMs:** SBI (Main Gate), Canara Bank (Near Shopping Complex)." },
    { q: "Bus timing to city?", a: "**Institute Bus:**\nRuns between Campus and Agartala City. **Frequency:** Every 2 hours on weekends. Schedule is posted at the Main Gate." },
    { q: "Shopping complex timings?", a: "**Amenities:**\nShops open from **9:00 AM to 9:00 PM**. Includes stationery, grocery, barber, and xerox shops." },
  ]
};

const CATEGORIES = Object.keys(KNOWLEDGE_BASE);

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! 👋 I'm CampusFix AI. Select a topic below for instant answers, or type your question!" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMascot, setShowMascot] = useState(false);
  const [activeTab, setActiveTab] = useState("Chat");
  const [selectedCategory, setSelectedCategory] = useState("Hostel");
  
  const scrollRef = useRef(null);
  const tabsRef = useRef(null);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
        if(!isOpen) setShowMascot(true);
        setTimeout(() => setShowMascot(false), 6000);
    }, 3000);

    const interval = setInterval(() => {
      if (!isOpen) {
        setShowMascot(true);
        setTimeout(() => setShowMascot(false), 6000);
      }
    }, 45000); 

    return () => { clearTimeout(initialTimer); clearInterval(interval); };
  }, [isOpen]);

  useEffect(() => {
    if(activeTab === "Chat") {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab, isLoading]);

  const sendMessage = async (textInput) => {
    const msgToSend = textInput || input;
    if (!msgToSend.trim()) return;

    setActiveTab("Chat");
    const newMsg = { role: 'user', content: msgToSend };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const context = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      context.push(newMsg);
      const res = await api.post('/chat', { messages: context });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (error) {
      console.error("Chat Error:", error); 
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Brain freeze! My servers are busy. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFAQClick = (faq) => {
    setActiveTab("Chat");
    setMessages(prev => [...prev, { role: 'user', content: faq.q }]);
    setIsLoading(true);
    
    setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: faq.a }]);
        setIsLoading(false);
    }, 700);
  };

  return (
    <div className="chatbot-wrapper">
      
      {/* --- MASCOT --- */}
      {!isOpen && (
        <div 
            className={`mascot-container ${showMascot ? 'visible' : ''}`} 
            onClick={() => setIsOpen(true)}
        >
            <div className="mascot-bubble">Hi! 👋</div>
            <img src="/botchar.png" alt="Helper" className="mascot-image" />
        </div>
      )}

      {/* --- CHAT WINDOW --- */}
      {isOpen && (
        <>
            {/* Backdrop for mobile */}
            <div className="mobile-backdrop" onClick={() => setIsOpen(false)}></div>
            
            <div className="chat-window glass-panel">
                {/* HEADER */}
                <div className="chat-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="ai-avatar">
                            <img src="/gemini.png" alt="AI" className="avatar-img" />
                        </div>
                        <div>
                            <div className="chat-title">CampusFix AI</div>
                            <div className="chat-subtitle"><Sparkles size={10} /> Powered by Gemini</div>
                        </div>
                    </div>
                    <div onClick={() => setIsOpen(false)} className="close-btn">
                        <X size={18} />
                    </div>
                </div>

                {/* TABS */}
                <div className="tabs-container">
                    <button 
                        className={`tab-btn ${activeTab === 'Chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('Chat')}
                    >
                        💬 Chat
                    </button>
                    <div className="vertical-divider"></div>
                    <div className="scrollable-tabs" ref={tabsRef}>
                        {CATEGORIES.map(cat => (
                            <button 
                                key={cat}
                                className={`tab-btn ${activeTab === 'FAQ' && selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab('FAQ');
                                    setSelectedCategory(cat);
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTENT */}
                <div className="content-area">
                    {activeTab === 'Chat' && (
                        <div className="chat-history">
                            {messages.map((m, i) => (
                                <div key={i} className={`message-row ${m.role}`}>
                                    <div className={`message-bubble ${m.role}`}>
                                        <ReactMarkdown components={{
                                            p: (props) => <p style={{margin: 0}} {...props} />,
                                            strong: (props) => <span style={{fontWeight: 700}} {...props} />,
                                            ul: (props) => <ul style={{margin: '5px 0', paddingLeft: '20px'}} {...props} />,
                                            li: (props) => <li style={{marginBottom: '4px'}} {...props} />
                                        }}>
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    )}

                    {activeTab === 'FAQ' && (
                        <div className="faq-list">
                            <div className="faq-header">
                                Topic: <span style={{color: '#4f46e5', fontWeight: 700}}>{selectedCategory}</span>
                            </div>
                            {KNOWLEDGE_BASE[selectedCategory].map((faq, idx) => (
                                <button 
                                    key={idx} 
                                    className="faq-item"
                                    onClick={() => handleFAQClick(faq)}
                                >
                                    <span className="faq-q">{faq.q}</span>
                                    <ChevronRight size={16} className="faq-icon" />
                                </button>
                            ))}
                            <div className="faq-footer">
                                Can't find it? Type your question below to ask AI.
                            </div>
                        </div>
                    )}
                </div>

                {/* INPUT */}
                <div className="input-area">
                    <input 
                        type="text" 
                        placeholder="Ask specific questions..." 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        className="chat-input"
                    />
                    <button 
                        onClick={() => sendMessage()}
                        disabled={isLoading}
                        className="send-btn"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </>
      )}

      {/* FLOATING BUTTON */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="floating-btn">
            <MessageSquare size={28} fill="white" />
        </button>
      )}

      {/* --- RESPONSIVE CSS --- */}
      <style>{`
        /* 1. RESET & VARIABLES */
        .chatbot-wrapper {
            position: fixed; bottom: 30px; right: 30px; z-index: 9999;
            font-family: 'Inter', system-ui, sans-serif;
        }

        /* 2. CHAT WINDOW CORE */
        .chat-window {
            width: 380px; height: 600px;
            display: flex; flex-direction: column;
            border-radius: 20px; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
            background: #ffffff;
            animation: openChat 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            border: 1px solid rgba(255,255,255,0.8);
            position: relative; z-index: 10000;
        }

        /* 3. HEADER & COLORS (Premium Purple) */
        .chat-header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 16px; color: white;
            display: flex; align-items: center; justify-content: space-between;
        }
        .ai-avatar {
            background: white; border-radius: 50%; width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
        }
        .avatar-img { width: 20px; height: 20px; object-fit: contain; }
        .chat-title { font-weight: 800; font-size: 0.95rem; }
        .chat-subtitle { font-size: 0.7rem; opacity: 0.9; display: flex; align-items: center; gap: 4px; }
        .close-btn { 
            background: rgba(255,255,255,0.2); border-radius: 50%; padding: 6px; 
            cursor: pointer; display: flex; transition: 0.2s;
        }
        .close-btn:hover { background: rgba(255,255,255,0.35); }

        /* 4. TABS */
        .tabs-container {
            display: flex; align-items: center; background: #f1f5f9;
            padding: 8px; gap: 8px; border-bottom: 1px solid #e2e8f0;
        }
        .scrollable-tabs {
            display: flex; overflow-x: auto; gap: 6px; scrollbar-width: none;
            padding-right: 10px;
        }
        .scrollable-tabs::-webkit-scrollbar { display: none; }
        .vertical-divider { width: 1px; height: 20px; background: #cbd5e1; }
        .tab-btn {
            white-space: nowrap; border: none; background: transparent;
            padding: 6px 12px; border-radius: 15px; font-size: 0.8rem;
            font-weight: 600; color: #64748b; cursor: pointer; transition: 0.2s;
        }
        .tab-btn.active {
            background: white; color: #4f46e5; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }

        /* 5. CONTENT AREA */
        .content-area { flex: 1; overflow-y: auto; background: #f8fafc; position: relative; }
        
        .chat-history { padding: 15px; display: flex; flex-direction: column; }
        .message-row { display: flex; margin-bottom: 12px; }
        .message-row.user { justify-content: flex-end; }
        .message-row.assistant { justify-content: flex-start; }
        
        .message-bubble {
            max-width: 85%; padding: 10px 14px; border-radius: 16px;
            font-size: 0.9rem; line-height: 1.5;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        .message-bubble.user {
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            color: white; border-bottom-right-radius: 4px;
        }
        .message-bubble.assistant {
            background: white; color: #1e293b;
            border-bottom-left-radius: 4px; border: 1px solid #e2e8f0;
        }

        .faq-list { padding: 15px; display: flex; flex-direction: column; gap: 8px; }
        .faq-header { font-size: 0.85rem; color: #64748b; margin-bottom: 5px; margin-left: 4px; }
        .faq-item {
            background: white; border: 1px solid #e2e8f0; border-radius: 12px;
            padding: 12px 16px; text-align: left; cursor: pointer;
            display: flex; justify-content: space-between; align-items: center;
            transition: all 0.2s ease;
        }
        .faq-item:hover {
            border-color: #818cf8; transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
        }
        .faq-q { font-size: 0.85rem; color: #334155; font-weight: 500; }
        .faq-icon { color: #cbd5e1; }
        .faq-item:hover .faq-icon { color: #6366f1; }
        .faq-footer { text-align: center; font-size: 0.75rem; color: #94a3b8; margin-top: 15px; }

        /* 6. INPUT */
        .input-area {
            padding: 12px; background: white; border-top: 1px solid #f1f5f9;
            display: flex; gap: 8px; align-items: center;
        }
        .chat-input {
            flex: 1; border: 1px solid #e2e8f0; border-radius: 20px;
            padding: 10px 16px; font-size: 0.9rem; outline: none;
            background: #f8fafc; color: #334155; transition: 0.2s;
        }
        .chat-input:focus { border-color: #6366f1; background: white; }
        .send-btn {
            width: 40px; height: 40px; border-radius: 50%; border: none;
            background: #4f46e5; color: white; display: flex;
            align-items: center; justify-content: center; cursor: pointer;
            transition: 0.2s;
        }
        .send-btn:hover { background: #4338ca; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* 7. FLOATING BUTTON & MASCOT */
        .floating-btn {
            width: 65px; height: 65px; border-radius: 50%;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white; border: 3px solid white; cursor: pointer;
            box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.3s;
        }
        .floating-btn:hover { transform: scale(1.1) rotate(5deg); }

        .mascot-container {
            position: absolute; bottom: 75px; right: 0;
            display: flex; flex-direction: column; align-items: center;
            pointer-events: none; opacity: 0;
            transform: translateY(30px) rotate(-10deg) scale(0.8);
            transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            filter: drop-shadow(0 10px 15px rgba(0,0,0,0.3));
        }
        .mascot-container.visible {
            opacity: 1; transform: translateY(0) rotate(0deg) scale(1);
            pointer-events: auto; cursor: pointer;
        }
        .mascot-image { width: 90px; height: auto; object-fit: contain; animation: wave 3s infinite; }
        .mascot-bubble {
            background: white; padding: 10px 16px; border-radius: 16px;
            border-bottom-right-radius: 2px; font-size: 0.9rem; font-weight: 700;
            color: #4f46e5; margin-bottom: -5px; white-space: nowrap;
            position: relative; left: -10px; z-index: 12;
            animation: pop 0.5s backwards;
        }

        /* 8. ANIMATIONS */
        @keyframes openChat { from { opacity: 0; transform: translateY(20px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes wave { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }
        @keyframes pop { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        .typing-indicator span {
            width: 6px; height: 6px; background: #94a3b8; border-radius: 50%;
            display: inline-block; animation: bounce 1.4s infinite ease-in-out both; margin: 0 2px;
        }
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

        /* 9. MEDIA QUERIES (7 Levels for Perfect Responsiveness) */
        
        /* Level 1: Large Desktop */
        @media (min-width: 1400px) {
            .chat-window { height: 650px; }
        }

        /* Level 2: Laptop */
        @media (max-width: 1200px) {
            .chatbot-wrapper { right: 25px; bottom: 25px; }
        }

        /* Level 3: Tablet Landscape */
        @media (max-width: 992px) {
            .chat-window { width: 360px; height: 550px; }
        }

        /* Level 4: Tablet Portrait */
        @media (max-width: 768px) {
            .chat-window { width: 350px; height: 520px; }
            .mascot-image { width: 80px; }
        }

        /* Level 5: Large Phone */
        @media (max-width: 576px) {
            .chatbot-wrapper { right: 20px; bottom: 20px; }
            .chat-window { 
                width: 320px; height: 480px;
                /* On large phones, keep it floating but smaller */
            }
            .mascot-container { bottom: 85px; right: 0; }
        }

        /* Level 6: Medium Phone (Mobile Bottom Sheet Mode) */
        @media (max-width: 480px) {
            .chatbot-wrapper {
                right: 0; bottom: 0; width: 100%; height: 100%;
                pointer-events: none; z-index: 99999;
                display: flex; justify-content: flex-end; align-items: flex-end;
            }
            .floating-btn {
                pointer-events: auto; margin: 20px;
                width: 55px; height: 55px;
            }
            .chat-window { 
                pointer-events: auto; position: fixed; bottom: 0; left: 0; width: 100%; height: 85vh;
                margin: 0; border-radius: 20px 20px 0 0;
                animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .mascot-container { 
                bottom: 80px; right: 20px; 
                transform: translateY(20px) scale(0.8) !important;
            }
            .mascot-container.visible {
                transform: translateY(0) scale(0.8) !important;
            }
            .mobile-backdrop {
                pointer-events: auto; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); z-index: 9999;
            }
            .chat-header { border-radius: 20px 20px 0 0; padding: 12px 16px; }
        }

        /* Level 7: Small Phone (iPhone SE/Fold) */
        @media (max-width: 375px) {
            .chat-window { height: 90vh; }
            .chat-title { font-size: 0.9rem; }
            .tab-btn { font-size: 0.75rem; padding: 5px 10px; }
            .floating-btn { width: 50px; height: 50px; margin: 15px; }
        }
      `}</style>
    </div>
  );
}

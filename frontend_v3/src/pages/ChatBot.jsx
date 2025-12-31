import React, { useState, useRef, useEffect } from 'react';
import api from '../api';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! 👋 I'm CampusFix AI. Need help with a hostel issue or mess rating?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMascot, setShowMascot] = useState(false);
  
  const scrollRef = useRef(null);

  // --- 1. INTELLIGENT MASCOT TIMER ---
  useEffect(() => {
    // Initial friendly wave after 3 seconds
    const initialTimer = setTimeout(() => {
        if(!isOpen) setShowMascot(true);
        setTimeout(() => setShowMascot(false), 8000);
    }, 3000);

    // Periodic check-in every 45 seconds
    const interval = setInterval(() => {
      if (!isOpen) {
        setShowMascot(true);
        setTimeout(() => setShowMascot(false), 8000);
      }
    }, 45000); 

    return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
    };
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMsg = { role: 'user', content: input };
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
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Brain freeze! Try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      
      {/* --- 2. 3D CHARACTER ANIMATION (PEEKING) --- */}
      {!isOpen && (
        <div 
            className={`mascot-container ${showMascot ? 'visible' : ''}`} 
            onClick={() => setIsOpen(true)}
        >
            <div className="mascot-bubble">
                Need help? Ask me! 🤖
            </div>
            {/* MAKE SURE botchar.png IS IN YOUR PUBLIC FOLDER */}
            <img src="/botchar.png" alt="Helper" className="mascot-image" />
        </div>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="glass-panel" style={{ 
            width: '350px', height: '500px', marginBottom: '15px', 
            display: 'flex', flexDirection: 'column', padding: 0,
            borderRadius: '20px', overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            animation: 'openChat 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            background: 'white'
        }}>
            {/* Header */}
            <div style={{ 
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                padding: '15px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'white', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                        <img src="/gemini.png" alt="AI" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.5px' }}>CampusFix AI</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={10} /> Powered by Gemini
                        </div>
                    </div>
                </div>
                <div 
                    onClick={() => setIsOpen(false)}
                    style={{ background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}
                >
                    <X size={18} />
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '15px', overflowY: 'auto', background: '#f8fafc' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ 
                        display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '12px' 
                    }}>
                        <div style={{ 
                            maxWidth: '85%', padding: '12px 16px', borderRadius: '16px', fontSize: '0.9rem', lineHeight: '1.5',
                            background: m.role === 'user' ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : 'white',
                            color: m.role === 'user' ? 'white' : '#1e293b',
                            boxShadow: m.role === 'user' ? '0 4px 10px rgba(79, 70, 229, 0.3)' : '0 2px 5px rgba(0,0,0,0.05)',
                            borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
                            borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '16px',
                        }}>
                            {/* --- MARKDOWN RENDERER --- */}
                            {m.role === 'user' ? m.content : (
                                <ReactMarkdown 
                                    components={{
                                        // Removed unused 'node' to fix lint errors
                                        p: (props) => <p style={{margin: 0}} {...props} />,
                                        strong: (props) => <span style={{fontWeight: 700, color: '#4f46e5'}} {...props} />,
                                        ul: (props) => <ul style={{margin: '5px 0', paddingLeft: '20px'}} {...props} />,
                                        li: (props) => <li style={{marginBottom: '4px'}} {...props} />
                                    }}
                                >
                                    {m.content}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '10px', marginTop: '5px' }}>
                        <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
                        <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                        <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '15px', background: 'white', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    placeholder="Ask anything..." 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    style={{ 
                        flex: 1, border: '1px solid #e2e8f0', borderRadius: '25px', padding: '12px 20px', 
                        outline: 'none', fontSize: '0.9rem', background: '#f8fafc', color: '#334155',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                <button 
                    onClick={sendMessage}
                    disabled={isLoading}
                    style={{ 
                        background: '#4f46e5', color: 'white', border: 'none', width: '45px', height: '45px', 
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        opacity: isLoading ? 0.7 : 1, boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
                        transition: 'transform 0.1s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
      )}

      {/* FLOATING BUTTON */}
      {!isOpen && (
        <button 
            onClick={() => setIsOpen(true)}
            style={{ 
                width: '65px', height: '65px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: 'white', border: '4px solid white', cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                position: 'relative',
                zIndex: 10
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
        >
            <MessageSquare size={30} fill="white" />
        </button>
      )}

      {/* --- CSS ANIMATIONS --- */}
      <style>{`
        @keyframes openChat { from { opacity: 0; transform: translateY(20px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .typing-dot { width: 8px; height: 8px; background: #94a3b8; borderRadius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

        /* --- 3D MASCOT ANIMATION STYLES --- */
        .mascot-container {
            position: absolute;
            bottom: 75px; 
            right: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            pointer-events: none;
            opacity: 0;
            transform: translateY(30px) rotate(-10deg) scale(0.8);
            transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); 
            filter: drop-shadow(0 10px 15px rgba(0,0,0,0.3)); 
        }

        .mascot-container.visible {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
            pointer-events: auto;
            cursor: pointer;
        }

        .mascot-image {
            width: 90px; 
            height: auto;
            object-fit: contain;
            transform-origin: bottom center;
            animation: wave 2.5s infinite ease-in-out;
        }

        .mascot-bubble {
            background: white;
            padding: 10px 16px;
            border-radius: 16px;
            border-bottom-right-radius: 2px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            font-size: 0.9rem;
            font-weight: 700;
            color: #4f46e5;
            margin-bottom: -5px;
            white-space: nowrap;
            position: relative;
            left: -10px; 
            z-index: 12;
            animation: bubblePop 0.5s 0.2s backwards;
        }

        @keyframes wave {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-8deg); }
            75% { transform: rotate(8deg); }
        }

        @keyframes bubblePop {
            0% { opacity: 0; transform: scale(0.8) translateY(10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
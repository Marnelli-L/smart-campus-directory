import { useState, useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";
import lioKnowledge from "../knowledge/lioKnowledge";
import { createPortal } from "react-dom";
import OnScreenKeyboard from "./OnScreenKeyboard";


function LioButton() {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const audioRef = useRef(null);
  
  // Detect if the device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const [chatMessages, setChatMessages] = useState([
    {
      from: "lio",
      text: {
        EN: (
          <>
            <div className="mb-2">
              <span className="font-bold">Hi! I’m Lio 👋</span>
            </div>
            <div className="mb-2">
              I’m your UDM campus assistant. Ask me for directions, info, or campus updates!
            </div>
            <div className="mb-2">
              <span className="font-semibold">Try asking:</span>
              <ul className="list-disc list-inside ml-3 mt-1 text-[#00695C]">
                <li>Where is the library?</li>
                <li>Show me the campus map</li>
                <li>What are today’s events?</li>
                <li>How do I get to Registrar?</li>
                <li>Latest announcements</li>
              </ul>
            </div>
            <div>
              <span>
                Type your question or tap a suggestion below.
              </span>
            </div>
          </>
        ),
        TL: (
          <>
            <div className="mb-2">
              <span className="font-bold">Hi! Ako si Lio 👋</span>
            </div>
            <div className="mb-2">
              Ako ang iyong UDM campus assistant. Magtanong tungkol sa direksyon, impormasyon, o update sa campus!
            </div>
            <div className="mb-2">
              <span className="font-semibold">Subukan mong itanong:</span>
              <ul className="list-disc list-inside ml-3 mt-1 text-[#00695C]">
                <li>Nasaan ang aklatan?</li>
                <li>Ipakita ang mapa ng campus</li>
                <li>Ano ang mga kaganapan ngayon?</li>
                <li>Paano pumunta sa Registrar?</li>
                <li>Pinakabagong anunsyo</li>
              </ul>
            </div>
            <div>
              <span>
                Mag-type ng tanong o pindutin ang suhestiyon sa ibaba.
              </span>
            </div>
          </>
        ),
      },
      bold: true,
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  

  const tips = [
    { EN: "Hi there! I'm Lio.", TL: "Kumusta! Ako si Lio." },
    { EN: "Need directions?", TL: "Kailangan mo ba ng direksyon?" },
    { EN: "I'm here to help!", TL: "Narito ako upang tumulong!" },
    { EN: "Where to go next?", TL: "Saan ka pupunta sunod?" }
  ];
  const [index, setIndex] = useState(0);

  // Rotate bubble text
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Handle Lio image click
  const handleLioClick = () => {
    if (!open) {
      // Opening Lio - play audio
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // Reset to start
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
      }
    } else {
      // Closing Lio - stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
    setOpen((prev) => !prev);
  };

  // Handle close button click
  const handleCloseClick = () => {
    // Stop audio when closing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setOpen(false);
  };

  // Send message
  const handleSend = (msg) => {
    const text = msg || input.trim();
    if (!text) return;
    setChatMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    handleBotResponse(text);
  };

  // Simple keyword recognition
  const handleBotResponse = (text) => {
    const lower = text.toLowerCase();

    const found = lioKnowledge.find((entry) =>
      entry.keywords.some((keyword) => lower.includes(keyword))
    );

    if (found) {
      const response = found.answer[language] || found.answer["EN"];
      setChatMessages((prev) => [
        ...prev,
        { from: "lio", text: response }
      ]);
    } else {
      const fallbackResponse = language === "EN"
        ? "Sorry, I didn't quite get that. Try 'library', 'events', 'map', 'services', 'history', or 'admin'."
        : "Paumanhin, hindi ko naintindihan. Subukan ang 'aklatan', 'kaganapan', 'mapa', 'serbisyo', 'kasaysayan', o 'pamunuan'.";
      
      setChatMessages((prev) => [
        ...prev,
        {
          from: "lio",
          text: fallbackResponse
        }
      ]);
    }
  };

  // Only suggested questions (no quick action buttons)
  const suggestedQuestions = [
    { EN: "Where is the library?", TL: "Nasaan ang aklatan?", answer: {
      EN: "The library is located on the 2nd floor of the main building, near the Registrar's office.",
      TL: "Ang aklatan ay matatagpuan sa ikalawang palapag ng main building, malapit sa opisina ng Registrar."
    }},
    { EN: "Show me the campus map", TL: "Ipakita ang mapa ng campus", answer: {
      EN: "You can view the campus map by clicking the 'Map' tab above or visiting the Map page.",
      TL: "Maaari mong makita ang mapa ng campus sa pamamagitan ng pag-click sa 'Mapa' tab sa itaas o pagbisita sa Map page."
    }},
    { EN: "What are today's events?", TL: "Ano ang mga kaganapan ngayon?", answer: {
      EN: "Today's events: Orientation at 9AM in the Auditorium, and a Club Fair at 2PM in the Quadrangle.",
      TL: "Mga kaganapan ngayon: Orientation sa 9AM sa Auditorium, at Club Fair sa 2PM sa Quadrangle."
    }},
    { EN: "How do I get to Registrar?", TL: "Paano pumunta sa Registrar?", answer: {
      EN: "The Registrar's office is on the 1st floor, just past the main entrance on your right.",
      TL: "Ang opisina ng Registrar ay nasa unang palapag, lampas lang sa main entrance sa iyong kanan."
    }},
  ];

  return (
    <>
      {/* Chatbox */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
            className="fixed flex flex-col overflow-hidden border border-gray-200 shadow-lg"
              style={{
                width: isMobile ? 300 : 370,
                maxWidth: "95vw",
                height: keyboardOpen ? "min(18rem,40vh)" : isMobile ? "min(28rem,70vh)" : "min(32rem,80vh)",
                maxHeight: keyboardOpen ? "40vh" : isMobile ? "70vh" : "80vh",
                bottom: isMobile ? "5rem" : "9rem",
                right: isMobile ? "0.75rem" : "1.5rem",
                borderRadius: "1.25rem",
                background: "#fff",
                boxShadow: "0 4px 24px 0 rgba(31, 38, 135, 0.08)",
                border: "1px solid #f3f3f3",
                display: "flex",
                flexDirection: "column",
                zIndex: 99999,
                transition: "height 0.3s ease, max-height 0.3s ease"
              }}
          >
            {/* Header */}
            <div
              className="px-4 py-2 flex justify-between items-center shadow"
              style={{
                background: "#00594A",
                color: "white",
                borderBottom: "1px solid rgba(0,0,0,0.05)",
                boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
                minHeight: 48,
              }}
            >
              <span className="font-semibold text-[15px] tracking-wide flex items-center gap-2">
                <img
                  src="\public\images\Chathead.png"
                  alt="Lio"
                  className="w-7 h-7 rounded-full border border-white shadow"
                />
                Lio – Campus Assistant
              </span>
              <button
                onClick={handleCloseClick}
                className="text-white hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 px-4 py-3 text-[15px] space-y-2 overflow-y-auto"
              style={{
                minHeight: 0,
                background: "rgba(245, 245, 250, 0.7)",
                borderBottom: "1px solid rgba(0,0,0,0.04)",
              }}
            >
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-2xl max-w-[80%] shadow-md border transition-all ${
                    m.from === "lio"
                      ? "bg-white/80 text-gray-800 border-gray-100"
                      : "ml-auto text-white"
                  }`}
                  style={
                    m.from === "user"
                      ? {
                          background: "#00594A",
                          border: "none",
                          boxShadow: "0 2px 8px 0 rgba(0,185,148,0.10)",
                          fontSize: 14,
                        }
                      : {
                          boxShadow: "0 2px 8px 0 rgba(0,0,0,0.06)",
                          fontSize: 14,
                        }
                  }
                >
                  {/* Render JSX if present, else plain text */}
                  {typeof m.text === "object"
                    ? typeof m.text[language] === "string"
                      ? m.text[language]
                      : m.text[language]
                    : m.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions only */}
            <div className="bg-white/60 border-t border-gray-100 px-3 py-2">
              <div className="mb-2 flex flex-wrap gap-1">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className="bg-[#E0F2EF] text-[#00695C] rounded-full px-2 py-1 text-xs font-medium hover:bg-[#C8E6E0] transition focus:outline-none focus:ring-2 focus:ring-[#00695C]"
                    style={{ fontSize: 12, lineHeight: "1.1" }}
                    onClick={() => {
                      setChatMessages((prev) => [
                        ...prev,
                        { from: "user", text: q[language] },
                        { from: "lio", text: q.answer[language] }
                      ]);
                    }}
                    tabIndex={0}
                  >
                    {q[language]}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="border-t px-3 py-2 flex bg-white/80" style={{ minHeight: 48 }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => !isMobile && setKeyboardOpen(true)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                readOnly={!isMobile}
                className="flex-1 text-[15px] border-none rounded-full px-3 py-2 focus:outline-none bg-white/80 shadow-inner transition-all cursor-pointer"
                style={{
                  boxShadow: "0 1px 4px 0 rgba(0,185,148,0.06)",
                  fontSize: 14,
                  minHeight: 32,
                }}
                aria-label="Type your message"
              />
              <button
                className="ml-2 px-4 py-2 rounded-full text-white font-medium transition shadow-lg"
                style={{
                  background: "#00594A",
                  boxShadow: "0 2px 8px 0 rgba(0,185,148,0.12)",
                  minHeight: 32,
                  minWidth: 38,
                  fontSize: 16,
                }}
                aria-label="Send message"
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#00B894")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#00594A")
                }
                onClick={() => handleSend()
                }
              >
                ➤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.div
        className="fixed bottom-8 right-4 flex flex-col items-center"
        onClick={handleLioClick}
        style={{ zIndex: 100001 }}
      >
        {/* White Bubble Message */}
        <AnimatePresence mode="wait">
          {!open && (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="absolute right-24 bottom-20 text-xs px-4 py-2 rounded-full shadow-md border border-gray-200 text-gray-800 font-bold whitespace-nowrap max-w-[70vw] sm:max-w-xs overflow-hidden text-ellipsis"
              style={{ background: "white" }}
            >
              {tips[index][language]}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Lio Image */}
        <motion.img
          src="/images/LioPicture.png"
          alt="Lio Chatbot"
          className={isMobile ? "w-20 h-20" : "w-28 h-28"}
          animate={{
            scale: [1, 1.08, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut"
          }}
          style={{
            background: "transparent",
            position: "relative",
            zIndex: 100002,
            transform: open ? "translateY(10px)" : "translateY(0)",
            objectFit: "contain",
            cursor: "pointer"
          }}
        />
      </motion.div>

      {/* On-Screen Keyboard for Chat - Only show on non-mobile devices */}
      {!isMobile && keyboardOpen && open && createPortal(
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99998, // Just below chat window
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '20px',
            pointerEvents: 'none',
            animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <style>{`
            @keyframes slideUp {
              from { 
                transform: translateY(100%); 
                opacity: 0;
              }
              to { 
                transform: translateY(0); 
                opacity: 1;
              }
            }
          `}</style>
          <div style={{ pointerEvents: 'auto' }}>
            <OnScreenKeyboard
              value={input}
              onChange={(v) => setInput(v)}
              onClose={() => setKeyboardOpen(false)}
              onEnter={() => {
                handleSend();
                setKeyboardOpen(false);
              }}
              style={{ maxWidth: '800px', width: '95vw' }}
              placeholder="Type a message..."
            />
          </div>
        </div>,
        document.body
      )}

      {/* Hidden audio element for Lio's voice */}
      <audio 
        ref={audioRef} 
        src="/images/lio.mp3"
        preload="auto"
      />
    </>
  );
}

export default LioButton;
import React from "react";
import { createPortal } from 'react-dom';
import OnScreenKeyboard from "../components/OnScreenKeyboard";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";

const titles = {
  EN: "Welcome to",
  TL: "Maligayang pagdating sa",
};

const directory = {
  EN: "UDM Campus Directory",
  TL: "UDM Campus Directory",
};

const subtexts = {
  EN: "Navigate our campus with ease — maps, services, and information at your fingertips.",
  TL: "Mag-navigate sa aming campus nang madali — mapa, serbisyo, at impormasyon sa iyong mga kamay.",
};

export default function Home() {
  const { language } = useLanguage();

  const [keyboardOpen, setKeyboardOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [geoData, setGeoData] = React.useState(null);
  const [suggestions, setSuggestions] = React.useState([]);
  
  // Detect if the device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Prevent scrolling when this component is mounted
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100vh";
    document.documentElement.style.height = "100vh";
    document.body.style.margin = "0";
    document.documentElement.style.margin = "0";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.height = "";
      document.body.style.margin = "";
      document.documentElement.style.margin = "";
    };
  }, []);

  // Load GeoJSON once (used for suggestions)
  React.useEffect(() => {
    let mounted = true;
    async function loadGeo() {
      try {
        const res = await fetch('/images/smart-campus-map.geojson');
        if (!res.ok) throw new Error('Failed to load geojson');
        const j = await res.json();
        if (!mounted) return;
        setGeoData(j);
      } catch (err) {
        console.warn('Could not load GeoJSON for suggestions:', err);
      }
    }
    loadGeo();
    return () => { mounted = false; };
  }, []);

  // Update suggestions based on search text
  React.useEffect(() => {
    if (!geoData || !searchText) {
      setSuggestions([]);
      return;
    }

    const q = searchText.trim().toLowerCase();
    if (q.length === 0) {
      setSuggestions([]);
      return;
    }

    // Extract unique names from GeoJSON
    const names = new Map();
    (geoData.features || []).forEach(f => {
      const props = f.properties || {};
      const name = (props.Name || props.name || props.Building || props.building || '').toString().trim();
      if (name) names.set(name, (names.get(name) || 0) + 1);
    });

    const matchedSuggestions = Array.from(names.keys())
      .filter(n => n.toLowerCase().includes(q))
      .sort((a,b) => a.localeCompare(b))
      .slice(0, 8);

    setSuggestions(matchedSuggestions);
  }, [searchText, geoData]);

  // Handle search submission
  const handleSearch = React.useCallback((query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    
    // Navigate to map with destination
    window.location.href = `/map?destination=${encodeURIComponent(trimmedQuery)}`;
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden font-sans" style={{ WebkitTapHighlightColor: 'transparent' }}>
      {/* Background video */}
      <motion.video
        autoPlay
        loop
        muted
        playsInline
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="fixed top-0 left-0 w-screen h-screen object-cover"
      >
        <source src="/videos/UDM_VIDEO.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </motion.video>

      {/* Overlay */}
      <div className="fixed top-0 left-0 w-screen h-screen bg-gradient-to-b from-black/60 via-black/30 to-black/60" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-wide mb-2 px-4"
        >
          {titles[language]}{" "}
          <span
            className="font-extrabold"
            style={{
              color: "#bf9b30",
              textShadow: "1px 1px 1px rgba(0, 0, 0, 0.7)",
            }}
          >
            {directory[language]}
          </span>
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-2 text-base sm:text-lg md:text-xl text-gray-200 max-w-xl mx-auto px-4"
        >
          {subtexts[language]}
        </motion.p>

        {/* Enhanced Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-6 sm:mt-10 w-full max-w-lg flex flex-col items-center px-4"
        >
          <div className="w-full flex items-center bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-3 sm:px-4 py-2.5 sm:py-3 border border-white/20" style={{ pointerEvents: 'auto' }}>
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 text-[#00695C] mr-2 sm:mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-label="Search icon"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search for buildings, rooms, or services…"
              className="flex-1 bg-transparent outline-none text-base sm:text-lg text-[#00695C] placeholder-[#00695C]/60 font-semibold min-w-0"
              style={{ color: "#00695C", fontWeight: 600 }}
              onFocus={() => !isMobile && setKeyboardOpen(true)}
              onBlur={(e) => {
                // Don't close if clicking on keyboard
                const relatedTarget = e.relatedTarget;
                if (!relatedTarget || !relatedTarget.closest('[role="dialog"]')) {
                  // Delay to allow keyboard interaction
                  setTimeout(() => setKeyboardOpen(false), 200);
                }
              }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchText);
                }
              }}
              readOnly={!isMobile} // Make it read-only on non-mobile so physical keyboard doesn't interfere in kiosk mode
              aria-haspopup="dialog"
              aria-expanded={keyboardOpen}
            />
            
            {/* Search Button */}
            <button
              onClick={() => handleSearch(searchText)}
              className="ml-1 sm:ml-2 p-2 bg-[#00695C] text-white rounded-full hover:bg-[#00594A] transition-all shadow-md flex-shrink-0"
              title="Search"
              aria-label="Search"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
          </div>

          {/* Enhanced Quick Search Suggestions */}
          <div className="mt-3 sm:mt-4 flex gap-2 flex-wrap justify-center">
            {["Library", "Registrar", "CCS Department"].map((place) => (
              <button
                key={place}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-[#00594A] to-[#007763] text-white rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium text-sm"
                onClick={() => handleSearch(place)}
              >
                {place}
              </button>
            ))}
          </div>
        </motion.div>
        {/* Portal injected keyboard - Only show on non-mobile devices */}
        {!isMobile && keyboardOpen && createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)',
              animation: 'fadeIn 0.2s ease-out',
              padding: '10px'
            }}
            aria-label="On-screen keyboard overlay"
            onClick={(e) => {
              // Click on dimmed background closes keyboard
              if (e.target === e.currentTarget) setKeyboardOpen(false);
            }}
          >
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
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
            <div style={{ animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)', maxWidth: '100%' }}>
              <OnScreenKeyboard
                value={searchText}
                onChange={(v) => setSearchText(v)}
                suggestions={suggestions}
                onClose={() => setKeyboardOpen(false)}
                onEnter={() => {
                  const q = searchText.trim();
                  if (q) {
                    handleSearch(q);
                    setKeyboardOpen(false);
                  }
                }}
                style={{ maxWidth: '900px', width: '100%' }}
                placeholder="Search for buildings, rooms, or services…"
              />
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

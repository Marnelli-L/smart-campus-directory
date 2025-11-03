import React, { useState, useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { MdLayers } from "react-icons/md";
import { createPortal } from "react-dom";
import MapView from "../components/MapView";
import OnScreenKeyboard from "../components/OnScreenKeyboard";
import { campusSearchEngine, SearchUtils } from "../utils/advancedSearch";

// Available rooms for search suggestions - will be loaded from GeoJSON
let ALL_ROOMS = [
  'Accreditation Office', 'Registrar Office', 'Cashier', 'Library', 'Canteen',
  "Dean's Office", 'Faculty Room', 'Classroom 101', 'Classroom 102',
  'Computer Laboratory', 'Science Laboratory', 'Classroom 201', 'Classroom 202',
  'Conference Room', 'Auditorium', 'Classroom 301'
];

const FLOORS = [
  { label: "Ground Floor", value: "F1", image: "/images/F1.svg" },
  { label: "2nd Floor", value: "F2", image: "/images/F2.svg" },
  { label: "3rd Floor", value: "F3", image: "/images/F3.svg" },
  { label: "4th Floor", value: "F4", image: "/images/F4.svg" },
];

const essentialButtons = [
  {
    label: "Reset View",
    action: "reset",
    icon: (
      <svg
        className="w-6 h-6 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-label="Reset View"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
    color: "#00695C",
  },
  {
    label: "Locate Me",
    action: "locate",
    icon: (
      <svg
        className="w-6 h-6 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-label="Locate Me"
      >
        <circle cx="12" cy="12" r="10" stroke="#00695C" strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="4" stroke="#00695C" strokeWidth="2" fill="#00695C" />
      </svg>
    ),
    color: "#00695C",
  },
];

function Map() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(FLOORS[0].value);
  const [searchDestination, setSearchDestination] = useState(null);
  const [multiStopMode, setMultiStopMode] = useState(false);
  const [selectedStops, setSelectedStops] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [_geoData, setGeoData] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const searchInputRef = useRef(null);
  const mapViewRef = useRef(null);

  // Check for destination parameter in URL and set it
  useEffect(() => {
    const destinationParam = searchParams.get('destination');
    if (destinationParam) {
      setSearch(destinationParam);
      setSearchDestination(destinationParam);
      // Auto-focus search bar for better UX
      if (searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current.focus();
        }, 100);
      }
    }
  }, [searchParams]);

  // Load GeoJSON data and initialize search engine
  useEffect(() => {
    const loadGeoJSONData = async () => {
      try {
        const response = await fetch('/images/smart-campus-map.geojson');
        if (response.ok) {
          const data = await response.json();
          setGeoData(data);
          
          // Extract data for search engine
          const buildings = [];
          const rooms = [];
          const services = [];
          
          data.features.forEach(feature => {
            const props = feature.properties || {};
            const name = (props.Name || props.name || props.Building || props.building || '').toString().trim();
            const type = (props.Type || props.type || '').toString().toLowerCase();
            
            if (name) {
              const item = {
                id: feature.id || name,
                name: name,
                type: type,
                building: props.Building || props.building,
                description: props.Description || props.description || '',
                category: props.Category || props.category || '',
                floor: props.Floor || props.floor,
                coordinates: feature.geometry?.coordinates
              };

              if (type.includes('building') || type.includes('hall')) {
                buildings.push(item);
              } else if (type.includes('room') || type.includes('office')) {
                rooms.push(item);
              } else {
                services.push(item);
              }
            }
          });

          // Initialize search engine
          campusSearchEngine.buildIndex({
            buildings,
            rooms,
            services
          });

          // Update ALL_ROOMS for legacy compatibility
          const roomNames = data.features
            .filter(f => f.geometry.type === 'Point' && (f.properties.Name || f.properties.name))
            .map(f => f.properties.Name || f.properties.name)
            .filter(name => name && name.trim())
            .sort();
          
          if (roomNames.length > 0) {
            ALL_ROOMS = roomNames;
            console.log('📍 Loaded rooms from GeoJSON:', roomNames.length);
          }
        }
      } catch (error) {
        console.warn('Could not load GeoJSON data:', error);
      }
    };

    loadGeoJSONData();
  }, []);

  // Handler for essential buttons - now properly connected to MapView
  const handleEssential = (action) => {
    if (action === "reset") {
      if (mapViewRef.current && mapViewRef.current.resetView) {
        mapViewRef.current.resetView();
      }
    } else if (action === "locate") {
      if (mapViewRef.current && mapViewRef.current.locateUser) {
        mapViewRef.current.locateUser();
      }
    }
  };



  useEffect(() => {
    if (location.state?.from === "admin" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [location.state]);

  // Enhanced search with advanced search engine
  useEffect(() => {
    if (search.length > 1) {
      // Use advanced search engine
      const advancedResults = campusSearchEngine.search(search, {
        maxResults: 8,
        fuzzyThreshold: 0.6
      });

      setSearchResults(advancedResults);

      // Legacy fallback search
      const legacyFiltered = ALL_ROOMS.filter(room => 
        room.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5);
      
      // Combine suggestions and remove duplicates (case-insensitive)
      const seenLowerCase = new Set();
      const uniqueSuggestions = [];
      
      // Process all suggestions
      const allSuggestions = [...advancedResults.suggestions, ...legacyFiltered];
      
      for (const name of allSuggestions) {
        const lowerName = name.toLowerCase();
        if (!seenLowerCase.has(lowerName)) {
          seenLowerCase.add(lowerName);
          uniqueSuggestions.push(name);
        }
      }
      
      // Convert to final format and limit to 8 results
      const finalSuggestions = uniqueSuggestions
        .slice(0, 8)
        .map((name, index) => ({ id: `suggestion-${index}`, name }));

      setSuggestions(finalSuggestions);

      // Update recent searches
      if (search.trim().length > 2) {
        setRecentSearches(prev => {
          const newRecent = [search.trim(), ...prev.filter(s => s !== search.trim())].slice(0, 5);
          return newRecent;
        });
      }
    } else {
      setSuggestions([]);
      setSearchResults(null);
    }
  }, [search]);

  // Custom dropdown open state for floor selector
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);
  const floorDropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!floorDropdownOpen) return;
    const handler = (e) => {
      if (floorDropdownRef.current && !floorDropdownRef.current.contains(e.target)) {
        setFloorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [floorDropdownOpen]);

  return (
    <div className="min-h-screen font-sans flex flex-col relative">
      {/* Controls Bar */}
      <div className="w-full flex justify-center mt-4 absolute top-0 left-0 z-50">
        <div
          className="
            flex flex-row items-center
            py-4 px-6
            rounded-3xl
            bg-white
            shadow
            border border-[#e0e0e0]
            gap-4
            transition-all
            relative
            z-30
          "
          style={{
            // Let width fit content, but max out for better responsive behavior
            width: "auto",
            maxWidth: "95vw",
            marginBottom: 28,
            boxShadow: "0 2px 10px 0 rgba(0,105,92,0.08)",
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
            minWidth: 0,
            flexWrap: "nowrap",
          }}
        >
          {/* Enhanced Search Bar with category filter */}
          <div
            className="flex flex-col relative"
            style={{
              width: 500,
              minWidth: 400,
              maxWidth: 600,
              marginRight: 0,
              flex: "0 0 auto",
            }}
          >
            <div
              className="flex items-center bg-white rounded-2xl px-6 py-2 border transition-all"
              style={{
                borderColor: "#00695C",
                borderWidth: 2,
                height: 48,
                boxShadow: "none",
                fontSize: 18,
                width: "100%",
                borderRadius: 16,
                fontWeight: 600,
              }}
              tabIndex={-1}
            >
              <svg
                className="w-6 h-6 text-[#00695C] mr-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-label="Search"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setKeyboardOpen(true)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    setSearchDestination(search.trim());
                    setSuggestions([]);
                    setKeyboardOpen(false);
                  }
                }}
                placeholder="Search rooms, buildings, services..."
                className="flex-1 bg-transparent outline-none text-lg text-[#00695C] placeholder-[#00695C]/60 font-semibold"
                aria-label="Search for a room, building, or service"
                autoComplete="off"
                readOnly
                style={{
                  minHeight: 40,
                  fontSize: 18,
                  border: "none",
                  boxShadow: "none",
                  background: "transparent",
                  width: "100%",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              />
              
              {/* Search Analytics Display */}
              {searchResults && (
                <div className="flex items-center mr-3 text-sm text-[#00695C]/70">
                  {searchResults.totalFound} result{searchResults.totalFound !== 1 ? 's' : ''}
                </div>
              )}
              
              {searchDestination && (
                <button
                  onClick={() => {
                    setSearchDestination(null);
                    setSearch('');
                  }}
                  className="ml-2 text-[#00695C] hover:text-[#004d40] transition-colors"
                  title="Clear navigation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Enhanced Autocomplete Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full bg-white border border-[#00695C] rounded-b-2xl shadow-lg z-40 max-h-64 overflow-y-auto">
                {/* Recent searches */}
                {recentSearches.length > 0 && search.length === 0 && (
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="text-xs text-gray-500 mb-2">Recent Searches</div>
                    {recentSearches.slice(0, 3).map((recent, index) => (
                      <button
                        key={`recent-${index}`}
                        className="w-full text-left px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                        onClick={() => {
                          setSearch(recent);
                          setSearchDestination(recent);
                          setSuggestions([]);
                        }}
                      >
                        🕐 {recent}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Search suggestions */}
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    className="w-full text-left px-6 py-3 hover:bg-[#E0F2EF] text-[#00695C] font-semibold flex justify-between items-center transition-colors"
                    onClick={() => {
                      if (multiStopMode) {
                        // Add to multi-stop list
                        if (!selectedStops.some(stop => stop.name === s.name)) {
                          setSelectedStops([...selectedStops, { name: s.name, id: s.id }]);
                        }
                        setSearch('');
                        setSuggestions([]);
                      } else {
                        // Normal single destination
                        setSearch(s.name);
                        setSearchDestination(s.name);
                        setSuggestions([]);
                      }
                    }}
                    tabIndex={0}
                  >
                    <span className="flex items-center">
                      {s.name}
                    </span>
                    {multiStopMode && (
                      <span className="text-xs text-[#9c27b0]">
                        {selectedStops.some(stop => stop.name === s.name) ? '✓ Added' : '+ Add Stop'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Floor Selector as custom dropdown with icon and chevron */}
          <div
            className="relative flex items-bottom"
            style={{
              minWidth: 0,
              width: 200,
              height: 48,
              flex: "0 0 auto",
            }}
            ref={floorDropdownRef}
          >
            <button
              type="button"
              className="flex items-center gap-2 pl-3 pr-8 py-2 bg-white rounded-2xl border border-[#00695C] text-[#00695C] font-bold text-base outline-none focus:ring-2 focus:ring-[#00695C] transition-all duration-200 cursor-pointer hover:bg-[#E0F2EF] focus:bg-[#E0F2EF] relative"
              style={{
                width: 200,
                height: 48,
                borderRadius: 16,
                fontSize: 16,
                boxShadow: "none",
                borderWidth: 2,
                fontWeight: 600,
                position: "relative",
                zIndex: 50,
                whiteSpace: "nowrap",
              }}
              aria-haspopup="listbox"
              aria-expanded={floorDropdownOpen}
              aria-label="Select floor"
              onClick={() => setFloorDropdownOpen((v) => !v)}
              tabIndex={0}
            >
              <MdLayers size={22} className="text-[#00695C]" />
              <span>
                {FLOORS.find(f => f.value === selectedFloor)?.label}
              </span>
              <span
                className="absolute right-4 text-[#00695C] text-base pointer-events-none"
                style={{
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
                aria-hidden="true"
              >
                ▼
              </span>
            </button>
            {floorDropdownOpen && (
              <ul
                className="absolute left-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-[#00695C] z-[100]"
                style={{
                  minWidth: 130,
                  fontSize: 16,
                  padding: 0,
                  listStyle: "none",
                  boxShadow: "0 8px 32px 0 rgba(0,105,92,0.13)",
                }}
                role="listbox"
              >
                {FLOORS.map((f) => (
                  <li
                    key={f.value}
                    className={`px-5 py-2 cursor-pointer transition-all ${
                      selectedFloor === f.value
                        ? "bg-[#00695C] text-white font-bold"
                        : "hover:bg-[#E0F2EF] text-[#00695C]"
                    }`}
                    style={{
                      borderRadius: 12,
                      fontSize: 16,
                      margin: "2px 0",
                      fontWeight: 600,
                    }}
                    role="option"
                    aria-selected={selectedFloor === f.value}
                    tabIndex={0}
                    onClick={() => {
                      setSelectedFloor(f.value);
                      setFloorDropdownOpen(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelectedFloor(f.value);
                        setFloorDropdownOpen(false);
                      }
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <MdLayers size={18} className="text-[#00695C] inline-block" />
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Map Action Buttons (Reset View, Locate Me) */}
          {essentialButtons.map((btn, idx) => (
            <button
              key={btn.action}
              className="flex items-center gap-2 px-4 py-2 border border-[#00695C] bg-white text-[#00695C] font-bold text-sm transition-all duration-200 hover:bg-[#E0F2EF] focus:outline-none focus:ring-2 focus:ring-[#00695C]"
              style={{
                fontSize: 14,
                width: 140,
                minWidth: 110,
                borderRadius: 16,
                boxShadow: "none",
                height: 48,
                flex: "0 0 auto",
                whiteSpace: "nowrap",
                borderWidth: 2,
                fontWeight: 600,
                marginRight: idx === essentialButtons.length - 1 ? 0 : 0,
              }}
              onClick={() => handleEssential(btn.action)}
              aria-label={btn.label}
            >
              <span style={{ color: "#00695C", display: "flex", alignItems: "center" }}>
                {btn.icon}
              </span>
              <span>{btn.label}</span>
            </button>
          ))}
          
          {/* Multi-Stop Routing Button */}
          <button
            className={`flex items-center gap-2 px-4 py-2 border-2 font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00695C] ${
              multiStopMode 
                ? 'bg-[#9c27b0] border-[#9c27b0] text-white hover:bg-[#7b1fa2]' 
                : 'border-[#9c27b0] bg-white text-[#9c27b0] hover:bg-[#f3e5f5]'
            }`}
            style={{
              fontSize: 14,
              width: 140,
              minWidth: 110,
              borderRadius: 16,
              boxShadow: "none",
              height: 48,
              flex: "0 0 auto",
              whiteSpace: "nowrap",
              fontWeight: 600,
            }}
            onClick={() => setMultiStopMode(!multiStopMode)}
            aria-label={multiStopMode ? "Exit Multi-Stop Mode" : "Multi-Stop Routing"}
            title={multiStopMode ? "Click to exit multi-stop mode" : "Plan route with multiple destinations"}
          >
            <span style={{ display: "flex", alignItems: "center" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span>{multiStopMode ? "Exit Multi" : "Multi-Stop"}</span>
          </button>

          {/* Emergency Exit Button */}
          <button
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#f44336] bg-white text-[#f44336] hover:bg-[#ffebee] font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#f44336]"
            style={{
              fontSize: 14,
              width: 140,
              minWidth: 110,
              borderRadius: 16,
              boxShadow: "none",
              height: 48,
              flex: "0 0 auto",
              whiteSpace: "nowrap",
              fontWeight: 600,
            }}
            onClick={() => {
              setSearchDestination("EMERGENCY_EXIT");
              setMultiStopMode(false);
              setSelectedStops([]);
            }}
            aria-label="Emergency Exit Route"
            title="Find fastest route to nearest emergency exit"
          >
            <span style={{ display: "flex", alignItems: "center" }}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </span>
            <span>Emergency</span>
          </button>


        </div>
      </div>
      
      {/* Multi-Stop Mode Instructions */}
      {multiStopMode && (
        <div className="w-full flex justify-center mb-4">
          <div className="bg-[#f3e5f5] border-l-4 border-[#9c27b0] p-4 rounded-r-lg shadow-sm max-w-4xl">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-[#9c27b0] font-semibold">
                  🚶‍♂️ Multi-Stop Mode Active - Search and add multiple destinations to plan your route
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Selected stops: {selectedStops.length > 0 ? selectedStops.map(s => s.name).join(' → ') : 'None yet'}
                </p>
                {selectedStops.length > 1 && (
                  <button
                    className="mt-2 px-3 py-1 bg-[#9c27b0] text-white text-xs rounded-lg hover:bg-[#7b1fa2] transition-colors"
                    onClick={() => setSelectedStops([])}
                  >
                    Clear All Stops
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      
      {/* Full Screen Mapbox Container */}
      <div 
        id="mapbox-map-container" 
        className="absolute inset-0 w-full h-full"
        style={{ 
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1
        }}
      >
        {/* Your Mapbox implementation goes here */}
        <MapView 
          ref={mapViewRef}
          selectedDestination={searchDestination}
          searchDestination={searchDestination}
          selectedFloor={selectedFloor}
        />
      </div>

      {/* On-Screen Keyboard */}
      {keyboardOpen && createPortal(
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
            padding: '20px'
          }}
          onClick={(e) => {
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
          <div style={{ animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <OnScreenKeyboard
              value={search}
              onChange={(v) => setSearch(v)}
              suggestions={suggestions.slice(0, 8).map(s => s.name)}
              onClose={() => setKeyboardOpen(false)}
              onEnter={() => {
                if (search.trim()) {
                  setSearchDestination(search.trim());
                  setSuggestions([]);
                }
                setKeyboardOpen(false);
              }}
              style={{ maxWidth: '900px', width: '95vw' }}
              placeholder="Search rooms, buildings, services..."
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Map;
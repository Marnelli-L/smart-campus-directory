import React, { useState, useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { MdLayers } from "react-icons/md";
import { createPortal } from "react-dom";
import MapView from "../components/MapView";
import OnScreenKeyboard from "../components/OnScreenKeyboard";
import { campusSearchEngine, SearchUtils } from "../utils/advancedSearch";
import { getSearchSuggestions } from "../utils/smartSearch";

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

function Map() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedFloor, setSelectedFloor] = useState(FLOORS[0].value);
  const [searchDestination, setSearchDestination] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const searchInputRef = useRef(null);
  const mapViewRef = useRef(null);

  // Check for destination parameter in URL and set it
  useEffect(() => {
    const destinationParam = searchParams.get('destination');
    if (destinationParam) {
      setSearch(destinationParam);
      setSearchDestination(destinationParam);
      // Don't auto-focus to avoid opening keyboard automatically
      // User can tap the search field if they want to modify the search
    }
  }, [searchParams]);

  // Load GeoJSON data and initialize search engine with all floors
  useEffect(() => {
    const loadGeoJSONData = async () => {
      try {
        // Load all floor data for comprehensive search
        const floorFiles = [
          { path: '/images/smart-campus-map.geojson', floor: 'ground' },
          { path: '/images/2nd-floor-map.geojson', floor: '2' },
          { path: '/images/3rd-floor-map.geojson', floor: '3' },
          { path: '/images/4th-floor-map.geojson', floor: '4' }
        ];
        
        const allBuildings = [];
        const allRooms = [];
        const allServices = [];
        let allFeatures = [];
        
        // Load all floors in parallel
        const floorDataPromises = floorFiles.map(async ({ path, floor }) => {
          try {
            const response = await fetch(path);
            if (response.ok) {
              const data = await response.json();
              return { data, floor };
            }
          } catch (err) {
            console.warn(`Could not load ${path}:`, err);
          }
          return null;
        });
        
        const floorDataResults = await Promise.all(floorDataPromises);
        
        // Process all floor data
        floorDataResults.forEach(result => {
          if (!result) return;
          const { data, floor } = result;
          
          data.features.forEach(feature => {
            const props = feature.properties || {};
            const name = (props.Name || props.name || props.Building || props.building || '').toString().trim();
            const type = (props.Type || props.type || '').toString().toLowerCase();
            
            // Add floor information to feature
            if (!props.floor && !props.Floor) {
              props.floor = floor;
              props.Floor = floor;
            }
            
            allFeatures.push(feature);
            
            if (name) {
              const item = {
                id: feature.id || `${name}-${floor}`,
                name: name,
                type: type,
                building: props.Building || props.building,
                description: props.Description || props.description || '',
                category: props.Category || props.category || '',
                floor: props.Floor || props.floor || floor,
                coordinates: feature.geometry?.coordinates
              };

              if (type.includes('building') || type.includes('hall')) {
                allBuildings.push(item);
              } else if (type.includes('room') || type.includes('office')) {
                allRooms.push(item);
              } else if (name) {
                allServices.push(item);
              }
            }
          });
        });

        // Initialize search engine with all floors
        campusSearchEngine.buildIndex({
          buildings: allBuildings,
          rooms: allRooms,
          services: allServices
        });
        
        console.log(`✅ Search engine initialized with data from ${floorDataResults.filter(r => r).length} floors`);
        console.log(`   Buildings: ${allBuildings.length}, Rooms: ${allRooms.length}, Services: ${allServices.length}`);

        // Update ALL_ROOMS for legacy compatibility
        const roomNames = allFeatures
          .filter(f => f.geometry?.type === 'Point' && (f.properties?.Name || f.properties?.name))
          .map(f => f.properties.Name || f.properties.name)
          .filter(name => name && name.trim())
          .sort();
        
        if (roomNames.length > 0) {
          ALL_ROOMS = [...new Set(roomNames)]; // Remove duplicates
          console.log('📍 Loaded rooms from all floors:', ALL_ROOMS.length);
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
      const newTrackingState = !locationTracking;
      setLocationTracking(newTrackingState);
      
      if (mapViewRef.current) {
        if (newTrackingState) {
          // Start location tracking
          if (mapViewRef.current.startLocationTracking) {
            mapViewRef.current.startLocationTracking();
          }
        } else {
          // Stop location tracking
          if (mapViewRef.current.stopLocationTracking) {
            mapViewRef.current.stopLocationTracking();
          }
        }
      }
    }
  };



  useEffect(() => {
    if (location.state?.from === "admin" && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [location.state]);

  // Smart search suggestions - fetch as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (search.trim().length >= 2) {
        try {
          const suggestions = await getSearchSuggestions(search.trim());
          setSearchSuggestions(suggestions);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSearchSuggestions([]);
        }
      } else {
        setSearchSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [search]);

  // Listen for navigation events from map popup clicks
  useEffect(() => {
    const handleNavigateToLocation = (event) => {
      const { location } = event.detail;
      if (location) {
        console.log('📍 Received navigation request for:', location);
        setSearch(location);
        setSearchDestination(location);
      }
    };

    window.addEventListener('navigateToLocation', handleNavigateToLocation);
    return () => window.removeEventListener('navigateToLocation', handleNavigateToLocation);
  }, []);

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
      {/* Controls Bar - Mobile Responsive */}
      <div className="w-full flex justify-center mt-2 md:mt-4 absolute top-0 left-0 z-50 px-2 md:px-0">
        <div
          className="
            flex flex-col md:flex-row items-stretch md:items-center
            py-2 md:py-4 px-3 md:px-6
            rounded-2xl md:rounded-3xl
            bg-white
            shadow
            border border-[#e0e0e0]
            gap-2 md:gap-4
            transition-all
            relative
            z-30
          "
          style={{
            width: "100%",
            maxWidth: "95vw",
            marginBottom: 14,
            boxShadow: "0 2px 10px 0 rgba(0,105,92,0.08)",
            alignItems: "stretch",
            justifyContent: "center",
            overflow: "visible",
            minWidth: 0,
          }}
        >
          {/* Enhanced Search Bar with category filter */}
          <div
            className="flex flex-col relative"
            style={{
              width: "100%",
              maxWidth: "600px",
              minWidth: 0,
              flex: "1 1 auto",
            }}
          >
            <div className="relative w-full">
              <div
                className="flex items-center bg-white rounded-xl md:rounded-2xl px-3 md:px-6 py-2 border transition-all"
                style={{
                  borderColor: "#00695C",
                  borderWidth: 2,
                  height: 44,
                  boxShadow: "none",
                  fontSize: "clamp(14px, 3vw, 18px)",
                  width: "100%",
                  borderRadius: "clamp(12px, 2vw, 16px)",
                  fontWeight: 600,
                }}
                tabIndex={-1}
              >
              <svg
                className="w-5 h-5 md:w-6 md:h-6 text-[#00695C] mr-2 md:mr-4 flex-shrink-0"
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
                placeholder="Search rooms, buildings..."
                className="flex-1 bg-transparent outline-none text-sm md:text-lg text-[#00695C] placeholder-[#00695C]/60 font-semibold min-w-0"
                aria-label="Search for a room, building, or service"
                autoComplete="off"
                readOnly
                style={{
                  minHeight: 32,
                  fontSize: "clamp(14px, 3vw, 18px)",
                  border: "none",
                  boxShadow: "none",
                  background: "transparent",
                  width: "100%",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              />
              
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
            </div>
          </div>
          {/* Floor Selector as custom dropdown with icon and chevron - Mobile Responsive */}
          <div
            className="relative flex items-center"
            style={{
              minWidth: 0,
              width: "100%",
              maxWidth: "200px",
              height: 44,
              flex: "0 1 auto",
            }}
            ref={floorDropdownRef}
          >
            <button
              type="button"
              className="flex items-center justify-between gap-2 pl-3 pr-3 py-2 bg-white rounded-xl md:rounded-2xl border border-[#00695C] text-[#00695C] font-bold text-sm md:text-base outline-none focus:ring-2 focus:ring-[#00695C] transition-all duration-200 cursor-pointer hover:bg-[#E0F2EF] focus:bg-[#E0F2EF] relative w-full"
              style={{
                height: 44,
                borderRadius: "clamp(12px, 2vw, 16px)",
                fontSize: "clamp(14px, 2.5vw, 16px)",
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
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MdLayers size={20} className="text-[#00695C] flex-shrink-0" />
                <span className="truncate flex-1">
                  {FLOORS.find(f => f.value === selectedFloor)?.label}
                </span>
              </div>
              <span
                className="text-[#00695C] text-sm flex-shrink-0"
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
          
          {/* Reset View Button */}
          <button
            className="flex items-center gap-2 px-4 py-2 border-2 border-[#00695C] bg-white text-[#00695C] font-bold text-sm transition-all duration-200 hover:bg-[#E0F2EF] focus:outline-none focus:ring-2 focus:ring-[#00695C]"
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
            onClick={() => handleEssential("reset")}
            aria-label="Reset View"
            title="Reset map to default view"
          >
            <span style={{ color: "#00695C", display: "flex", alignItems: "center" }}>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </span>
            <span>Reset View</span>
          </button>

          {/* Locate Me Button - Toggle for Location Tracking */}
          <button
            className={`flex items-center gap-2 px-4 py-2 border-2 font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
              locationTracking
                ? 'bg-[#00695C] border-[#00695C] text-white hover:bg-[#004D40] focus:ring-[#004D40]'
                : 'border-[#00695C] bg-white text-[#00695C] hover:bg-[#E0F2EF] focus:ring-[#00695C]'
            }`}
            style={{
              fontSize: 14,
              width: 140,
              minWidth: 110,
              borderRadius: 16,
              boxShadow: locationTracking ? "0 4px 12px rgba(0, 105, 92, 0.3)" : "none",
              height: 48,
              flex: "0 0 auto",
              whiteSpace: "nowrap",
              fontWeight: 600,
            }}
            onClick={() => handleEssential("locate")}
            aria-label={locationTracking ? "Stop Location Tracking" : "Start Location Tracking"}
            title={locationTracking ? "Click to stop tracking your location" : "Track your real-time location on campus"}
          >
            <span style={{ display: "flex", alignItems: "center" }}>
              {locationTracking ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" opacity="0.7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" strokeWidth="2" />
                </svg>
              )}
            </span>
            <span>{locationTracking ? "Stop" : "Locate Me"}</span>
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

      {/* On-Screen Keyboard - Mobile Optimized */}
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
            padding: '10px'
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
          <div style={{ animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)', maxWidth: '100%' }}>
            <OnScreenKeyboard
              value={search}
              onChange={(v) => setSearch(v)}
              suggestions={searchSuggestions}
              onClose={() => setKeyboardOpen(false)}
              onEnter={() => {
                if (search.trim()) {
                  setSearchDestination(search.trim());
                }
                setKeyboardOpen(false);
              }}
              style={{ maxWidth: '900px', width: '100%' }}
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
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as turf from '@turf/turf';
import { findSimpleRoute } from '../utils/simplePathfinding';
import { smartSearch, loadAllFloorData } from '../utils/smartSearch';

// Import your Mapbox sample component here
// import YourMapboxComponent from './YourMapboxComponent';

const MapView = forwardRef(({ 
  selectedDestination = null,
  searchDestination = null,
  selectedFloor = 'F1'
}, ref) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geojsonData, setGeojsonData] = useState(null);
  const [floor, setFloor] = useState('ground'); // 'ground' | '2' | '3'
  const markersRef = useRef([]); // track markers so we can remove them on floor switch
  const addCampusRef = useRef(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const animatedRouteRef = useRef(null); // Ref for animated route function
  const watchIdRef = useRef(null); // For tracking geolocation watch
  const lastLocationLogRef = useRef(0); // Throttle location logging
  const isProcessingRouteRef = useRef(false); // Prevent simultaneous route calculations
  const lastDestinationRef = useRef(null); // Track last processed destination
  const [_isNavigating, setIsNavigating] = useState(false); // Navigation mode state
  const [currentUserLocation, setCurrentUserLocation] = useState(null); // Track user position
  const [_destinationCoords, setDestinationCoords] = useState(null); // Store destination
  const [_remainingDistance, setRemainingDistance] = useState(null); // Distance to destination
  const navigationIntervalRef = useRef(null); // Interval for route updates
  const destination = selectedDestination || searchDestination;

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    resetView: () => {
      if (mapRef.current) {
        mapRef.current.jumpTo({
          center: [120.981350, 14.592400],
          zoom: 17,
          pitch: 30,
          bearing: 253,
          essential: true
        });
        console.log('”„ Map view reset to default');
      }
    },
    startLocationTracking: () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      // Stop any existing tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      // Start continuous location tracking
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const userLocation = [position.coords.longitude, position.coords.latitude];
          const accuracy = position.coords.accuracy;
          
          if (!mapRef.current) return;

          // Add or update user location marker with accuracy circle
          if (mapRef.current.getSource('user-location')) {
            mapRef.current.getSource('user-location').setData({
              type: 'Point',
              coordinates: userLocation
            });
          } else {
            mapRef.current.addSource('user-location', {
              type: 'geojson',
              data: {
                type: 'Point',
                coordinates: userLocation
              }
            });
            
            // Add accuracy circle (smaller and less obtrusive)
            mapRef.current.addLayer({
              id: 'user-location-accuracy',
              type: 'circle',
              source: 'user-location',
              paint: {
                'circle-radius': {
                  stops: [
                    [0, 0],
                    [20, Math.min(accuracy * 0.3, 25)]  // Cap at 25 pixels, reduced from 0.8
                  ],
                  base: 2
                },
                'circle-color': '#007cbf',
                'circle-opacity': 0.05,  // Much more transparent
                'circle-stroke-color': '#007cbf',
                'circle-stroke-width': 1,
                'circle-stroke-opacity': 0.2  // More subtle
              }
            });
            
            // Add pulsing dot
            mapRef.current.addLayer({
              id: 'user-location-dot',
              type: 'circle',
              source: 'user-location',
              paint: {
                'circle-radius': 8,
                'circle-color': '#007cbf',
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 2
              }
            });

            // Add outer pulse ring
            mapRef.current.addLayer({
              id: 'user-location-pulse',
              type: 'circle',
              source: 'user-location',
              paint: {
                'circle-radius': 12,
                'circle-color': '#007cbf',
                'circle-opacity': 0.3,
                'circle-stroke-color': '#007cbf',
                'circle-stroke-width': 1,
                'circle-stroke-opacity': 0.5
              }
            });

            // Fly to user location on first update
            mapRef.current.flyTo({
              center: userLocation,
              zoom: 19,
              pitch: 10,  // Lock pitch
              bearing: 253,  // Lock bearing
              essential: true,
              duration: 1500
            });
          }
          
          // Throttle location logging - only log every 10 seconds
          const now = Date.now();
          if (now - lastLocationLogRef.current > 10000) {
            console.log('“ Location updated:', userLocation, 'Accuracy:', accuracy.toFixed(2), 'm');
            lastLocationLogRef.current = now;
          }
        },
        (error) => {
          console.error('âŒ Error tracking location:', error);
          let errorMessage = 'Unable to track your location. ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
          }
          alert(errorMessage);
          
          // Stop tracking on error
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 30000  // Cache location for 30 seconds to reduce updates
        }
      );
      
      console.log('Ž¯ Started real-time location tracking');
    },
    stopLocationTracking: () => {
      // Stop watching location
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('â¹ï¸ Stopped location tracking');
      }

      // Remove location layers from map
      if (mapRef.current) {
        const layersToRemove = ['user-location-pulse', 'user-location-dot', 'user-location-accuracy'];
        layersToRemove.forEach(layerId => {
          if (mapRef.current.getLayer(layerId)) {
            mapRef.current.removeLayer(layerId);
          }
        });
        
        if (mapRef.current.getSource('user-location')) {
          mapRef.current.removeSource('user-location');
        }
      }
    },
    locateUser: () => {
      console.log('” Locate Me button clicked');
      
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      
      if (!mapRef.current) {
        console.error('âŒ Map not initialized');
        return;
      }
      
      // University entrance coordinates from GeoJSON (Ground Floor)
      const UNIVERSITY_ENTRANCE = [120.981546, 14.591557];
      
      // Function to check if location is inside university
      const isInsideUniversity = (coords) => {
        const [lng, lat] = coords;
        const bounds = {
          minLng: 120.9810,
          maxLng: 120.9825,
          minLat: 14.5910,
          maxLat: 14.5925
        };
        return (
          lng >= bounds.minLng &&
          lng <= bounds.maxLng &&
          lat >= bounds.minLat &&
          lat <= bounds.maxLat
        );
      };
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          let userLocation = [position.coords.longitude, position.coords.latitude];
          let isOutside = false;
          
          console.log('“ Raw GPS location:', userLocation);
          
          // Check if user is outside the university
          if (!isInsideUniversity(userLocation)) {
            console.log('âš ï¸ User detected OUTSIDE campus - using entrance as location');
            userLocation = UNIVERSITY_ENTRANCE;
            isOutside = true;
            
            alert('“ You are currently outside the university.\nShowing Ground Floor entrance as your location.');
          } else {
            console.log('âœ… User is INSIDE campus');
          }
          
          // Remove existing "You Are Here" marker if it exists
          const existingMarker = document.getElementById('you-are-here-marker');
          if (existingMarker) {
            existingMarker.remove();
          }
          
          // Create "You Are Here" marker
          const youAreHereEl = document.createElement('div');
          youAreHereEl.id = 'you-are-here-marker';
          youAreHereEl.style.cssText = `
            position: relative;
            cursor: pointer;
            z-index: 150;
          `;
          
          // Create pin container
          const pinContainer = document.createElement('div');
          pinContainer.style.cssText = `
            position: relative;
            width: 40px;
            height: 40px;
            z-index: 151;
          `;
          
          // Create the marker pin (pulsing dark green dot)
          const markerPin = document.createElement('div');
          markerPin.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            background: radial-gradient(circle, #00695C 0%, #004D40 100%);
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 
              0 6px 20px rgba(0, 105, 92, 0.6),
              0 2px 8px rgba(0, 0, 0, 0.3);
            animation: pulse-you-are-here 2s ease-in-out infinite;
          `;
          
          // Add pulse animation
          const style = document.createElement('style');
          style.textContent = `
            @keyframes pulse-you-are-here {
              0%, 100% {
                transform: scale(1);
                opacity: 1;
              }
              50% {
                transform: scale(1.15);
                opacity: 0.85;
              }
            }
          `;
          if (!document.getElementById('you-are-here-pulse-style')) {
            style.id = 'you-are-here-pulse-style';
            document.head.appendChild(style);
          }
          
          pinContainer.appendChild(markerPin);
          
          // Create the "You Are Here" label
          const labelContainer = document.createElement('div');
          labelContainer.style.cssText = `
            position: absolute;
            bottom: 52px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            pointer-events: none;
          `;
          
          const label = document.createElement('div');
          label.style.cssText = `
            background: linear-gradient(135deg, #00695C 0%, #004D40 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 16px;
            font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
            font-size: 11px;
            font-weight: 600;
            box-shadow: 
              0 4px 12px rgba(0, 105, 92, 0.4),
              0 2px 6px rgba(0, 0, 0, 0.2);
            border: 2px solid white;
          `;
          label.textContent = isOutside ? 'You Are Here (Entrance)' : 'You Are Here';
          
          labelContainer.appendChild(label);
          youAreHereEl.appendChild(pinContainer);
          youAreHereEl.appendChild(labelContainer);
          
          // Add marker to map
          new window.mapboxgl.Marker({ 
            element: youAreHereEl,
            anchor: 'bottom',
            offset: [0, 8]
          })
          .setLngLat(userLocation)
          .addTo(mapRef.current);
          
          // Also add the blue circle layer for better visibility
          if (mapRef.current.getLayer('user-location-dot')) {
            mapRef.current.getSource('user-location').setData({
              type: 'Point',
              coordinates: userLocation
            });
          } else {
            mapRef.current.addSource('user-location', {
              type: 'geojson',
              data: {
                type: 'Point',
                coordinates: userLocation
              }
            });
            
            // Add accuracy circle (smaller and less obtrusive)
            mapRef.current.addLayer({
              id: 'user-location-accuracy',
              type: 'circle',
              source: 'user-location',
              paint: {
                'circle-radius': Math.min(Math.max(position.coords.accuracy / 3, 10), 20),  // Cap between 10-20 pixels
                'circle-color': 'rgba(0, 105, 92, 0.08)',  // More transparent
                'circle-stroke-width': 1,
                'circle-stroke-color': 'rgba(0, 105, 92, 0.3)'  // More subtle
              }
            });
            
            // Add user dot (subtle, marker is main indicator)
            mapRef.current.addLayer({
              id: 'user-location-dot',
              type: 'circle',
              source: 'user-location',
              paint: {
                'circle-radius': 6,
                'circle-color': '#00695C',
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 2
              }
            });
          }
          
          // Fly to user location
          mapRef.current.flyTo({
            center: userLocation,
            zoom: 19,
            pitch: 10,  // Lock pitch
            bearing: 253,  // Lock bearing
            essential: true,
            duration: 1500
          });
          
          console.log('âœ… Showing user location:', userLocation);
        },
        (error) => {
          console.error('âŒ Geolocation error:', error);
          
          // If geolocation fails, default to entrance
          console.log('âš ï¸ Geolocation failed - showing entrance as fallback');
          const fallbackLocation = UNIVERSITY_ENTRANCE;
          
          // Remove existing "You Are Here" marker if it exists
          const existingMarker = document.getElementById('you-are-here-marker');
          if (existingMarker) {
            existingMarker.remove();
          }
          
          // Create "You Are Here" marker at entrance
          const youAreHereEl = document.createElement('div');
          youAreHereEl.id = 'you-are-here-marker';
          youAreHereEl.style.cssText = `
            position: relative;
            cursor: pointer;
            z-index: 150;
          `;
          
          const pinContainer = document.createElement('div');
          pinContainer.style.cssText = `
            position: relative;
            width: 40px;
            height: 40px;
            z-index: 151;
          `;
          
          const markerPin = document.createElement('div');
          markerPin.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            background: radial-gradient(circle, #00695C 0%, #004D40 100%);
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 
              0 6px 20px rgba(0, 105, 92, 0.6),
              0 2px 8px rgba(0, 0, 0, 0.3);
            animation: pulse-you-are-here 2s ease-in-out infinite;
          `;
          
          pinContainer.appendChild(markerPin);
          
          const labelContainer = document.createElement('div');
          labelContainer.style.cssText = `
            position: absolute;
            bottom: 52px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            pointer-events: none;
          `;
          
          const label = document.createElement('div');
          label.style.cssText = `
            background: linear-gradient(135deg, #00695C 0%, #004D40 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 16px;
            font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
            font-size: 11px;
            font-weight: 600;
            box-shadow: 
              0 4px 12px rgba(0, 105, 92, 0.4),
              0 2px 6px rgba(0, 0, 0, 0.2);
            border: 2px solid white;
          `;
          label.textContent = 'You Are Here (Entrance)';
          
          labelContainer.appendChild(label);
          youAreHereEl.appendChild(pinContainer);
          youAreHereEl.appendChild(labelContainer);
          
          // Add marker to map
          new window.mapboxgl.Marker({ 
            element: youAreHereEl,
            anchor: 'bottom',
            offset: [0, 8]
          })
          .setLngLat(fallbackLocation)
          .addTo(mapRef.current);
          
          // Add fallback blue circle layer
          if (mapRef.current.getLayer('user-location-dot')) {
            mapRef.current.getSource('user-location').setData({
              type: 'Point',
              coordinates: fallbackLocation
            });
          } else {
            mapRef.current.addSource('user-location', {
              type: 'geojson',
              data: {
                type: 'Point',
                coordinates: fallbackLocation
              }
            });
            
            mapRef.current.addLayer({
              id: 'user-location-dot',
              type: 'circle',
              source: 'user-location',
              paint: {
                'circle-radius': 6,
                'circle-color': '#00695C',
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 2
              }
            });
          }
          
          mapRef.current.flyTo({
            center: fallbackLocation,
            zoom: 19,
            pitch: 10,  // Lock pitch
            bearing: 253,  // Lock bearing
            essential: true,
            duration: 1500
          });
          
          alert('“ Unable to get your exact location.\nShowing Ground Floor entrance instead.\n\nError: ' + error.message);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000,  // Increased timeout to 10 seconds
          maximumAge: 0 
        }
      );
    }
  }));

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('§¹ Cleaned up location tracking on unmount');
      }
    };
  }, []);

  // When parent header/shell changes selectedFloor, load the corresponding floor GeoJSON
  useEffect(() => {
    if (!selectedFloor) return;
    const floorKey = selectedFloor === 'F2' ? '2' : 
                     selectedFloor === 'F3' ? '3' : 
                     selectedFloor === 'F4' ? '4' : 
                     'ground';
    if (mapRef.current && addCampusRef.current) {
      addCampusRef.current(floorKey);
    }
  }, [selectedFloor]);

  useEffect(() => {
    // Load Mapbox GL JS if not already loaded
    if (!window.mapboxgl) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
      script.onload = initializeMap;
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    } else {
      initializeMap();
    }

  function initializeMap() {
      console.log('—ºï¸ Initializing map...');
      console.log('Container ref:', mapContainerRef.current);
      console.log('Existing map:', mapRef.current);
      
      if (mapContainerRef.current && !mapRef.current) {
        try {
          // Your Mapbox access token
          window.mapboxgl.accessToken = 'pk.eyJ1IjoibmVsbGlpaS0wMjYiLCJhIjoiY21naXVsZzRoMGRubDJsb3Y0b2E0M2R6aSJ9.eH1rbt1exyBhvY2ccAWK9w';
          
          console.log('”‘ Mapbox token set');
          
          // Define reasonable bounds for your campus area
          // Widened bounds to give more panning room around the campus
          // Expanded by ~0.0025 degrees (~250m) each direction to show adjacent blocks
          const campusBounds = [
            [120.979000, 14.589500], // Southwest corner - expanded
            [120.984500, 14.594500]  // Northeast corner - expanded
          ];

          mapRef.current = new window.mapboxgl.Map({
            container: mapContainerRef.current,
            style: {
              version: 8,
              sources: {},
              glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf', // Add font glyphs support
              layers: [{
                id: 'background',
                type: 'background',
                paint: {
                  'background-color': '#f0f2f5' // More grayish background for better balance
                }
              }]
            },
            center: [120.969500, 14.591800], // Center based on your GeoJSON data
            zoom: 5, // Lower initial zoom to see full campus
            minZoom: 19, // Allow more zoom out to see full campus
            maxZoom: 20, // Allow closer zoom for details
            maxBounds: campusBounds, // Restrict to campus area only
            pitch: 20, // Nice 3D perspective like your reference
            bearing: 260, // No rotation - straight view
            // Smooth navigation with more freedom
            interactive: true,
            dragPan: {
              linearity: 0.3, // Natural panning feel
              easing: t => t, // Linear easing
              maxSpeed: 1000, // Normal speed for good navigation
              deceleration: 2500 // Normal deceleration
            },
            scrollZoom: {
              around: 'center'
            },
            boxZoom: false,
            dragRotate: true,
            keyboard: true,
            doubleClickZoom: true,
            touchZoomRotate: {
              around: 'center'
            },
            touchPitch: true,
            cooperativeGestures: false,
            // Indoor mapping optimizations
            fadeDuration: 300,
            renderWorldCopies: false, // Don't render world copies
            refreshExpiredTiles: false,
            optimizeForTerrain: false,
            antialias: true // Smooth edges for indoor features
          });

        mapRef.current.on('load', () => {
          setMapLoaded(true);
          console.log('—ºï¸ Mapbox loaded successfully!');
          console.log('Ž¯ Map center:', mapRef.current.getCenter());
          console.log('” Map zoom:', mapRef.current.getZoom());
          
          // âœ¨ Initialize CLEAN route source and layers
          mapRef.current.addSource('navigation-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: []
              }
            }
          });
          
          // Add single, bold, highly visible route line
          mapRef.current.addLayer({
            id: 'navigation-route-line',
            type: 'line',
            source: 'navigation-route',
            paint: {
              'line-color': '#1E88E5', // Bright blue like Google Maps
              'line-width': 8,
              'line-opacity': 0.9
            },
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            }
          });
          
          console.log('âœ… Navigation route layer ready');
          
          // Preload all floor data for smart search
          loadAllFloorData().then(() => {
            console.log('âœ… All floor data preloaded for smart search');
          }).catch(err => {
            console.error('âŒ Error preloading floor data:', err);
          });
          
          // Bright ambient lighting for light white buildings
          mapRef.current.setLight({
            color: '#ffffff',
            intensity: 1.2, // Much brighter for light ambiance
            position: [1.0, 90, 80] // More overhead lighting for even illumination
          });
          
          // Performance optimizations for smoother interactions
          mapRef.current.getCanvas().style.cursor = 'grab';
          
          // Optimize rendering for smooth panning
          mapRef.current.on('dragstart', () => {
            mapRef.current.getCanvas().style.cursor = 'grabbing';
          });
          
          mapRef.current.on('dragend', () => {
            mapRef.current.getCanvas().style.cursor = 'grab';
          });
          
          // Add your custom layers, markers, or data here
          addCampusGeoJSON(floor);
        });
        
        } catch (error) {
          console.error('âŒ Error initializing map:', error);
        }
      }
    }

    async function addCampusGeoJSON(floorKey = 'ground') {
      if (!mapRef.current) return;
      try {
        console.log('“Š Loading ALL floor GeoJSON data for multi-floor navigation...');
        
        // Load ALL floor GeoJSON files simultaneously for multi-floor pathfinding
        const floorFiles = [
          { key: 'ground', path: '/images/smart-campus-map.geojson' },
          { key: '2', path: '/images/2nd-floor-map.geojson' },
          { key: '3', path: '/images/3rd-floor-map.geojson' },
          { key: '4', path: '/images/4th-floor-map.geojson' }
        ];
        
        const floorDataPromises = floorFiles.map(async ({ key, path }) => {
          try {
            const response = await fetch(path);
            if (!response.ok) {
              console.warn(`WARNING: Failed to load ${path}: ${response.status}`);
              return null;
            }
            const data = await response.json();
            // Tag each feature with its floor
            data.features.forEach(feature => {
              if (!feature.properties) feature.properties = {};
              feature.properties.floor = key;
              feature.properties.Floor = key;
            });
            console.log(`âœ… Loaded ${path}: ${data.features.length} features`);
            return { key, data };
          } catch (error) {
            console.error(`âŒ Error loading ${path}:`, error);
            return null;
          }
        });
        
        const allFloorData = await Promise.all(floorDataPromises);
        const validFloorData = allFloorData.filter(d => d !== null);
        
        if (validFloorData.length === 0) {
          throw new Error('Failed to load any floor data');
        }
        
        // Combine all floors into one unified GeoJSON dataset
        const combinedData = {
          type: 'FeatureCollection',
          features: []
        };
        
        validFloorData.forEach(({ data }) => {
          combinedData.features.push(...data.features);
        });
        
        console.log(`âœ… Combined ${validFloorData.length} floors: ${combinedData.features.length} total features`);
        
        // Get current floor data for display
        const currentFloorData = validFloorData.find(d => d.key === floorKey)?.data || validFloorData[0].data;
        setGeojsonData(currentFloorData); // Store current floor data for searching
        setFloor(floorKey);
        
        console.log('—ºï¸ Current floor data:', currentFloorData);
        console.log('“ Current floor features:', currentFloorData.features.length);
        console.log('¢ Combined data features:', combinedData.features.length);

        // Initialize corridor-based A* pathfinding with ALL floors
        // Simple routing - no initialization needed

        // Manage building polygons source - show only current floor
        const buildingsData = {
          ...currentFloorData,
          features: currentFloorData.features.filter(f => f.geometry.type === 'Polygon')
        };
        
        console.log('—ï¸ Building polygons (current floor):', buildingsData.features.length);
        console.log('“Š Polygons with names:', buildingsData.features.filter(f => f.properties.Name || f.properties.name).length);
        console.log('“ Sample named polygons:', buildingsData.features
          .filter(f => f.properties.Name || f.properties.name)
          .slice(0, 5)
          .map(f => f.properties.Name || f.properties.name)
        );
        
        if (mapRef.current.getSource('campus-buildings')) {
          mapRef.current.getSource('campus-buildings').setData(buildingsData);
          console.log('âœ… Updated campus-buildings source with new floor data');
        } else {
          mapRef.current.addSource('campus-buildings', { type: 'geojson', data: buildingsData });
          console.log('âœ… Created campus-buildings source');
        }

        // Create label points from polygon centroids for better text rendering
        // Symbol layers work much better with Point geometries than Polygons
        // Also calculate polygon area to determine optimal text size
        const labelPoints = {
          type: 'FeatureCollection',
          features: buildingsData.features
            .filter(f => f.properties.Name || f.properties.name)
            .map(f => {
              // Use Turf.js to calculate accurate polygon centroid
              const centroid = turf.centroid(f);
              const centerLng = centroid.geometry.coordinates[0];
              const centerLat = centroid.geometry.coordinates[1];
              
              // Calculate approximate polygon area (simple bounding box approach)
              const coords = f.geometry.coordinates[0];
              const lngs = coords.map(c => c[0]);
              const lats = coords.map(c => c[1]);
              const width = Math.max(...lngs) - Math.min(...lngs);
              const height = Math.max(...lats) - Math.min(...lats);
              const area = width * height;
              
              // Determine text size based on area with better scaling for readability
              let textSize = 7;
              if (area > 0.0001) textSize = 12; // Very large rooms (libraries, halls)
              else if (area > 0.00006) textSize = 10; // Large rooms
              else if (area > 0.00003) textSize = 9; // Medium rooms
              else if (area > 0.00001) textSize = 8; // Small rooms
              else textSize = 7; // Very small rooms (CRs, closets)
              
              return {
                type: 'Feature',
                properties: {
                  ...f.properties,
                  calculatedTextSize: textSize,
                  polygonArea: area
                },
                geometry: {
                  type: 'Point',
                  coordinates: [centerLng, centerLat]
                }
              };
            })
        };
        
        console.log('“ Created label points:', labelPoints.features.length);
        console.log('” First 3 label points:', labelPoints.features.slice(0, 3).map(f => ({
          name: f.properties.Name,
          coords: f.geometry.coordinates
        })));
        
        if (mapRef.current.getSource('building-label-points')) {
          mapRef.current.getSource('building-label-points').setData(labelPoints);
          console.log('âœ… Updated building-label-points source');
        } else {
          mapRef.current.addSource('building-label-points', { 
            type: 'geojson', 
            data: labelPoints 
          });
          console.log('âœ… Created building-label-points source');
        }

        // Add paths/corridors FIRST (before buildings and labels for proper layering)
        const pathsData = {
          ...currentFloorData,
          features: currentFloorData.features.filter(f => f.geometry.type === 'LineString')
        };
        if (mapRef.current.getSource('campus-paths')) {
          mapRef.current.getSource('campus-paths').setData(pathsData);
        } else {
          mapRef.current.addSource('campus-paths', { type: 'geojson', data: pathsData });
        }

        // Add a secondary outline to make pathways more visible (bottom layer)
        if (!mapRef.current.getLayer('campus-paths-outline')) {
          mapRef.current.addLayer({
            id: 'campus-paths-outline',
            type: 'line',
            source: 'campus-paths',
            paint: {
              'line-color': '#e0e0e0',
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                16, 7, // Slightly wider than main path
                18, 8,
                20, 10
              ],
              'line-opacity': 0.5,
              'line-gap-width': 0
            }
          });
          console.log('âœ… Campus paths outline layer created (bottom layer)');
        }
        
        // Clean white corridors with improved visibility (on top of outline)
        if (!mapRef.current.getLayer('campus-paths')) {
          mapRef.current.addLayer({
            id: 'campus-paths',
            type: 'line',
            source: 'campus-paths',
            paint: {
              'line-color': '#ffffff',
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                16, 5, // Wider at zoom out
                18, 6, // Normal
                20, 8  // Even wider when zoomed in
              ],
              'line-opacity': 1.0
            }
          });
          console.log('âœ… Campus paths/corridors layer created for pathfinding');
        }

        // Light white 3D blocks with bright ambiance (on top of paths)
        if (!mapRef.current.getLayer('campus-buildings-fill')) {
          mapRef.current.addLayer({
            id: 'campus-buildings-fill',
            type: 'fill-extrusion',
            source: 'campus-buildings',
            paint: {
              'fill-extrusion-color': [
                'case',
                ['==', ['get', 'Type'], 'Garden'], '#4CAF50', // Green color for gardens
                '#f5f5f5' // Default light white for other buildings
              ],
              'fill-extrusion-height': [
                'case',
                ['==', ['get', 'type'], 'classroom'], 5,
                ['==', ['get', 'type'], 'office'], 4,
                ['==', ['get', 'type'], 'laboratory'], 6,
                ['==', ['get', 'Type'], 'Garden'], 0.5, // Gardens are flat
                3
              ],
              'fill-extrusion-opacity': 1.0,
              'fill-extrusion-vertical-gradient': true
            }
          });
        }

        // Add very subtle outlines for light white buildings
        if (!mapRef.current.getLayer('campus-buildings-outline')) {
          mapRef.current.addLayer({
            id: 'campus-buildings-outline',
            type: 'line',
            source: 'campus-buildings',
            paint: {
              'line-color': '#e8e8e8',
              'line-width': 0.5,
              'line-opacity': 0.6
            }
          });
        }

        // Add text labels directly on top of 3D building blocks (like mall directory style)
        // Text comes from the "Name" or "name" property in GeoJSON Polygons
        // Large, bold labels that are clearly visible
        if (!mapRef.current.getLayer('campus-buildings-labels')) {
          console.log('·ï¸ Creating building labels layer for the first time...');
          
          mapRef.current.addLayer({
            id: 'campus-buildings-labels',
            type: 'symbol',
            source: 'building-label-points',
            layout: {
              // Use "Name" property from point features
              'text-field': ['get', 'Name'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              // Improved text sizing for better readability
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                16, ['*', ['get', 'calculatedTextSize'], 0.6], // Readable at zoom out
                18, ['*', ['get', 'calculatedTextSize'], 0.85], // Good at normal zoom
                20, ['*', ['get', 'calculatedTextSize'], 1.1] // Larger when zoomed in
              ],
              'text-anchor': 'center',
              'text-transform': 'uppercase', // CAPS LOCK style
              'text-max-width': 4, // Reduced from 8 - forces more line wrapping
              'text-line-height': 1.3,
              'text-letter-spacing': 0.08,
              'text-justify': 'center',
              'text-allow-overlap': true, // Allow overlap to show all labels
              'text-ignore-placement': true, // Ignore collision detection
              'text-optional': false,
              'text-padding': 2,
              'text-pitch-alignment': 'viewport', // Always face camera vertically
              'text-rotation-alignment': 'viewport', // Keep labels upright regardless of map rotation
              'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'], // Try multiple positions
              'text-radial-offset': 0,
              'symbol-sort-key': ['-', 0, ['get', 'polygonArea']], // Larger rooms labeled first
              'symbol-z-order': 'viewport-y', // Labels render based on screen position
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
            },
            paint: {
              // Enhanced contrast for better visibility from all angles
              'text-color': '#000000',
              'text-halo-color': 'rgba(255, 255, 255, 0.95)',
              'text-halo-width': 4, // Even thicker halo for maximum contrast
              'text-halo-blur': 0.5,
              'text-opacity': 1.0
            }
          });
          console.log('âœ… Building labels layer created using POINT geometries!');
          console.log('“ Labels should now be visible on 3rd floor');
          
          // Verify layer was created correctly
          setTimeout(() => {
            const layer = mapRef.current.getLayer('campus-buildings-labels');
            if (layer) {
              console.log('” VERIFICATION - Layer exists:', layer.id);
              console.log('” Layer type:', layer.type);
              console.log('” Layer source:', layer.source);
              console.log('” Layer visibility:', mapRef.current.getLayoutProperty('campus-buildings-labels', 'visibility'));
              
              // Check if source has data
              const source = mapRef.current.getSource('building-label-points');
              if (source && source._data) {
                console.log('” Source has features:', source._data.features ? source._data.features.length : 'NO FEATURES');
                if (source._data.features && source._data.features.length > 0) {
                  console.log('” First feature:', source._data.features[0]);
                }
              }
            } else {
              console.error('âŒ Layer NOT FOUND after creation!');
            }
          }, 1000);
          console.log('ï¿½ Layer will show labels for features with Name/name property');
        } else {
          console.log('ï¿½ Labels layer already exists - it will auto-update with source data');
        }

        // Add room/office markers (labels removed, only clickable points with popups)
        if (markersRef.current && markersRef.current.length) {
          markersRef.current.forEach(m => m.remove());
          markersRef.current = [];
        }

        const pointFeatures = currentFloorData.features.filter(f =>
          f.geometry.type === 'Point' && (f.properties.Name || f.properties.name)
        );

        // Set up the route function for this point feature
        animatedRouteRef.current = (coords, itemName) => {
          setRouteInfo(null); // Clear previous route info
          console.log('§­ Navigating to:', itemName, 'at', coords);
          // Route will be handled by the destination effect
        };

        pointFeatures.forEach(feature => {
          const coords = feature.geometry.coordinates;
          const props = feature.properties;
          const itemName = props.Name || props.name || 'Unknown';
          
          // Create invisible clickable marker (no visible label)
          const el = document.createElement('div');
          el.style.cssText = `
            width: 20px;
            height: 20px;
            cursor: pointer;
            background: transparent;
          `;
          
          const popup = new window.mapboxgl.Popup({
            offset: 20,
            closeButton: false,
            className: 'campus-building-popup',
            maxWidth: '320px',
            anchor: 'bottom'
          }).setHTML(`
            <div style="padding: 0; font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.15); min-width: 220px; max-width: 260px;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #00594A 0%, #00695C 100%); padding: 12px 14px;">
                <h3 style="margin: 0; color: white; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; text-align: center;">
                  ${itemName}
                </h3>
              </div>
              
              <!-- Content section -->
              <div style="padding: 10px 14px; background: #ffffff;">
                <div style="font-size: 12px; color: #374151; line-height: 1.6; display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-weight: 500;">Building</span>
                    <span style="color: #1f2937; font-weight: 600; font-size: 11px;">${props.Building || props.building || 'Main Campus'}</span>
                  </div>
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-weight: 500;">Floor</span>
                    <span style="color: #1f2937; font-weight: 600; font-size: 11px;">${props.Floor || props.floor || 'Ground Floor'}</span>
                  </div>
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0;">
                    <span style="color: #6b7280; font-weight: 500;">Type</span>
                    <span style="color: #1f2937; font-weight: 600; font-size: 11px;">${props.Type || props.type || 'Room'}</span>
                  </div>
                </div>
              </div>
              
              <!-- Navigation button -->
              <button id="navigate-btn-${itemName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')}" 
                style="
                  width: 100%;
                  padding: 10px 14px;
                  background: linear-gradient(135deg, #00594A 0%, #00695C 100%);
                  color: white;
                  border: none;
                  font-size: 13px;
                  font-weight: 700;
                  font-family: 'Open Sans', sans-serif;
                  letter-spacing: 0.3px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                  box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);
                "
                onmouseover="this.style.background='linear-gradient(135deg, #004d3d 0%, #00594A 100%)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='inset 0 -2px 4px rgba(0,0,0,0.15), 0 2px 8px rgba(0,89,74,0.3)';"
                onmouseout="this.style.background='linear-gradient(135deg, #00594A 0%, #00695C 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='inset 0 -2px 4px rgba(0,0,0,0.1)';"
              >
                Navigate Here
              </button>
            </div>
          `).addTo(mapRef.current);
          
          // Add click handler for Navigate button
          setTimeout(() => {
            const navBtn = document.getElementById(`navigate-btn-${itemName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')}`);
            if (navBtn) {
              navBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Trigger navigation by dispatching a custom event to the parent
                console.log('§­ Navigating to:', itemName);
                
                // Dispatch custom event that Map.jsx can listen to
                window.dispatchEvent(new CustomEvent('navigateToLocation', { 
                  detail: { location: itemName } 
                }));
                
                // Close popup
                popup.remove();
              });
            }
          }, 0);

          const marker = new window.mapboxgl.Marker({
            element: el,
            anchor: 'center',
            rotation: 0,
            rotationAlignment: 'viewport',
            pitchAlignment: 'viewport'
          })
          .setLngLat(coords)
          .setRotation(0)
          .setPopup(popup)
          .addTo(mapRef.current);
          
          // Force marker to stay at 0 rotation
          marker.setRotation(0);
          
          markersRef.current.push(marker);
        });

        // Always reset to fixed view after loading data or switching floors
        mapRef.current.jumpTo({
          center: [120.981350, 14.592400],
          zoom: 17,
          pitch: 10,
          bearing: 253
        });

        addLegendAndControls();
      } catch (error) {
        console.error('âŒ Error loading GeoJSON:', error);
      }
    }
    
    // Expose the loader via ref so top-level hooks can call it safely
    addCampusRef.current = addCampusGeoJSON;

    function addLegendAndControls() {
      if (!mapRef.current) return;

      // Add level indicator (top right)
      // Floor selector is provided in the top controls; do not create a duplicate here

    // Add legend (bottom left)
    // avoid adding multiple legends
    if (document.getElementById('legend-box')) return;

  const legend = document.createElement('div');
  legend.id = 'legend-box';

      legend.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 30px;
        background: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 12px;
        z-index: 9999;
        min-width: 150px;
        pointer-events: auto;
      `;
      
      legend.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 12px; color: #333; font-size: 14px;">LEGEND</div>
        <div style="display: flex; align-items: center; margin: 6px 0;">
          <div style="width: 16px; height: 16px; background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 3px; margin-right: 8px;"></div>
          <span style="color: #555;">Buildings</span>
        </div>
        <div style="display: flex; align-items: center; margin: 6px 0;">
          <div style="width: 16px; height: 16px; background: #4CAF50; border: 1px solid #388E3C; border-radius: 3px; margin-right: 8px;"></div>
          <span style="color: #555;">Gardens</span>
        </div>
        <div style="display: flex; align-items: center; margin: 8px 0 4px 0;">
          <div style="width: 16px; height: 3px; background: #ffffff; border: 1px solid #757575; margin-right: 8px;"></div>
          <span style="color: #555; font-size: 11px;">Pathways</span>
        </div>
      `;
      
  document.body.appendChild(legend);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      
      // Clean up legend and level indicator
      const legendEl = document.getElementById('legend-box');
      if (legendEl) legendEl.remove();
      const levelEl = document.getElementById('level-indicator');
      if (levelEl) levelEl.remove();
    };
  }, [floor]); // Re-run initialization when floor changes so we can load appropriate GeoJSON

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // š€ LIVE NAVIGATION SYSTEM - Real-time route updates as user moves
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  
  /**
   * Stop live navigation mode
   */
  const stopLiveNavigation = useCallback(() => {
    console.log('›‘ Stopping live navigation');
    
    setIsNavigating(false);
    setCurrentUserLocation(null);
    setDestinationCoords(null);
    setRemainingDistance(null);
    
    // Stop geolocation tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Stop navigation interval
    if (navigationIntervalRef.current !== null) {
      clearInterval(navigationIntervalRef.current);
      navigationIntervalRef.current = null;
    }
    
    // Remove user location marker
    if (mapRef.current) {
      if (mapRef.current.getLayer('user-location-dot')) {
        mapRef.current.removeLayer('user-location-dot');
      }
      if (mapRef.current.getLayer('user-location-accuracy')) {
        mapRef.current.removeLayer('user-location-accuracy');
      }
      if (mapRef.current.getSource('user-location')) {
        mapRef.current.removeSource('user-location');
      }
    }
  }, []);
  
  /**
   * Update user location marker on map
   */
  const updateUserLocationMarker = useCallback((userLocation, accuracy) => {
    if (!mapRef.current) return;
    
    // Update or create user location marker
    if (mapRef.current.getSource('user-location')) {
      mapRef.current.getSource('user-location').setData({
        type: 'Point',
        coordinates: userLocation
      });
    } else {
      // Create user location source and layer
      mapRef.current.addSource('user-location', {
        type: 'geojson',
        data: {
          type: 'Point',
          coordinates: userLocation
        }
      });
      
      // Add accuracy circle (smaller and less obtrusive)
      mapRef.current.addLayer({
        id: 'user-location-accuracy',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': Math.min(Math.max(accuracy / 4, 8), 18),  // Cap between 8-18 pixels
          'circle-color': 'rgba(66, 133, 244, 0.08)',  // Much more transparent
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(66, 133, 244, 0.3)'  // More subtle
        }
      });
      
      // Add user dot
      mapRef.current.addLayer({
        id: 'user-location-dot',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 8,
          'circle-color': '#4285F4',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }
    
    // Center map on user location
    mapRef.current.easeTo({
      center: userLocation,
      zoom: 19,
      pitch: 10,  // Lock pitch
      bearing: 253,  // Lock bearing
      duration: 1000
    });
  }, []);
  
  /**
   * Recalculate and update route from current user position to destination
   */
  const updateNavigationRoute = useCallback(async (userLocation, destinationCoords, destinationInfo) => {
    if (!mapRef.current || !geojsonData) return;
    
    console.log('”„ Updating navigation route...');
    
    // Calculate distance to destination
    const distanceToDestination = turf.distance(
      turf.point(userLocation),
      turf.point(destinationCoords),
      { units: 'meters' }
    );
    
    setRemainingDistance(distanceToDestination);
    
    console.log(`“ Distance remaining: ${distanceToDestination.toFixed(1)}m`);
    
    // Check if user reached destination (within 5 meters)
    if (distanceToDestination < 5) {
      console.log('Ž‰ DESTINATION REACHED!');
      stopLiveNavigation();
      alert(`Ž‰ You have arrived at ${destinationInfo.name}!`);
      return;
    }
    
    // Recalculate path from current location to destination
    const pathfindingResult = findSimpleRoute(userLocation, destinationCoords);
    
    if (!pathfindingResult || !pathfindingResult.valid) {
      console.warn('âš ï¸ Could not find path from current location');
      return;
    }
    
    const routePath = pathfindingResult.path;
    
    // âœ¨ UPDATE ROUTE LINE - Simple and clean
    if (mapRef.current.getSource('navigation-route')) {
      mapRef.current.getSource('navigation-route').setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routePath
        }
      });
      
      console.log('âœ… Route line updated with', routePath.length, 'points');
    }
    
    // Update route info panel
    const estimatedTimeSeconds = pathfindingResult.distance / 1.4;
    const estimatedMinutes = Math.ceil(estimatedTimeSeconds / 60);
    
    setRouteInfo({
      distance: pathfindingResult.distance,
      waypoints: pathfindingResult.waypoints,
      isValid: true,
      estimatedTime: estimatedMinutes,
      destination: destinationInfo.name,
      building: destinationInfo.building,
      floor: destinationInfo.floor,
      floors: pathfindingResult.floors || [destinationInfo.floor],
      isMultiFloor: pathfindingResult.isMultiFloor || false,
      floorTransitions: pathfindingResult.floorTransitions || []
    });
  }, [geojsonData, stopLiveNavigation]);
  
  /**
   * Check if a location is inside the university campus bounds
   * University bounds based on the GeoJSON map data
   */
  const isInsideUniversity = useCallback((coords) => {
    const [lng, lat] = coords;
    
    // University campus bounds (approximate rectangle around New Era University)
    // Based on the GeoJSON data coordinates
    const bounds = {
      minLng: 120.9810,  // Western boundary
      maxLng: 120.9825,  // Eastern boundary
      minLat: 14.5910,   // Southern boundary
      maxLat: 14.5925    // Northern boundary
    };
    
    const isInside = (
      lng >= bounds.minLng &&
      lng <= bounds.maxLng &&
      lat >= bounds.minLat &&
      lat <= bounds.maxLat
    );
    
    console.log(`“ Location check: [${lng.toFixed(6)}, ${lat.toFixed(6)}] - ${isInside ? 'INSIDE' : 'OUTSIDE'} campus`);
    
    return isInside;
  }, []);
  
  /**
   * Start live navigation mode - continuously updates route as user moves
   * Like Google Maps turn-by-turn navigation
   */
  const startLiveNavigation = useCallback((destinationCoords, destinationInfo) => {
    console.log('Ž¯ Starting LIVE NAVIGATION MODE');
    console.log('“ Destination:', destinationInfo.name);
    
    // University entrance coordinates from GeoJSON (Ground Floor)
    const UNIVERSITY_ENTRANCE = [120.981546, 14.591557];
    const YOU_ARE_HERE_KIOSK = [120.981616, 14.591631];
    
    // Enable navigation mode
    setIsNavigating(true);
    setDestinationCoords(destinationCoords);
    
    // Start continuous location tracking
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    
    // Stop any existing tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (navigationIntervalRef.current !== null) {
      clearInterval(navigationIntervalRef.current);
    }
    
    // Start watching user position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        let userLocation = [position.coords.longitude, position.coords.latitude];
        
        // Check if user is outside the university
        if (!isInsideUniversity(userLocation)) {
          // Throttle warning logs
          const now = Date.now();
          if (now - lastLocationLogRef.current > 10000) {
            console.log('âš ï¸ User detected OUTSIDE campus - using entrance as starting point');
            lastLocationLogRef.current = now;
          }
          userLocation = UNIVERSITY_ENTRANCE;
          
          // Show notification to user
          if (!sessionStorage.getItem('outdoor-warning-shown')) {
            alert('“ You are currently outside the university. Navigation will start from the Ground Floor entrance.');
            sessionStorage.setItem('outdoor-warning-shown', 'true');
          }
        }
        
        setCurrentUserLocation(userLocation);
        
        // Throttle navigation logs - only every 10 seconds
        const now = Date.now();
        if (now - lastLocationLogRef.current > 10000) {
          console.log('“ Navigation position update:', userLocation);
          lastLocationLogRef.current = now;
        }
        
        // Update user marker on map
        updateUserLocationMarker(userLocation, position.coords.accuracy);
        
        // Recalculate route from current position to destination
        updateNavigationRoute(userLocation, destinationCoords, destinationInfo);
      },
      (error) => {
        console.error('âŒ Geolocation error:', error);
        
        // If geolocation fails, default to entrance
        console.log('âš ï¸ Geolocation failed - defaulting to entrance');
        const fallbackLocation = UNIVERSITY_ENTRANCE;
        setCurrentUserLocation(fallbackLocation);
        updateUserLocationMarker(fallbackLocation, 50);
        updateNavigationRoute(fallbackLocation, destinationCoords, destinationInfo);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000  // Cache location for 30 seconds to reduce excessive updates
      }
    );
    
    // Reduced interval to every 10 seconds to prevent excessive updates
    navigationIntervalRef.current = setInterval(() => {
      if (currentUserLocation && destinationCoords) {
        updateNavigationRoute(currentUserLocation, destinationCoords, destinationInfo);
      }
    }, 10000);  // Changed from 2s to 10s
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (navigationIntervalRef.current) {
        clearInterval(navigationIntervalRef.current);
        navigationIntervalRef.current = null;
      }
    };
  }, [currentUserLocation, updateUserLocationMarker, updateNavigationRoute, isInsideUniversity]);
  
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•


  // Handle destination changes with animated pathfinding
  useEffect(() => {
    // Enhanced destination search using smart multi-floor search
    const findDestination = async (searchTerm) => {
      if (!searchTerm) return null;
      
      console.log(`” Smart searching for: "${searchTerm}"`);
      
      // Use smart search to find across all floors
      const searchResult = await smartSearch(searchTerm);
      
      if (searchResult.bestMatch) {
        const match = searchResult.bestMatch;
        console.log(`âœ… Found: "${match.name}" on ${match.floor} (${match.floorKey})`);
        
        // Check if we need to switch floors (only switch once, don't trigger repeatedly)
        if (match.floorKey !== floor) {
          console.log(`”„ Switching from floor "${floor}" to floor "${match.floorKey}"`);
          
          // Prevent infinite loop by checking if we're already processing
          if (!isProcessingRouteRef.current) {
            // Actually reload the map with the new floor data
            if (addCampusRef.current) {
              console.log(`“‚ Loading ${match.floorKey} floor GeoJSON...`);
              addCampusRef.current(match.floorKey);
            }
          }
        }
        
        return {
          coordinates: match.coordinates,
          name: match.name,
          building: match.building,
          floor: match.floor,
          type: match.type,
          floorKey: match.floorKey
        };
      }
      
      console.warn(`WARNING: No match found for: "${searchTerm}"`);
      return null;
    };

    // SM Kiosk-style animated pathfinding
    async function addAnimatedRoute(destinationName) {
      console.log('Ž¯ addAnimatedRoute called with:', destinationName);
      
      if (!mapRef.current) {
        console.error('âŒ No map reference');
        return;
      }

      // Find "You Are Here" starting point from GeoJSON data
      let entrancePoint = [120.981635, 14.591638]; // Exact "You are here" from GeoJSON
      
      if (geojsonData) {
        const youAreHereLocation = geojsonData.features.find(f => {
          const itemName = f.properties.Name || f.properties.name || '';
          return itemName.toLowerCase().includes('you are here') || 
                 itemName.toLowerCase() === 'entrance' ||
                 itemName.toLowerCase().includes('start');
        });
        
        if (youAreHereLocation) {
          entrancePoint = youAreHereLocation.geometry.coordinates;
          console.log('âœ… Found "You Are Here" in GeoJSON:', entrancePoint);
        } else {
          console.log('âœ… Using exact "You Are Here" coordinates from GeoJSON:', entrancePoint);
        }
      }
      
      // Find destination using smart search (searches all floors)
      const foundDestination = await findDestination(destinationName);
      let destinationCoords;
      let destinationInfo = {};
      
      if (foundDestination) {
        destinationCoords = foundDestination.coordinates;
        destinationInfo = {
          name: foundDestination.name,
          building: foundDestination.building,
          floor: foundDestination.floor,
          type: foundDestination.type,
          floorKey: foundDestination.floorKey
        };
        console.log('âœ… Found destination via smart search:', destinationInfo.name);
        console.log('“ Location:', destinationCoords);
        console.log('¢ Building:', destinationInfo.building);
        console.log('—ï¸ Floor:', destinationInfo.floor);
        console.log('“Œ Type:', destinationInfo.type);
      } else {
        console.warn(`WARNING: not found - using fallback`);
        // Fallback to hardcoded destinations if not found
        const fallbackDestinations = {
          'Registrar': [120.981578, 14.591934],
          'NB101': [120.981299, 14.591841], 
          'Room 101': [120.981508, 14.591648],
          'Registrar Office': [120.981578, 14.591934],
          'Classroom 101': [120.981508, 14.591648],
          'Library': [120.981450, 14.591800]
        };
        destinationCoords = fallbackDestinations[destinationName] || fallbackDestinations['Registrar'];
        destinationInfo = {
          name: destinationName,
          building: 'Main Building',
          floor: 'Ground Floor',
          type: 'Location'
        };
        console.log('“ Using fallback coordinates:', destinationCoords);
      }
      console.log('Ž¯ === CREATING ROUTE ===');
      console.log('“ Start point (entrance):', entrancePoint);
      console.log('“ End point (destination):', destinationCoords);
      console.log('Ž¯ Destination:', destinationInfo.name);
      
      // STRICT MODE: Only use corridor pathfinding - no direct line fallbacks
      console.log('”„ Running corridor-based pathfinding (strict mode)...');
      let pathfindingResult = findSimpleRoute(entrancePoint, destinationCoords, geojsonData?.features || []);
      
      if (!pathfindingResult || !pathfindingResult.valid) {
        console.warn('âš ï¸ No valid corridor path found');
        console.log('ï¿½ Route will NOT be drawn - strict corridor-only mode');
        
        // Create result with valid: false - route will not be drawn
        const dx = destinationCoords[0] - entrancePoint[0];
        const dy = destinationCoords[1] - entrancePoint[1];
        const directDistance = Math.sqrt(dx*dx + dy*dy) * 111320;
        
        pathfindingResult = {
          path: [],
          distance: directDistance,
          waypoints: 0,
          valid: false, // Route will NOT be drawn
          floors: [destinationInfo.floor],
          error: 'No corridor connection available - corridors must connect start and destination'
        };
        
        console.log('%câš ï¸ No corridor route available:', 'background: #FF9800; color: white; font-size: 12px; padding: 4px;', 
          'Destination cannot be reached via corridors');
      } else {
        console.log('%câœ… Corridor route found:', 'background: #4CAF50; color: white; font-size: 12px; padding: 4px;', 
          `${pathfindingResult.distance.toFixed(1)}m, ${pathfindingResult.waypoints} waypoints - follows corridors only`);
      }
      
      const routePath = pathfindingResult.path;
      
      // Calculate estimated walking time (average walking speed: 1.4 m/s)
      const estimatedTimeSeconds = pathfindingResult.distance / 1.4;
      const estimatedMinutes = Math.ceil(estimatedTimeSeconds / 60);
      
      setRouteInfo({
        distance: pathfindingResult.distance,
        waypoints: pathfindingResult.waypoints,
        isValid: pathfindingResult.valid,
        estimatedTime: estimatedMinutes,
        destination: destinationInfo.name,
        building: destinationInfo.building,
        floor: destinationInfo.floor,
        floors: pathfindingResult.floors || [destinationInfo.floor],
        isMultiFloor: pathfindingResult.isMultiFloor || false,
        floorTransitions: pathfindingResult.floorTransitions || []
      });
      
      if (pathfindingResult.valid) {
        console.log('âœ… A* CORRIDOR PATH FOUND!');
        console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
        console.log(`Ž¯ Destination: ${destinationInfo.name}`);
        console.log(`¢ Building: ${destinationInfo.building}`);
        console.log(`—ï¸ Floor: ${destinationInfo.floor}`);
        console.log(`“ Distance: ${pathfindingResult.distance.toFixed(1)} meters`);
        console.log(`â±ï¸ Est. Time: ${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''}`);
        console.log(`›¤ï¸ Waypoints: ${routePath.length} points`);
        console.log(`”— Nodes: ${pathfindingResult.nodeCount} corridor segments`);
        console.log('âœ… Route follows corridors only - NO building overlap');
        console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
        
        // Switch to destination floor if multi-floor route
        if (pathfindingResult.isMultiFloor && pathfindingResult.floors && pathfindingResult.floors.length > 0) {
          const destinationFloor = pathfindingResult.floors[pathfindingResult.floors.length - 1];
          console.log(`”„ Multi-floor route detected. Switching to destination floor: ${destinationFloor}`);
          
          // Update the floor display
          if (addCampusRef.current && destinationFloor !== floor) {
            // Reload map with destination floor
            setTimeout(() => {
              addCampusRef.current(destinationFloor);
            }, 500); // Small delay to let user see the route info first
          }
        }
        
        // âœ¨ DRAW ROUTE LINE - CLEAN & SIMPLE
        if (mapRef.current && mapRef.current.getSource('navigation-route')) {
          mapRef.current.getSource('navigation-route').setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routePath
            }
          });
          
          console.log('âœ… Route line drawn with', routePath.length, 'points');
          
          // Move navigation route to top layer so it appears above everything
          if (mapRef.current.getLayer('navigation-route-line')) {
            mapRef.current.moveLayer('navigation-route-line');
            console.log('âœ… Navigation route moved to top layer');
          }
          
          // Fit map to show the entire route
          const bounds = routePath.reduce((bounds, coord) => {
            return bounds.extend(coord);
          }, new window.mapboxgl.LngLatBounds(routePath[0], routePath[0]));
          
          mapRef.current.fitBounds(bounds, {
            padding: 100,
            duration: 1000,
            pitch: 10,  // Lock pitch - no perspective change
            bearing: 253  // Lock bearing - no rotation
          });
        }
        
        // š€ START LIVE NAVIGATION MODE
        console.log('Ž¯ Activating LIVE NAVIGATION SYSTEM...');
        startLiveNavigation(destinationCoords, destinationInfo);
      } else {
        // Enforce corridor-only routing: do NOT draw straight fallback lines
        console.warn('âš ï¸ No corridor path found. Route will not be drawn because we only allow paths along LineStrings.');
        console.log(`“ Direct distance (not used): ${pathfindingResult.distance.toFixed(1)} meters`);
      }
      
      console.log('Ž¯ === END ROUTE CREATION ===');
      
      // Clear old markers
      const existingEntranceMarkers = document.querySelectorAll('#entrance-marker');
      existingEntranceMarkers.forEach(marker => marker.remove());
      const existingDestMarkers = document.querySelectorAll('#destination-marker');
      existingDestMarkers.forEach(marker => marker.remove());
      
      // Markers removed per user request - no pinpoint icons
      // _addEntranceMarker(entrancePoint);
      // _addDestinationMarker(destinationCoords, destinationInfo);
    }
    function _addEntranceMarker(coords) {
      console.log('“ Adding entrance marker at:', coords);
      
      try {
        // Add modern "You Are Here" starting point marker matching system theme
        const entranceEl = document.createElement('div');
        entranceEl.id = 'entrance-marker';
        entranceEl.style.cssText = `
          position: relative;
          cursor: pointer;
        `;
        
        // Create pin-style marker pointing downward
        const pinContainer = document.createElement('div');
        pinContainer.style.cssText = `
          position: relative;
          width: 44px;
          height: 44px;
        `;
        
        // Outer pulsing ring
        const pulsingRing = document.createElement('div');
        pulsingRing.style.cssText = `
          position: absolute;
          width: 44px;
          height: 44px;
          background: rgba(0, 105, 92, 0.2);
          border-radius: 50%;
          animation: pulse-ring 2s ease-out infinite;
          top: 0;
          left: 0;
        `;
        
        // Main marker circle
        const markerCircle = document.createElement('div');
        markerCircle.style.cssText = `
          position: absolute;
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #00695C 0%, #004D40 100%);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 
            0 4px 12px rgba(0, 105, 92, 0.5),
            0 2px 6px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 16px;
          top: 6px;
          left: 6px;
        `;
        markerCircle.innerHTML = 'â—';
        
        // Point indicator (triangle pointing down)
        const pointIndicator = document.createElement('div');
        pointIndicator.style.cssText = `
          position: absolute;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #00695C;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        `;
        
        pinContainer.appendChild(pulsingRing);
        pinContainer.appendChild(markerCircle);
        pinContainer.appendChild(pointIndicator);
        
        // Add pulsing animation keyframes
        const style = document.createElement('style');
        style.textContent = `
          @keyframes pulse-ring {
            0% {
              transform: scale(0.8);
              opacity: 1;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
        `;
        if (!document.getElementById('marker-pulse-style')) {
          style.id = 'marker-pulse-style';
          document.head.appendChild(style);
        }
        
        // Create the "You Are Here" label with system theme (positioned above)
        const labelContainer = document.createElement('div');
        labelContainer.style.cssText = `
          position: absolute;
          bottom: 52px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          pointer-events: none;
        `;
        
        const label = document.createElement('div');
        label.style.cssText = `
          background: linear-gradient(135deg, #00695C 0%, #004D40 100%);
          color: white;
          padding: 8px 14px;
          border-radius: 20px;
          font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 
            0 4px 12px rgba(0, 105, 92, 0.4),
            0 2px 6px rgba(0, 0, 0, 0.2);
          border: 2px solid white;
        `;
        label.textContent = 'You Are Here';
        
        labelContainer.appendChild(label);
        entranceEl.appendChild(pinContainer);
        entranceEl.appendChild(labelContainer);
        
        console.log('“ Creating marker element with precise positioning');
        const marker = new window.mapboxgl.Marker({ 
          element: entranceEl,
          anchor: 'bottom',
          offset: [0, 8]
        })
        .setLngLat(coords)
        .addTo(mapRef.current);
        
        console.log('âœ… Entrance marker added successfully with system theme');
        return marker;
        
      } catch (error) {
        console.error('âŒ Error adding entrance marker:', error);
      }
    }

    function _addDestinationMarker(coords, destinationInfo) {
      console.log('Ž¯ Adding destination marker at:', coords);
      console.log('“ Destination:', destinationInfo);
      
      try {
        // Remove existing destination marker if any
        const existingMarker = document.getElementById('destination-marker');
        if (existingMarker) {
          existingMarker.remove();
        }

        // Create destination marker container
        const destEl = document.createElement('div');
        destEl.id = 'destination-marker';
        destEl.style.cssText = `
          position: relative;
          cursor: pointer;
          z-index: 100;
        `;
        
        // Create pin container
        const pinContainer = document.createElement('div');
        pinContainer.style.cssText = `
          position: relative;
          width: 42px;
          height: 42px;
          z-index: 102;
        `;
        
        // Create the marker pin (professional teardrop style)
        const markerPin = document.createElement('div');
        markerPin.style.cssText = `
          position: absolute;
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, #00695C 0%, #004D40 100%);
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 
            0 6px 20px rgba(0, 105, 92, 0.5),
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 -2px 4px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 102;
        `;
        
        // Inner white circle
        const innerCircle = document.createElement('div');
        innerCircle.style.cssText = `
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        `;
        markerPin.appendChild(innerCircle);
        pinContainer.appendChild(markerPin);
        
        // Create the destination label (above the pin for better visibility)
        const labelContainer = document.createElement('div');
        labelContainer.style.cssText = `
          position: absolute;
          bottom: 50px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          pointer-events: none;
          white-space: nowrap;
          z-index: 101;
        `;
        
        const label = document.createElement('div');
        label.style.cssText = `
          background: linear-gradient(135deg, #00695C 0%, #004D40 100%);
          color: white;
          padding: 8px 14px;
          border-radius: 20px;
          font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 
            0 4px 12px rgba(0, 105, 92, 0.4),
            0 2px 6px rgba(0, 0, 0, 0.2);
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: 0.2px;
          border: 2px solid white;
        `;
        label.textContent = destinationInfo.name || 'Destination';
        
        // Add building info sub-label
        const subLabel = document.createElement('div');
        subLabel.style.cssText = `
          background: white;
          color: #00695C;
          padding: 5px 11px;
          border-radius: 14px;
          font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
          border: 1px solid rgba(0, 105, 92, 0.2);
        `;
        subLabel.textContent = `${destinationInfo.building || 'Building'} â€¢ ${destinationInfo.floor || 'Floor'}`;
        
        labelContainer.appendChild(label);
        labelContainer.appendChild(subLabel);
        
        destEl.appendChild(pinContainer);
        destEl.appendChild(labelContainer);
        
        // Add to map with proper anchor at the bottom point of the pin
        const marker = new window.mapboxgl.Marker({ 
          element: destEl, 
          anchor: 'bottom',
          offset: [0, 0]
        })
          .setLngLat(coords)
          .addTo(mapRef.current);
        
        // Add popup on click with system theme
        const popup = new window.mapboxgl.Popup({ 
          offset: 25,
          closeButton: false,
          closeOnClick: false
        })
          .setHTML(`
            <div style="font-family: 'Segoe UI', 'Roboto', Arial, sans-serif; padding: 12px;">
              <h3 style="margin: 0 0 12px 0; color: #00695C; font-size: 16px; font-weight: 600;">${destinationInfo.name || 'Destination'}</h3>
              <p style="margin: 6px 0; color: #555; font-size: 13px;">
                <strong style="color: #00695C;">Building:</strong> ${destinationInfo.building || 'N/A'}
              </p>
              <p style="margin: 6px 0; color: #555; font-size: 13px;">
                <strong style="color: #00695C;">Floor:</strong> ${destinationInfo.floor || 'N/A'}
              </p>
              <p style="margin: 6px 0; color: #555; font-size: 13px;">
                <strong style="color: #00695C;">Type:</strong> ${destinationInfo.type || 'Location'}
              </p>
            </div>
          `);
        
        destEl.addEventListener('click', () => {
          popup.setLngLat(coords).addTo(mapRef.current);
        });
        
        console.log('âœ… Destination marker added successfully');
        return marker;
        
      } catch (error) {
        console.error('âŒ Error adding destination marker:', error);
      }
    }

    // Execute the routing logic
    if (destination && mapRef.current && mapLoaded) {
      // Prevent running if we're already processing this destination
      if (isProcessingRouteRef.current && lastDestinationRef.current === destination) {
        console.log('â¸ï¸ Already processing route for:', destination);
        return;
      }
      
      console.log('Ž¯ Starting navigation to:', destination);
      lastDestinationRef.current = destination;
      isProcessingRouteRef.current = true;
      
      (async () => {
        try {
          await addAnimatedRoute(destination);
        } catch (error) {
          console.error('Error in routing:', error);
        } finally {
          // Reset after a delay to allow for new searches
          setTimeout(() => {
            isProcessingRouteRef.current = false;
          }, 1000);
        }
      })();
    } else if (mapRef.current && mapLoaded && !destination) {
      // Clear route when destination is removed
      lastDestinationRef.current = null;
      isProcessingRouteRef.current = false;
      
      if (mapRef.current.getSource('navigation-route')) {
        mapRef.current.getSource('navigation-route').setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        });
      }
      setRouteInfo(null);
    }
  // Note: geojsonData intentionally excluded from dependencies to prevent infinite loop
  // when floor switching triggers GeoJSON reload
  // eslint-disable-next-line
  }, [destination, mapLoaded, floor, startLiveNavigation]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      position: 'relative'
    }}>
      {/* Your Mapbox Container */}
      <div 
        ref={mapContainerRef}
        style={{ 
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
        id="mapbox-container"
      />

      {/* Search Result Overlay */}
      {destination && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #00695c, #4db6ac)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '25px',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          Ž¯ Showing: <strong>{destination}</strong>
        </div>
      )}

      {/* Modern Route Information Panel - Fixed Position */}
      {destination && routeInfo && (
        <>
          <style>
            {`
              @media (max-width: 768px) {
                #route-info-panel {
                  left: 20px !important;
                  right: 20px !important;
                  bottom: 20px !important;
                  min-width: auto !important;
                  max-width: calc(100vw - 40px) !important;
                }
                #route-info-content {
                  flex-direction: row !important;
                  flex-wrap: wrap !important;
                  gap: 4px !important;
                }
                .route-info-item {
                  flex: 1 1 calc(50% - 2px) !important;
                  min-width: 100px !important;
                }
              }
            `}
          </style>
          <div 
            id="route-info-panel"
            style={{
              position: 'fixed',
              bottom: '30px',
              left: '210px',
              background: 'rgba(255, 255, 255, 0.98)',
              padding: '0',
              borderRadius: '12px',
              fontSize: '11px',
              zIndex: 9999,
              boxShadow: '0 4px 16px rgba(0, 105, 92, 0.1), 0 1px 4px rgba(0, 0, 0, 0.06)',
              minWidth: '160px',
              maxWidth: '200px',
              fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 105, 92, 0.12)',
              transition: 'all 0.3s ease',
              pointerEvents: 'auto',
              overflow: 'hidden'
            }}>

            {/* Content Grid */}
            <div id="route-info-content" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* Distance */}
              {routeInfo.distance && (
                <div className="route-info-item" style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 1)',
                  borderBottom: '1px solid rgba(0, 105, 92, 0.08)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    color: '#666',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    <span>Distance</span>
                  </div>
                  <span style={{ 
                    color: '#00695C', 
                    fontWeight: '700',
                    fontSize: '13px'
                  }}>{routeInfo.distance.toFixed(0)}m</span>
                </div>
              )}

              {/* Walk Time */}
              {routeInfo.estimatedTime && (
                <div className="route-info-item" style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 1)',
                  borderBottom: routeInfo.isMultiFloor ? '1px solid rgba(0, 105, 92, 0.08)' : 'none'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    color: '#666',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    <span>Walk Time</span>
                  </div>
                  <span style={{ 
                    color: '#00695C', 
                    fontWeight: '700',
                    fontSize: '13px'
                  }}>~{Math.ceil(routeInfo.distance / 20)}s</span>
                </div>
              )}

              {/* Floor Information - Multi-Floor Routes */}
              {routeInfo.isMultiFloor && routeInfo.floors && (
                <div className="route-info-item" style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(0, 105, 92, 0.04)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    color: '#666',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    <span>Floors</span>
                  </div>
                  <span style={{ 
                    color: '#00695C', 
                    fontWeight: '700',
                    fontSize: '11px'
                  }}>{routeInfo.floors.map(f => {
                    if (f === 'ground' || f === 'G' || f === '1') return 'GF';
                    return f === '2' ? '2F' : f === '3' ? '3F' : f === '4' ? '4F' : f + 'F';
                  }).join(' â†’ ')}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Loading Indicator */}
      {!mapLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,255,255,0.9)',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          zIndex: 1001
        }}>
          <div>Loading Mapbox...</div>
        </div>
      )}


    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;









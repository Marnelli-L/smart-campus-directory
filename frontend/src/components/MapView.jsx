import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as turf from '@turf/turf';
import { findSimpleRoute } from '../utils/simplePathfinding';
import { smartSearch, loadAllFloorData } from '../utils/smartSearch';
import QRCode from 'qrcode';

const MapView = forwardRef(({ 
  selectedDestination = null,
  searchDestination = null,
  selectedFloor = 'F1'
}, ref) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [geojsonData, setGeojsonData] = useState(null);
  const [allFloorsData, setAllFloorsData] = useState(null); // Store all floor data for multi-floor routing
  const [floor, setFloor] = useState('ground');
  const markersRef = useRef([]);
  const addCampusRef = useRef(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const watchIdRef = useRef(null);
  const isProcessingRouteRef = useRef(false);
  const lastDestinationRef = useRef(null);
  const destination = selectedDestination || searchDestination;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');
  const floorTransitionTimeoutRef = useRef(null);
  
  // QR Code continuation states
  const [showQRPrompt, setShowQRPrompt] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState('');
  const qrPromptTimeoutRef = useRef(null);
  
  // Location modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationModalType, setLocationModalType] = useState('outside'); // 'outside' or 'inside'
  
  // Detect if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    resetView: () => {
      if (mapRef.current) {
        mapRef.current.jumpTo({
          center: [120.981350, 14.592400],
          zoom: 19,
          pitch: 30,
          bearing: 253,
          essential: true
        });
        console.log('🗺️ Map view reset to default');
      }
    },
    
    clearRoute: () => {
      console.log('🗑️ Clearing route');
      
      // Remove route line
      if (mapRef.current && mapRef.current.getSource('navigation-route')) {
        mapRef.current.getSource('navigation-route').setData({
          type: 'FeatureCollection',
          features: []
        });
      }
      
      // Remove all markers
      const markerIds = ['route-start-marker', 'route-end-marker', 'route-stairs-marker'];
      markerIds.forEach(id => {
        const marker = document.getElementById(id);
        if (marker) marker.remove();
      });
      
      // Clear route info
      setRouteInfo(null);
      
      // Clear QR prompt
      setShowQRPrompt(false);
      setShowQRCode(false);
      if (qrPromptTimeoutRef.current) {
        clearTimeout(qrPromptTimeoutRef.current);
      }
      
      // Reset processing flag
      isProcessingRouteRef.current = false;
      lastDestinationRef.current = null;
      
      console.log('✅ Route cleared');
    },
    
    locateUser: () => {
      console.log('📍 Locate Me button clicked');
      
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      
      if (!mapRef.current) {
        console.error('❌ Map not initialized');
        return;
      }
      
      // University entrance coordinates from GeoJSON (Ground Floor)
      const UNIVERSITY_ENTRANCE = [120.981539, 14.591552];
      
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
          
          console.log('📍 Raw GPS location:', userLocation);
          
          // Check if user is outside the university
          if (!isInsideUniversity(userLocation)) {
            console.log('⚠️ User detected OUTSIDE campus - using entrance as location');
            userLocation = UNIVERSITY_ENTRANCE;
            isOutside = true;
            
            // Show "Outside" modal
            console.log('🔵 Setting modal: outside');
            setLocationModalType('outside');
            setShowLocationModal(true);
          } else {
            console.log('✅ User is INSIDE campus');
            
            // Show "Inside" modal
            console.log('🟢 Setting modal: inside');
            setLocationModalType('inside');
            setShowLocationModal(true);
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
          
          // Fly to user location
          mapRef.current.flyTo({
            center: userLocation,
            zoom: 19,
            pitch: 10,
            bearing: 253,
            essential: true,
            duration: 1500
          });
          
          console.log('✅ Showing user location:', userLocation);
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          // Show outside modal with error
          setLocationModalType('outside');
          setShowLocationModal(true);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000,
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
      console.log('🗺️ Initializing map...');
      
      if (mapContainerRef.current && !mapRef.current) {
        try {
          // Your Mapbox access token
          window.mapboxgl.accessToken = 'pk.eyJ1IjoibmVsbGlpaS0wMjYiLCJhIjoiY21naXVsZzRoMGRubDJsb3Y0b2E0M2R6aSJ9.eH1rbt1exyBhvY2ccAWK9w';
          
          const campusBounds = [
            [120.979000, 14.589500], // Southwest corner
            [120.984500, 14.594500]  // Northeast corner
          ];

          mapRef.current = new window.mapboxgl.Map({
            container: mapContainerRef.current,
            style: {
              version: 8,
              sources: {},
              glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
              layers: [{
                id: 'background',
                type: 'background',
                paint: {
                  'background-color': '#f0f2f5'
                }
              }]
            },
            center: [120.981350, 14.592400],
            zoom: 19,
            minZoom: 16,
            maxZoom: 20,
            maxBounds: campusBounds,
            pitch: 30,
            bearing: 253,
            interactive: true,
            antialias: true
          });

          mapRef.current.on('load', () => {
            setMapLoaded(true);
            console.log('✅ Mapbox loaded successfully!');
            
            // Initialize route source
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
            
            // Add route line with Google Maps-style appearance
            // Outer line (border/shadow)
            mapRef.current.addLayer({
              id: 'navigation-route-casing',
              type: 'line',
              source: 'navigation-route',
              paint: {
                'line-color': '#1565C0',
                'line-width': 10,
                'line-opacity': 0.4,
                'line-blur': 2
              },
              layout: {
                'line-cap': 'round',
                'line-join': 'round'
              }
            });
            
            // Main route line (Google blue)
            mapRef.current.addLayer({
              id: 'navigation-route-line',
              type: 'line',
              source: 'navigation-route',
              paint: {
                'line-color': '#4285F4', // Google Maps blue
                'line-width': 6,
                'line-opacity': 0.95
              },
              layout: {
                'line-cap': 'round',
                'line-join': 'round'
              }
            });
            
            // Preload all floor data for smart search and multi-floor routing
            loadAllFloorData().then((allFloors) => {
              console.log('✅ All floor data preloaded for smart search and routing');
              // Store all floor data for multi-floor pathfinding
              if (allFloors) {
                setAllFloorsData(allFloors);
                console.log('📦 Stored data for floors:', Object.keys(allFloors));
              }
            }).catch(err => {
              console.error('❌ Error preloading floor data:', err);
            });
            
            // Set brighter lighting for better visibility (intensity capped at 1.0 by Mapbox)
            // Using ambient light to achieve brighter appearance
            mapRef.current.setLights([{
              type: 'ambient',
              properties: {
                color: '#ffffff',
                intensity: 0.8
              }
            }, {
              type: 'directional',
              properties: {
                color: '#ffffff',
                intensity: 0.6,
                direction: [1.0, 90, 80]
              }
            }]);
            
            // Add your custom layers
            addCampusGeoJSON(floor);
          });
        } catch (error) {
          console.error('❌ Error initializing map:', error);
        }
      }
    }

    async function addCampusGeoJSON(floorKey = 'ground') {
      if (!mapRef.current) return;
      
      try {
        console.log('🏢 Loading floor GeoJSON data...');
        
        // Load floor GeoJSON files
        const floorFiles = [
          { key: 'ground', path: '/images/1st-floor-map.geojson' },
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
            data.features.forEach(feature => {
              if (!feature.properties) feature.properties = {};
              feature.properties.floor = key;
              feature.properties.Floor = key;
            });
            console.log(`✅ Loaded ${path}: ${data.features.length} features`);
            return { key, data };
          } catch (error) {
            console.error(`❌ Error loading ${path}:`, error);
            return null;
          }
        });
        
        const allFloorData = await Promise.all(floorDataPromises);
        const validFloorData = allFloorData.filter(d => d !== null);
        
        if (validFloorData.length === 0) {
          throw new Error('Failed to load any floor data');
        }
        
        // Get current floor data for display
        const currentFloorData = validFloorData.find(d => d.key === floorKey)?.data || validFloorData[0].data;
        setGeojsonData(currentFloorData);
        setFloor(floorKey);
        
        console.log('🗺️ Current floor data:', currentFloorData);

        // Manage building polygons source - show only current floor
        const buildingsData = {
          ...currentFloorData,
          features: currentFloorData.features.filter(f => f.geometry.type === 'Polygon')
        };
        
        if (mapRef.current.getSource('campus-buildings')) {
          mapRef.current.getSource('campus-buildings').setData(buildingsData);
        } else {
          mapRef.current.addSource('campus-buildings', { type: 'geojson', data: buildingsData });
        }

        // Create label points from polygon centroids
        const labelPoints = {
          type: 'FeatureCollection',
          features: buildingsData.features
            .filter(f => f.properties.Name || f.properties.name)
            .map(f => {
              const centroid = turf.centroid(f);
              const centerLng = centroid.geometry.coordinates[0];
              const centerLat = centroid.geometry.coordinates[1];
              
              const coords = f.geometry.coordinates[0];
              const lngs = coords.map(c => c[0]);
              const lats = coords.map(c => c[1]);
              const width = Math.max(...lngs) - Math.min(...lngs);
              const height = Math.max(...lats) - Math.min(...lats);
              const area = width * height;
              
              let textSize = 7;
              if (area > 0.0001) textSize = 12;
              else if (area > 0.00006) textSize = 10;
              else if (area > 0.00003) textSize = 9;
              else if (area > 0.00001) textSize = 8;
              else textSize = 7;
              
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
        
        if (mapRef.current.getSource('building-label-points')) {
          mapRef.current.getSource('building-label-points').setData(labelPoints);
        } else {
          mapRef.current.addSource('building-label-points', { 
            type: 'geojson', 
            data: labelPoints 
          });
        }

        // Add paths/corridors
        const pathsData = {
          ...currentFloorData,
          features: currentFloorData.features.filter(f => f.geometry.type === 'LineString')
        };
        if (mapRef.current.getSource('campus-paths')) {
          mapRef.current.getSource('campus-paths').setData(pathsData);
        } else {
          mapRef.current.addSource('campus-paths', { type: 'geojson', data: pathsData });
        }

        // Add layers
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
                16, 5,
                18, 6,
                20, 8
              ],
              'line-opacity': 1.0
            }
          });
        }

        if (!mapRef.current.getLayer('campus-buildings-fill')) {
          mapRef.current.addLayer({
            id: 'campus-buildings-fill',
            type: 'fill-extrusion',
            source: 'campus-buildings',
            paint: {
              'fill-extrusion-color': [
                'case',
                // Gardens - Green
                ['==', ['get', 'Type'], 'Garden'], '#5FD068',
                // Entrance - Yellow
                ['==', ['get', 'Type'], 'Entrance'], '#FFC107',
                // Comfort Rooms - Blue
                ['==', ['get', 'Type'], 'Restroom'], '#4A90E2',
                // Stairs - Gray
                ['==', ['get', 'Type'], 'Stairs'], '#757575',
                ['==', ['get', 'Type'], 'Stairs '], '#757575',
                ['==', ['get', 'Type'], 'Stair'], '#757575',
                // Emergency Exits - Red
                ['==', ['get', 'Type'], 'Exit'], '#d32f2f',
                ['==', ['get', 'Type'], 'Exit '], '#d32f2f',
                // Default - White for other buildings
                '#ffffff'
              ],
              'fill-extrusion-height': [
                'case',
                // Gardens - flat
                ['==', ['get', 'Type'], 'Garden'], 0.5,
                // Entrance - flat
                ['==', ['get', 'Type'], 'Entrance'], 0.5,
                // Comfort rooms - flat like garden
                ['==', ['get', 'Type'], 'Restroom'], 0.5,
                // Stairs - flat like garden
                ['==', ['get', 'Type'], 'Stairs'], 0.5,
                ['==', ['get', 'Type'], 'Stairs '], 0.5,
                ['==', ['get', 'Type'], 'Stair'], 0.5,
                // Emergency exits - flat like garden
                ['==', ['get', 'Type'], 'Exit'], 0.5,
                ['==', ['get', 'Type'], 'Exit '], 0.5,
                // Classrooms, offices, labs
                ['==', ['get', 'type'], 'classroom'], 5,
                ['==', ['get', 'type'], 'office'], 4,
                ['==', ['get', 'type'], 'laboratory'], 6,
                // Default height
                3
              ],
              'fill-extrusion-opacity': 1.0,
              'fill-extrusion-vertical-gradient': true,
              'fill-extrusion-ambient-occlusion-intensity': 0.3
            }
          });
        }

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

        if (!mapRef.current.getLayer('campus-buildings-labels')) {
          mapRef.current.addLayer({
            id: 'campus-buildings-labels',
            type: 'symbol',
            source: 'building-label-points',
            layout: {
              'text-field': ['get', 'Name'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                16, ['*', ['get', 'calculatedTextSize'], 0.6],
                18, ['*', ['get', 'calculatedTextSize'], 0.85],
                20, ['*', ['get', 'calculatedTextSize'], 1.1]
              ],
              'text-anchor': 'center',
              'text-transform': 'uppercase',
              'text-max-width': 4,
              'text-line-height': 1.3,
              'text-letter-spacing': 0.08,
              'text-justify': 'center',
              'text-allow-overlap': true,
              'text-ignore-placement': true,
              'text-optional': false,
              'text-padding': 2,
              'text-pitch-alignment': 'viewport',
              'text-rotation-alignment': 'viewport',
              'text-variable-anchor': ['center', 'top', 'bottom', 'left', 'right'],
              'text-radial-offset': 0,
              'symbol-sort-key': ['-', 0, ['get', 'polygonArea']],
              'symbol-z-order': 'viewport-y',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
            },
            paint: {
              'text-color': '#000000',
              'text-halo-color': 'rgba(255, 255, 255, 0.95)',
              'text-halo-width': 4,
              'text-halo-blur': 0.5,
              'text-opacity': 1.0
            }
          });
        }

        // Clear old markers and add room markers
        if (markersRef.current && markersRef.current.length) {
          markersRef.current.forEach(m => m.remove());
          markersRef.current = [];
        }

        const pointFeatures = currentFloorData.features.filter(f =>
          f.geometry.type === 'Point' && (f.properties.Name || f.properties.name)
        );

        pointFeatures.forEach(feature => {
          const coords = feature.geometry.coordinates;
          const props = feature.properties;
          const itemName = props.Name || props.name || 'Unknown';
          
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
              <div style="background: linear-gradient(135deg, #00594A 0%, #00695C 100%); padding: 12px 14px;">
                <h3 style="margin: 0; color: white; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; text-align: center;">
                  ${itemName}
                </h3>
              </div>
              
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
                onmouseover="this.style.background='linear-gradient(135deg, #007763 0%, #00897B 100%)'"
                onmouseout="this.style.background='linear-gradient(135deg, #00594A 0%, #00695C 100%)'"
              >
                Navigate Here
              </button>
            </div>
          `);
          
          // Add event listener when popup opens
          popup.on('open', () => {
            setTimeout(() => {
              const navBtn = document.getElementById(`navigate-btn-${itemName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')}`);
              if (navBtn) {
                console.log('✅ Button found and adding click listener for:', itemName);
                navBtn.onclick = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🧭 Navigate Here clicked for:', itemName);
                  
                  // Dispatch navigation event
                  window.dispatchEvent(new CustomEvent('navigateToLocation', { 
                    detail: { location: itemName } 
                  }));
                  
                  // Close the popup
                  popup.remove();
                  
                  // Show feedback toast
                  const toast = document.createElement('div');
                  toast.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 89, 74, 0.95);
                    backdrop-filter: blur(10px);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    z-index: 10000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    animation: slideDown 0.3s ease-out;
                    border: 1px solid rgba(255,255,255,0.1);
                  `;
                  toast.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 16px;">🧭</span>
                      <span>Navigating to <strong>${itemName}</strong></span>
                    </div>
                  `;
                  document.body.appendChild(toast);
                  
                  // Add animation keyframes if not exists
                  if (!document.getElementById('toast-animation-styles')) {
                    const style = document.createElement('style');
                    style.id = 'toast-animation-styles';
                    style.textContent = `
                      @keyframes slideDown {
                        from {
                          transform: translate(-50%, -20px);
                          opacity: 0;
                        }
                        to {
                          transform: translate(-50%, 0);
                          opacity: 1;
                        }
                      }
                    `;
                    document.head.appendChild(style);
                  }
                  
                  // Remove toast after 3 seconds
                  setTimeout(() => {
                    toast.style.transition = 'opacity 0.3s ease-out';
                    toast.style.opacity = '0';
                    setTimeout(() => toast.remove(), 300);
                  }, 3000);
                };
              } else {
                console.error('❌ Button not found:', `navigate-btn-${itemName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')}`);
              }
            }, 100);
          });
          
          popup.addTo(mapRef.current);

          const marker = new window.mapboxgl.Marker({
            element: el,
            anchor: 'center'
          })
          .setLngLat(coords)
          .setPopup(popup)
          .addTo(mapRef.current);
          
          markersRef.current.push(marker);
        });

        // Reset to fixed view
        mapRef.current.jumpTo({
          center: [120.981350, 14.592400],
          zoom: 19,
          pitch: 30,
          bearing: 253
        });

        addLegendAndControls();
      } catch (error) {
        console.error('❌ Error loading GeoJSON:', error);
      }
    }
    
    // Expose the loader via ref
    addCampusRef.current = addCampusGeoJSON;

    function addLegendAndControls() {
      if (!mapRef.current || document.getElementById('legend-box')) return;

      const legend = document.createElement('div');
      legend.id = 'legend-box';

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      legend.style.cssText = `
        position: fixed;
        bottom: ${isMobile ? '10px' : '30px'};
        left: ${isMobile ? '8px' : '30px'};
        background: white;
        padding: ${isMobile ? '8px 10px' : '16px'};
        border-radius: ${isMobile ? '8px' : '8px'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: ${isMobile ? '9px' : '12px'};
        z-index: 9999;
        min-width: ${isMobile ? '95px' : '150px'};
        max-width: ${isMobile ? '110px' : '180px'};
        pointer-events: auto;
      `;
      
      legend.innerHTML = `
        <div style="font-weight: 700; margin-bottom: ${isMobile ? '8px' : '16px'}; color: #333; font-size: ${isMobile ? '11px' : '16px'}; letter-spacing: 0.3px;">LEGEND</div>
        
        <div style="margin-bottom: 0;">
          <div style="font-weight: 600; margin-bottom: ${isMobile ? '4px' : '8px'}; color: #555; font-size: ${isMobile ? '9px' : '13px'};">Facilities</div>
          
          <div style="display: flex; align-items: center; margin: ${isMobile ? '4px' : '8px'} 0;">
            <div style="width: ${isMobile ? '16px' : '24px'}; height: ${isMobile ? '16px' : '24px'}; background: #FFC107; border-radius: 3px; margin-right: ${isMobile ? '6px' : '10px'}; box-shadow: 0 1px 3px rgba(0,0,0,0.2); flex-shrink: 0;"></div>
            <span style="color: #333; font-size: ${isMobile ? '9px' : '13px'}; line-height: 1.2;">Entrance</span>
          </div>
          
          <div style="display: flex; align-items: center; margin: ${isMobile ? '4px' : '8px'} 0;">
            <div style="width: ${isMobile ? '16px' : '24px'}; height: ${isMobile ? '16px' : '24px'}; background: #4A90E2; border-radius: 3px; margin-right: ${isMobile ? '6px' : '10px'}; box-shadow: 0 1px 3px rgba(0,0,0,0.2); flex-shrink: 0;"></div>
            <span style="color: #333; font-size: ${isMobile ? '9px' : '13px'}; line-height: 1.2;">Comfort Room</span>
          </div>
          
          <div style="display: flex; align-items: center; margin: ${isMobile ? '4px' : '8px'} 0;">
            <div style="width: ${isMobile ? '16px' : '24px'}; height: ${isMobile ? '16px' : '24px'}; background: #757575; border-radius: 3px; margin-right: ${isMobile ? '6px' : '10px'}; box-shadow: 0 1px 3px rgba(0,0,0,0.2); flex-shrink: 0;"></div>
            <span style="color: #333; font-size: ${isMobile ? '9px' : '13px'}; line-height: 1.2;">Stairs</span>
          </div>
          
          <div style="display: flex; align-items: center; margin: ${isMobile ? '4px' : '8px'} 0;">
            <div style="width: ${isMobile ? '16px' : '24px'}; height: ${isMobile ? '16px' : '24px'}; background: #d32f2f; border-radius: 3px; margin-right: ${isMobile ? '6px' : '10px'}; box-shadow: 0 1px 3px rgba(0,0,0,0.2); flex-shrink: 0;"></div>
            <span style="color: #333; font-size: ${isMobile ? '9px' : '13px'}; line-height: 1.2;">Emergency Exit</span>
          </div>
          
          <div style="display: flex; align-items: center; margin: ${isMobile ? '4px' : '8px'} 0;">
            <div style="width: ${isMobile ? '16px' : '24px'}; height: ${isMobile ? '16px' : '24px'}; background: #5FD068; border-radius: 3px; margin-right: ${isMobile ? '6px' : '10px'}; box-shadow: 0 1px 3px rgba(0,0,0,0.2); flex-shrink: 0;"></div>
            <span style="color: #333; font-size: ${isMobile ? '9px' : '13px'}; line-height: 1.2;">Garden</span>
          </div>
        </div>
      `;
      
      document.body.appendChild(legend);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      
      const legendEl = document.getElementById('legend-box');
      if (legendEl) legendEl.remove();
    };
  }, [floor]);

  // Handle destination changes with simple pathfinding
  useEffect(() => {
    // Simple destination search
    const findDestination = async (searchTerm) => {
      if (!searchTerm) return null;
      
      console.log(`🔍 Smart searching for: "${searchTerm}"`);
      
      const searchResult = await smartSearch(searchTerm);
      
      if (searchResult.bestMatch) {
        const match = searchResult.bestMatch;
        console.log(`✅ Found: "${match.name}" on ${match.floor} (${match.floorKey})`);
        
        if (match.floorKey !== floor) {
          console.log(`🔄 Switching from floor "${floor}" to floor "${match.floorKey}"`);
          
          if (!isProcessingRouteRef.current) {
            if (addCampusRef.current) {
              console.log(`📂 Loading ${match.floorKey} floor GeoJSON...`);
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

    // SM Mall-style animated floor transition
    async function animateFloorTransition(fromFloor, toFloor) {
      console.log(`🎬 Animating transition: ${fromFloor} → ${toFloor}`);
      
      // Clear any existing transition timeout
      if (floorTransitionTimeoutRef.current) {
        clearTimeout(floorTransitionTimeoutRef.current);
      }
      
      // Create backdrop (semi-transparent)
      const backdrop = document.createElement('div');
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.25s ease;
      `;
      
      // Create modal card
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 32px 40px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        min-width: 320px;
        max-width: 400px;
        transform: scale(0.9);
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;
      
      // Floor icon
      const icon = document.createElement('div');
      icon.innerHTML = '🏢';
      icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 16px;
        animation: pulse 0.8s ease-in-out infinite;
      `;
      
      // Add animations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `;
      document.head.appendChild(style);
      
      // Floor text
      const text = document.createElement('div');
      text.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        color: #1a237e;
        margin-bottom: 16px;
      `;
      text.textContent = `Switching to ${getFloorName(toFloor)}`;
      
      // Progress bar container
      const progressContainer = document.createElement('div');
      progressContainer.style.cssText = `
        width: 100%;
        height: 6px;
        background: #e0e0e0;
        border-radius: 3px;
        overflow: hidden;
      `;
      
      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #0d47a1, #1976d2);
        border-radius: 3px;
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      
      progressContainer.appendChild(progressBar);
      modal.appendChild(icon);
      modal.appendChild(text);
      modal.appendChild(progressContainer);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);
      
      // Trigger animations
      requestAnimationFrame(() => {
        backdrop.style.opacity = '1';
        modal.style.transform = 'scale(1)';
        setTimeout(() => progressBar.style.width = '50%', 50);
      });
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Switch floor
      console.log(`🔄 Loading ${toFloor} floor data...`);
      if (addCampusRef.current) {
        addCampusRef.current(toFloor);
      }
      
      // Update floor state to sync dropdown
      setFloor(toFloor);
      
      // Complete progress
      progressBar.style.width = '100%';
      progressBar.style.background = 'linear-gradient(90deg, #4CAF50, #66BB6A)';
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Update to success state
      text.textContent = `${getFloorName(toFloor)}`;
      text.style.color = '#4CAF50';
      icon.innerHTML = '✓';
      icon.style.fontSize = '56px';
      icon.style.animation = 'none';
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Fade out
      backdrop.style.opacity = '0';
      modal.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        document.body.removeChild(backdrop);
        document.head.removeChild(style);
        setIsTransitioning(false);
        setTransitionMessage('');
      }, 150);
      
      console.log(`✅ Floor transition complete: ${toFloor}`);
    }
    
    // Helper function to get floor display name
    function getFloorName(floorKey) {
      const floorNames = {
        'ground': 'Ground Floor',
        '2': '2nd Floor',
        '3': '3rd Floor',
        '4': '4th Floor'
      };
      return floorNames[floorKey] || floorKey;
    }

    // Google Maps-style route creation with A* pathfinding
    async function addSimpleRoute(destinationName) {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('🧭 === GOOGLE MAPS STYLE NAVIGATION ===');
      console.log('═══════════════════════════════════════════');
      console.log('🎯 Destination Name:', destinationName);
      console.log('🗺️ Map loaded:', !!mapRef.current);
      console.log('📊 GeoJSON available:', !!geojsonData);
      console.log('📦 GeoJSON features:', geojsonData?.features?.length || 0);
      console.log('');
      
      if (!mapRef.current) {
        console.error('❌ No map reference');
        return;
      }

      if (!geojsonData || !geojsonData.features) {
        console.error('❌ No GeoJSON data available');
        return;
      }

      // ALWAYS use entrance as starting point for navigation searches
      // The "Locate Me" button is separate and shows user's actual location
      const startPoint = [120.981539, 14.591552]; // Main entrance (from GeoJSON)
      const startMessage = 'Starting from Main Entrance';
      console.log('📍 Using Main Entrance as starting point for navigation');
      
      // Find destination
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
        console.log('✅ Found destination via smart search:', destinationInfo.name);
        console.log('🏢 Destination floor:', destinationInfo.floor, `(${destinationInfo.floorKey})`);
      } else {
        console.warn(`WARNING: not found - using fallback`);
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
          type: 'Location',
          floorKey: 'ground'
        };
      }
      
      console.log('🧭 === A* PATHFINDING ROUTE ===');
      console.log('📍 Start:', startPoint);
      console.log('🎯 Destination:', destinationCoords);
      console.log('🏢 Target:', destinationInfo.name);
      console.log(`📝 ${startMessage}`);
      
      // Determine start floor (current floor or destination floor if same building)
      const currentFloorKey = floor;
      const destinationFloorKey = destinationInfo.floorKey || floor;
      const needsFloorSwitch = currentFloorKey !== destinationFloorKey;
      
      console.log(`🏢 Current Floor: ${currentFloorKey}, Destination Floor: ${destinationFloorKey}`);
      console.log(`🏢 Needs floor switch: ${needsFloorSwitch ? 'YES ✅' : 'NO'}`);
      
      let pathfindingResult;
      
      // Multi-floor navigation with stairs
      if (needsFloorSwitch && allFloorsData) {
        console.log('🚶 === MULTI-FLOOR NAVIGATION ===');
        
        // Find stairs on both floors
        const currentFloorData = allFloorsData[currentFloorKey];
        const destFloorData = allFloorsData[destinationFloorKey];
        
        if (currentFloorData && destFloorData) {
          // Find stairs on current floor
          const currentStairs = currentFloorData.data.features.filter(f => {
            const props = f.properties || {};
            const type = (props.Type || props.type || '').toLowerCase();
            const name = (props.Name || props.name || '').toLowerCase();
            return type === 'stairs' || type === 'stair' || name.includes('stair');
          });
          
          // Find stairs on destination floor (same location)
          const destStairs = destFloorData.data.features.filter(f => {
            const props = f.properties || {};
            const type = (props.Type || props.type || '').toLowerCase();
            const name = (props.Name || props.name || '').toLowerCase();
            return type === 'stairs' || type === 'stair' || name.includes('stair');
          });
          
          console.log(`   Found ${currentStairs.length} stairs on ${currentFloorKey}`);
          console.log(`   Found ${destStairs.length} stairs on ${destinationFloorKey}`);
          
          if (currentStairs.length > 0 && destStairs.length > 0) {
            // Find nearest stair to start point on current floor
            let nearestStair = null;
            let nearestStairFeature = null;
            let minDist = Infinity;
            
            currentStairs.forEach(stair => {
              let stairCoords;
              
              if (stair.geometry.type === 'Point') {
                stairCoords = stair.geometry.coordinates;
              } else if (stair.geometry.type === 'Polygon') {
                // For polygons, use the centroid
                stairCoords = turf.centroid(stair).geometry.coordinates;
              } else if (stair.geometry.type === 'LineString') {
                // For linestrings, use the midpoint
                const coords = stair.geometry.coordinates;
                const midIndex = Math.floor(coords.length / 2);
                stairCoords = coords[midIndex];
              } else {
                stairCoords = turf.centroid(stair).geometry.coordinates;
              }
              
              const dist = turf.distance(
                turf.point(startPoint),
                turf.point(stairCoords),
                { units: 'meters' }
              );
              
              if (dist < minDist) {
                minDist = dist;
                nearestStair = stairCoords;
                nearestStairFeature = stair;
              }
            });
            
            if (nearestStair) {
              const stairName = nearestStairFeature?.properties?.Name || nearestStairFeature?.properties?.name || 'Stairs';
              const stairType = nearestStairFeature?.geometry?.type || 'Unknown';
              console.log(`✅ Found nearest stair: "${stairName}" (${stairType})`);
              console.log(`   Coordinates: [${nearestStair[0].toFixed(6)}, ${nearestStair[1].toFixed(6)}]`);
              console.log(`   Distance from start: ${minDist.toFixed(1)}m`);
              
              // Phase 1: Route from start to stairs on current floor
              console.log('📍 Phase 1: Routing to stairs on', currentFloorKey);
              const routeToStairs = findSimpleRoute(startPoint, nearestStair, geojsonData?.features || []);
              
              if (routeToStairs && routeToStairs.valid && routeToStairs.path && routeToStairs.path.length > 0) {
                console.log(`✅ Phase 1 route: ${routeToStairs.distance.toFixed(1)}m with ${routeToStairs.path.length} points`);
                
                // Draw route to stairs
                if (mapRef.current && mapRef.current.getSource('navigation-route')) {
                  mapRef.current.getSource('navigation-route').setData({
                    type: 'Feature',
                    properties: { isDirect: false },
                    geometry: {
                      type: 'LineString',
                      coordinates: routeToStairs.path
                    }
                  });
                  
                  // Move layers to top
                  if (mapRef.current.getLayer('navigation-route-casing')) {
                    mapRef.current.moveLayer('navigation-route-casing');
                  }
                  if (mapRef.current.getLayer('navigation-route-line')) {
                    mapRef.current.moveLayer('navigation-route-line');
                  }
                  
                  // Add markers
                  const existingStartMarker = document.getElementById('route-start-marker');
                  if (existingStartMarker) existingStartMarker.remove();
                  
                  const startEl = document.createElement('div');
                  startEl.id = 'route-start-marker';
                  startEl.style.cssText = `
                    width: 30px; height: 30px; background: #4CAF50; border: 3px solid white;
                    border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: bold; font-size: 18px; cursor: pointer;
                  `;
                  startEl.innerHTML = 'S';
                  startEl.title = 'Start Point (Entrance)';
                  new window.mapboxgl.Marker({ element: startEl })
                    .setLngLat(startPoint)
                    .addTo(mapRef.current);
                  
                  const existingStairsMarker = document.getElementById('route-stairs-marker');
                  if (existingStairsMarker) existingStairsMarker.remove();
                  
                  const stairsEl = document.createElement('div');
                  stairsEl.id = 'route-stairs-marker';
                  stairsEl.style.cssText = `
                    width: 30px; height: 30px; background: #FF9800; border: 3px solid white;
                    border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: bold; font-size: 14px; cursor: pointer;
                  `;
                  stairsEl.innerHTML = '🚶';
                  stairsEl.title = 'Take Stairs';
                  new window.mapboxgl.Marker({ 
                    element: stairsEl,
                    anchor: 'center', // Center the marker on the coordinates
                    offset: [0, 0] // No offset
                  })
                    .setLngLat(routeToStairs.path[routeToStairs.path.length - 1]) // Use last point of route line
                    .addTo(mapRef.current);
                  
                  // Zoom to route
                  const bounds = routeToStairs.path.reduce((bounds, coord) => {
                    return bounds.extend(coord);
                  }, new window.mapboxgl.LngLatBounds(routeToStairs.path[0], routeToStairs.path[0]));
                  
                  mapRef.current.fitBounds(bounds, {
                    padding: 100,
                    duration: 1000,
                    pitch: 30,
                    bearing: 253
                  });
                }
                
                // Set route info for phase 1
                setRouteInfo({
                  distance: routeToStairs.distance,
                  waypoints: routeToStairs.path.length,
                  isValid: true,
                  estimatedTime: Math.ceil(routeToStairs.distance / 1.4 / 60),
                  destination: `Stairs to ${destinationInfo.floor}`,
                  building: destinationInfo.building,
                  floor: currentFloorKey,
                  floors: [currentFloorKey, destinationFloorKey],
                  isMultiFloor: true,
                  floorTransitions: [{ from: currentFloorKey, to: destinationFloorKey, stairName: 'Stairs' }],
                  directions: routeToStairs.directions || []
                });
                
                // Phase 2: Floor transition
                console.log('🎬 Phase 2: Transitioning to', destinationFloorKey);
                await animateFloorTransition(currentFloorKey, destinationFloorKey);
                
                // Phase 3: Route from stairs to destination on new floor
                console.log('📍 Phase 3: Routing from stairs to destination on', destinationFloorKey);
                
                // Get the NEW floor data after transition
                const newFloorData = allFloorsData[destinationFloorKey];
                if (!newFloorData || !newFloorData.data || !newFloorData.data.features) {
                  console.error('❌ New floor data not available for', destinationFloorKey);
                  return;
                }
                
                console.log(`📦 Using ${newFloorData.data.features.length} features from ${destinationFloorKey}`);
                pathfindingResult = findSimpleRoute(nearestStair, destinationCoords, newFloorData.data.features);
                
                if (pathfindingResult && pathfindingResult.valid) {
                  console.log(`✅ Phase 3 route: ${pathfindingResult.distance.toFixed(1)}m with ${pathfindingResult.path.length} points`);
                  
                  // Draw the Phase 3 route on the new floor
                  if (mapRef.current && mapRef.current.getSource('navigation-route')) {
                    mapRef.current.getSource('navigation-route').setData({
                      type: 'Feature',
                      properties: { isDirect: false },
                      geometry: {
                        type: 'LineString',
                        coordinates: pathfindingResult.path
                      }
                    });
                    
                    console.log('✅ Phase 3 route line drawn');
                    
                    // Move layers to top
                    if (mapRef.current.getLayer('navigation-route-casing')) {
                      mapRef.current.moveLayer('navigation-route-casing');
                    }
                    if (mapRef.current.getLayer('navigation-route-line')) {
                      mapRef.current.moveLayer('navigation-route-line');
                    }
                  }
                  
                  // Add stairs marker on new floor (start of Phase 3)
                  const newStairsEl = document.createElement('div');
                  newStairsEl.id = 'route-stairs-marker';
                  newStairsEl.style.cssText = `
                    width: 30px; height: 30px; background: #FF9800; border: 3px solid white;
                    border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: bold; font-size: 14px; cursor: pointer;
                  `;
                  newStairsEl.innerHTML = '🚶';
                  newStairsEl.title = 'From Stairs';
                  new window.mapboxgl.Marker({ 
                    element: newStairsEl,
                    anchor: 'center', // Center the marker on the coordinates
                    offset: [0, 0] // No offset
                  })
                    .setLngLat(pathfindingResult.path[0]) // Use first point of Phase 3 route
                    .addTo(mapRef.current);
                  
                  // Add end marker
                  const existingEndMarker = document.getElementById('route-end-marker');
                  if (existingEndMarker) existingEndMarker.remove();
                  
                  const endEl = document.createElement('div');
                  endEl.id = 'route-end-marker';
                  endEl.style.cssText = `
                    width: 30px; height: 30px; background: #F44336; border: 3px solid white;
                    border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: bold; font-size: 18px; cursor: pointer;
                  `;
                  endEl.innerHTML = 'E';
                  endEl.title = destinationInfo.name;
                  new window.mapboxgl.Marker({ element: endEl })
                    .setLngLat(pathfindingResult.path[pathfindingResult.path.length - 1]) // Use last point of Phase 3 route
                    .addTo(mapRef.current);
                  
                  // Zoom to Phase 3 route
                  const bounds = pathfindingResult.path.reduce((bounds, coord) => {
                    return bounds.extend(coord);
                  }, new window.mapboxgl.LngLatBounds(pathfindingResult.path[0], pathfindingResult.path[0]));
                  
                  mapRef.current.fitBounds(bounds, {
                    padding: 100,
                    duration: 1000,
                    pitch: 30,
                    bearing: 253
                  });
                  
                  // Update route info for Phase 3
                  setRouteInfo({
                    distance: routeToStairs.distance + pathfindingResult.distance,
                    waypoints: pathfindingResult.path.length,
                    isValid: true,
                    estimatedTime: Math.ceil((routeToStairs.distance + pathfindingResult.distance) / 1.4 / 60),
                    destination: destinationInfo.name,
                    building: destinationInfo.building,
                    floor: destinationFloorKey,
                    floors: [currentFloorKey, destinationFloorKey],
                    isMultiFloor: true,
                    floorTransitions: [{ from: currentFloorKey, to: destinationFloorKey, stairName: 'Stairs' }],
                    directions: pathfindingResult.directions || []
                  });
                  
                  console.log('✅ Multi-floor navigation complete!');
                  return; // Exit early, we've drawn everything
                } else {
                  console.warn('⚠️ Phase 3 failed');
                  alert(`⚠️ Route Issue\n\nCould not find route on ${destinationFloorKey}.\n\nTry a different starting point.`);
                  isProcessingRouteRef.current = false;
                  return;
                }
              } else {
                console.warn('⚠️ Phase 1 failed');
                alert(`⚠️ Route Issue\n\nCould not find route to stairs on ${currentFloorKey}.`);
                isProcessingRouteRef.current = false;
                return;
              }
            } else {
              console.warn('⚠️ No stairs found');
              alert(`❌ Stairs Not Found\n\nNo stairs found to connect ${currentFloorKey} to ${destinationFloorKey}.`);
              isProcessingRouteRef.current = false;
              return;
            }
          } else {
            console.warn('⚠️ No stairs found on floors');
            alert(`❌ Stairs Not Found\n\nNo stairs data available for multi-floor navigation.`);
            isProcessingRouteRef.current = false;
            return;
          }
        } else {
          console.warn('⚠️ Floor data not available');
          alert(`❌ Floor Data Not Available\n\nCannot load ${destinationFloorKey} data.`);
          isProcessingRouteRef.current = false;
          return;
        }
      } else {
        // Single floor navigation
        console.log('🚶 Running single-floor pathfinding...');
        pathfindingResult = findSimpleRoute(startPoint, destinationCoords, geojsonData?.features || []);
      }
      
      if (!pathfindingResult || !pathfindingResult.valid) {
        console.error('❌ No valid corridor path found');
        
        const dx = destinationCoords[0] - startPoint[0];
        const dy = destinationCoords[1] - startPoint[1];
        const directDistance = Math.sqrt(dx*dx + dy*dy) * 111320;
        
        pathfindingResult = {
          path: [],
          distance: directDistance,
          waypoints: 0,
          valid: false,
          floors: [destinationInfo.floor],
          error: 'No corridor connection available'
        };
        
        // Show error message to user
        alert(`❌ Route Not Found\n\nCannot find a corridor route to "${destinationInfo.name}".\n\nPossible reasons:\n• Destination is not connected via corridors\n• No path exists on the current floor\n• Destination may be in a restricted area\n\nPlease try a different location or contact support.`);
        
        console.log('⚠️ No corridor route available:', 'Destination cannot be reached via corridors');
        
        // Reset and return
        isProcessingRouteRef.current = false;
        return;
      } else {
        console.log('✅ Corridor route found:', `${pathfindingResult.distance.toFixed(1)}m, ${pathfindingResult.waypoints} waypoints`);
      }
      
      const routePath = pathfindingResult.path;
      
      // Calculate estimated walking time
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
        floorTransitions: pathfindingResult.floorTransitions || [],
        directions: pathfindingResult.directions || []
      });
      
      // Show QR prompt after route is displayed (only on non-mobile devices/kiosks)
      if (pathfindingResult.valid && !isMobile) {
        // Clear any existing timeout
        if (qrPromptTimeoutRef.current) {
          clearTimeout(qrPromptTimeoutRef.current);
        }
        
        // Show prompt after 2 seconds
        qrPromptTimeoutRef.current = setTimeout(() => {
          setShowQRPrompt(true);
        }, 2000);
      }
      
      if (pathfindingResult.valid) {
        const routeType = pathfindingResult.isDirect ? 'DIRECT' : 'CORRIDOR';
        console.log(`✅ ${routeType} ROUTE FOUND!`);
        console.log(`🧭 Destination: ${destinationInfo.name}`);
        console.log(`🏢 Building: ${destinationInfo.building}`);
        console.log(`🏢 Floor: ${destinationInfo.floor}`);
        console.log(`📏 Distance: ${pathfindingResult.distance.toFixed(1)} meters`);
        console.log(`⏱️ Est. Time: ${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''}`);
        
        if (pathfindingResult.isDirect) {
          console.log('ℹ️ Using direct routing (no corridors available)');
        }
        
        // Draw route line with appropriate styling
        if (mapRef.current && mapRef.current.getSource('navigation-route')) {
          mapRef.current.getSource('navigation-route').setData({
            type: 'Feature',
            properties: {
              isDirect: pathfindingResult.isDirect || false
            },
            geometry: {
              type: 'LineString',
              coordinates: routePath
            }
          });
          
          console.log('✅ Route line drawn with', routePath.length, 'points');
          
          // Add start and end markers
          // Remove existing markers
          const existingStartMarker = document.getElementById('route-start-marker');
          const existingEndMarker = document.getElementById('route-end-marker');
          if (existingStartMarker) existingStartMarker.remove();
          if (existingEndMarker) existingEndMarker.remove();
          
          // Add start marker (green circle with "S") - ALWAYS at entrance
          const startEl = document.createElement('div');
          startEl.id = 'route-start-marker';
          startEl.style.cssText = `
            width: 30px;
            height: 30px;
            background: #4CAF50;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
            cursor: pointer;
          `;
          startEl.innerHTML = 'S';
          startEl.title = 'Start Point (Entrance)';
          
          new window.mapboxgl.Marker({ element: startEl })
            .setLngLat(startPoint)
            .addTo(mapRef.current);
          
          // Add end marker (red pin with "End")
          if (routePath.length > 0) {
            const endEl = document.createElement('div');
            endEl.id = 'route-end-marker';
            endEl.style.cssText = `
              width: 30px;
              height: 30px;
              background: #F44336;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 18px;
              cursor: pointer;
            `;
            endEl.innerHTML = 'E';
            endEl.title = 'Destination';
            
            new window.mapboxgl.Marker({ element: endEl })
              .setLngLat(routePath[routePath.length - 1])
              .addTo(mapRef.current);
          }
          
          // Move route layers to top so they appear above all other layers
          if (mapRef.current.getLayer('navigation-route-casing')) {
            mapRef.current.moveLayer('navigation-route-casing');
          }
          if (mapRef.current.getLayer('navigation-route-line')) {
            mapRef.current.moveLayer('navigation-route-line');
          }
          
          // Update route line styling based on route type
          if (pathfindingResult.isDirect) {
            // Dashed line for direct routes (no corridors)
            if (mapRef.current.getLayer('navigation-route-line')) {
              mapRef.current.setPaintProperty('navigation-route-line', 'line-dasharray', [2, 2]);
            }
          } else {
            // Solid line for corridor routes
            if (mapRef.current.getLayer('navigation-route-line')) {
              mapRef.current.setPaintProperty('navigation-route-line', 'line-dasharray', [1, 0]);
            }
          }
          
          // Fit map to show the entire route
          if (routePath.length >= 2) {
            const bounds = routePath.reduce((bounds, coord) => {
              return bounds.extend(coord);
            }, new window.mapboxgl.LngLatBounds(routePath[0], routePath[0]));
            
            mapRef.current.fitBounds(bounds, {
              padding: 100,
              duration: 1000,
              pitch: 30,
              bearing: 253
            });
          }
        }
      } else {
        console.warn('⚠️ No valid route found.');
      }
    }

    // Execute the routing logic
    console.log('🔄 Navigation Effect Triggered:', {
      destination,
      mapLoaded,
      hasMapRef: !!mapRef.current,
      hasGeoJSON: !!geojsonData,
      isProcessing: isProcessingRouteRef.current
    });

    if (destination && mapRef.current && mapLoaded) {
      if (isProcessingRouteRef.current && lastDestinationRef.current === destination) {
        console.log('⏸️ Already processing route for:', destination);
        return;
      }
      
      console.log('🧭 Starting navigation to:', destination);
      lastDestinationRef.current = destination;
      isProcessingRouteRef.current = true;
      
      (async () => {
        try {
          await addSimpleRoute(destination);
        } catch (error) {
          console.error('❌ Error in routing:', error);
        } finally {
          isProcessingRouteRef.current = false;
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
      
      // Remove route markers
      const existingStartMarker = document.getElementById('route-start-marker');
      const existingEndMarker = document.getElementById('route-end-marker');
      if (existingStartMarker) existingStartMarker.remove();
      if (existingEndMarker) existingEndMarker.remove();
      
      setRouteInfo(null);
    }
  }, [destination, mapLoaded, floor, geojsonData, allFloorsData, isMobile]);

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      position: 'relative'
    }}>
      {/* Mapbox Container */}
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
          🧭 Showing: <strong>{destination}</strong>
        </div>
      )}

      {/* Route Information Panel */}
      {destination && routeInfo && routeInfo.isValid && (
        <div 
          style={{
            position: 'fixed',
            bottom: isMobile ? '180px' : '30px',
            left: isMobile ? '8px' : '210px',
            right: isMobile ? 'auto' : 'auto',
            background: 'rgba(255, 255, 255, 0.98)',
            padding: isMobile ? '8px 12px' : '10px 14px',
            borderRadius: '8px',
            fontSize: isMobile ? '10px' : '11px',
            zIndex: 9999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            minWidth: isMobile ? '100px' : '150px',
            maxWidth: isMobile ? '120px' : '180px',
            fontFamily: 'Segoe UI, Arial, sans-serif',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 105, 92, 0.12)'
          }}>
          <div style={{ fontWeight: '700', marginBottom: isMobile ? '6px' : '8px', color: '#00695C', fontSize: isMobile ? '10px' : '12px' }}>
            Route Info
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#666', fontSize: isMobile ? '9px' : '11px' }}>Distance:</span>
            <span style={{ fontWeight: '600', color: '#00695C', fontSize: isMobile ? '9px' : '11px' }}>{routeInfo.distance.toFixed(0)}m</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#666', fontSize: isMobile ? '9px' : '11px' }}>Walk Time:</span>
            <span style={{ fontWeight: '600', color: '#00695C', fontSize: isMobile ? '9px' : '11px' }}>~{routeInfo.estimatedTime || Math.ceil(routeInfo.distance / 20)}min</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666', fontSize: isMobile ? '9px' : '11px' }}>Floor:</span>
            <span style={{ fontWeight: '600', color: '#00695C', fontSize: isMobile ? '9px' : '11px' }}>{routeInfo.floor}</span>
          </div>
        </div>
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
          <div>Loading Map...</div>
        </div>
      )}

      {/* SM Mall-style Floor Transition Overlay */}
      {isTransitioning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #00695c, #4db6ac)',
            padding: '30px 50px',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            textAlign: 'center',
            animation: 'slideUp 0.4s ease-out'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '15px',
              animation: 'pulse 1s infinite'
            }}>
              🏢
            </div>
            <div style={{
              color: 'white',
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '10px',
              fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              {transitionMessage}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '14px',
              fontWeight: '400'
            }}>
              Please wait...
            </div>
          </div>
        </div>
      )}

      {/* QR Code Continuation Prompt - Small notification */}
      {showQRPrompt && !showQRCode && !isMobile && (
        <div style={{
          position: 'fixed',
          bottom: '180px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 10000,
          maxWidth: '320px',
          border: '1px solid rgba(0, 89, 74, 0.2)',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{ fontSize: '24px', marginTop: '2px' }}>📱</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '6px'
              }}>
                Continue on your phone?
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '12px'
              }}>
                Scan QR code to continue this route on your mobile device
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={async () => {
                    // Generate QR code with route data
                    const baseUrl = window.location.origin;
                    const routeUrl = `${baseUrl}/map?destination=${encodeURIComponent(destination)}`;
                    
                    try {
                      const qrDataUrl = await QRCode.toDataURL(routeUrl, {
                        width: 300,
                        margin: 2,
                        color: {
                          dark: '#00594A',
                          light: '#FFFFFF'
                        }
                      });
                      setQrCodeImage(qrDataUrl);
                      setShowQRCode(true);
                      setShowQRPrompt(false);
                    } catch (error) {
                      console.error('Error generating QR code:', error);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    background: '#00594A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#007763'}
                  onMouseOut={(e) => e.target.style.background = '#00594A'}
                >
                  Yes, Show QR
                </button>
                <button
                  onClick={() => setShowQRPrompt(false)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#f3f4f6';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                >
                  No Thanks
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowQRPrompt(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCode && !isMobile && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '240px',
            zIndex: 10001,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out',
            overflowY: 'auto'
          }}
          onClick={() => setShowQRCode(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '10px',
              padding: '12px',
              maxWidth: '240px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'scaleIn 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>📱</div>
            <h3 style={{
              margin: '0 0 2px 0',
              fontSize: '14px',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              Scan to Continue
            </h3>
            <p style={{
              margin: '0 0 8px 0',
              fontSize: '10px',
              color: '#6b7280'
            }}>
              Scan with your phone
            </p>
            
            {qrCodeImage && (
              <div style={{
                background: '#f9fafb',
                padding: '8px',
                borderRadius: '6px',
                marginBottom: '8px'
              }}>
                <img 
                  src={qrCodeImage} 
                  alt="Route QR Code"
                  style={{
                    width: '100%',
                    maxWidth: '140px',
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              </div>
            )}
            
            <div style={{
              background: '#f0fdf4',
              borderRadius: '4px',
              padding: '6px',
              marginBottom: '8px'
            }}>
              <div style={{
                fontSize: '9px',
                color: '#166534',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                📍 {destination}
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowQRCode(false);
                setShowQRPrompt(false);
              }}
              style={{
                width: '100%',
                padding: '6px',
                background: '#00594A',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#007763'}
              onMouseOut={(e) => e.target.style.background = '#00594A'}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Location Modal - Outside Campus */}
      {showLocationModal && locationModalType === 'outside' && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: isMobile ? '80px' : '230px',
            paddingLeft: isMobile ? '16px' : '0',
            paddingRight: isMobile ? '16px' : '0',
            zIndex: 10002,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out',
            overflowY: 'auto'
          }}
          onClick={() => setShowLocationModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '20px' : '24px',
              maxWidth: isMobile ? '100%' : '400px',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'scaleIn 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: isMobile ? '40px' : '48px', marginBottom: isMobile ? '12px' : '16px' }}>📍</div>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '700',
              color: '#DC2626'
            }}>
              You're Outside UDM Campus
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: isMobile ? '13px' : '14px',
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              We've detected that you are currently outside the Universidad de Manila campus. Your location marker has been placed at the <strong>Ground Floor Entrance</strong>.
            </p>
            <div style={{
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: isMobile ? '6px' : '8px',
              padding: isMobile ? '10px' : '12px',
              marginBottom: isMobile ? '16px' : '20px',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: isMobile ? '11px' : '12px',
                color: '#92400E',
                fontWeight: '500'
              }}>
                💡 <strong>Tip:</strong> Visit the campus to get accurate indoor navigation
              </div>
            </div>
            <button
              onClick={() => setShowLocationModal(false)}
              style={{
                width: '100%',
                padding: isMobile ? '10px' : '12px',
                background: '#00594A',
                color: 'white',
                border: 'none',
                borderRadius: isMobile ? '6px' : '8px',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#007763'}
              onMouseOut={(e) => e.target.style.background = '#00594A'}
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Location Modal - Inside Campus */}
      {showLocationModal && locationModalType === 'inside' && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: isMobile ? '80px' : '120px',
            paddingLeft: isMobile ? '16px' : '0',
            paddingRight: isMobile ? '16px' : '0',
            zIndex: 10002,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out',
            overflowY: 'auto'
          }}
          onClick={() => setShowLocationModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: isMobile ? '10px' : '12px',
              padding: isMobile ? '20px' : '24px',
              maxWidth: isMobile ? '100%' : '400px',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'scaleIn 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: isMobile ? '40px' : '48px', marginBottom: isMobile ? '12px' : '16px' }}>✅</div>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '700',
              color: '#059669'
            }}>
              You're Inside UDM Campus!
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: isMobile ? '13px' : '14px',
              color: '#6b7280',
              lineHeight: '1.6'
            }}>
              Great! We've successfully located you within the Universidad de Manila campus. Your current location is now marked on the map.
            </p>
            <div style={{
              background: '#D1FAE5',
              border: '1px solid #10B981',
              borderRadius: isMobile ? '6px' : '8px',
              padding: isMobile ? '10px' : '12px',
              marginBottom: isMobile ? '16px' : '20px',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: isMobile ? '11px' : '12px',
                color: '#065F46',
                fontWeight: '500'
              }}>
                🎯 <strong>Ready to navigate:</strong> Search for any location to get directions from your current position
              </div>
            </div>
            <button
              onClick={() => setShowLocationModal(false)}
              style={{
                width: '100%',
                padding: isMobile ? '10px' : '12px',
                background: '#00594A',
                color: 'white',
                border: 'none',
                borderRadius: isMobile ? '6px' : '8px',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#007763'}
              onMouseOut={(e) => e.target.style.background = '#00594A'}
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;
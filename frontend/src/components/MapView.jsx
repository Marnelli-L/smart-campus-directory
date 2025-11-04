import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as turf from '@turf/turf';
import { corridorPathfinder } from '../utils/corridorPathfinding';

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
        console.log('🔄 Map view reset to default');
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
            
            // Add accuracy circle
            mapRef.current.addLayer({
              id: 'user-location-accuracy',
              type: 'circle',
              source: 'user-location',
              paint: {
                'circle-radius': {
                  stops: [
                    [0, 0],
                    [20, accuracy * 0.8]
                  ],
                  base: 2
                },
                'circle-color': '#007cbf',
                'circle-opacity': 0.1,
                'circle-stroke-color': '#007cbf',
                'circle-stroke-width': 1,
                'circle-stroke-opacity': 0.3
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
              essential: true,
              duration: 1500
            });
          }
          
          console.log('📍 Location updated:', userLocation, 'Accuracy:', accuracy.toFixed(2), 'm');
        },
        (error) => {
          console.error('❌ Error tracking location:', error);
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
          maximumAge: 0 
        }
      );
      
      console.log('🎯 Started real-time location tracking');
    },
    stopLocationTracking: () => {
      // Stop watching location
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('⏹️ Stopped location tracking');
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
      if (mapRef.current && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = [position.coords.longitude, position.coords.latitude];
            
            // Add or update user location marker
            if (mapRef.current.getLayer('user-location')) {
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
              
              mapRef.current.addLayer({
                id: 'user-location',
                type: 'circle',
                source: 'user-location',
                paint: {
                  'circle-radius': 10,
                  'circle-color': '#007cbf',
                  'circle-stroke-color': '#fff',
                  'circle-stroke-width': 2
                }
              });
            }
            
            // Fly to user location
            mapRef.current.flyTo({
              center: userLocation,
              zoom: 18,
              essential: true
            });
            
            console.log('📍 User location:', userLocation);
          },
          (error) => {
            console.error('❌ Error getting user location:', error);
            alert('Unable to get your location. Please enable location services.');
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    }
  }));

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('🧹 Cleaned up location tracking on unmount');
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
      console.log('Container ref:', mapContainerRef.current);
      console.log('Existing map:', mapRef.current);
      
      if (mapContainerRef.current && !mapRef.current) {
        try {
          // Your Mapbox access token
          window.mapboxgl.accessToken = 'pk.eyJ1IjoibmVsbGlpaS0wMjYiLCJhIjoiY21naXVsZzRoMGRubDJsb3Y0b2E0M2R6aSJ9.eH1rbt1exyBhvY2ccAWK9w';
          
          console.log('🔑 Mapbox token set');
          
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
          console.log('🗺️ Mapbox loaded successfully!');
          console.log('🎯 Map center:', mapRef.current.getCenter());
          console.log('🔍 Map zoom:', mapRef.current.getZoom());
          
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
          console.error('❌ Error initializing map:', error);
        }
      }
    }

    async function addCampusGeoJSON(floorKey = 'ground') {
      if (!mapRef.current) return;
      try {
        console.log('📊 Loading GeoJSON data...');
        // Choose file based on floorKey
        let geojsonPath = '/images/smart-campus-map.geojson';
        if (floorKey === '2') {
          geojsonPath = '/images/2nd-floor-map.geojson';
        } else if (floorKey === '3') {
          geojsonPath = '/images/3rd-floor-map.geojson';
        } else if (floorKey === '4') {
          geojsonPath = '/images/4th-floor-map.geojson';
          console.log(`📂 Fetching GeoJSON for 4th floor: ${geojsonPath}`);
        }
        // Load your smart campus GeoJSON data for the requested floor
        const response = await fetch(geojsonPath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setGeojsonData(data); // Store GeoJSON data for searching
        setFloor(floorKey);
        console.log('✅ GeoJSON data loaded - ready for corridor pathfinding');
        console.log('🛤️ Will use ONLY white corridor LineStrings for navigation');
        console.log('🗺️ Loaded GeoJSON data:', data);
        console.log('📍 Features count:', data.features.length);

        // Initialize corridor-based A* pathfinding with floor information
        const pathfindingInitialized = corridorPathfinder.initialize(data, floorKey);
        if (pathfindingInitialized) {
          console.log(`✅ Corridor A* pathfinding initialized for floor: ${floorKey}`);
          
          // Add visualization of all walkable paths for debugging
          const walkablePaths = data.features.filter(f => f.geometry.type === 'LineString');
          console.log(`🛤️ Total walkable paths (LineStrings): ${walkablePaths.length}`);
          
          // Show sample paths
          if (walkablePaths.length > 0) {
            console.log('📋 Sample walkable paths:');
            walkablePaths.slice(0, 5).forEach((path, idx) => {
              const coords = path.geometry.coordinates;
              console.log(`  ${idx + 1}. ${coords.length} points, from [${coords[0][0].toFixed(6)}, ${coords[0][1].toFixed(6)}] to [${coords[coords.length-1][0].toFixed(6)}, ${coords[coords.length-1][1].toFixed(6)}]`);
            });
            
            // CRITICAL: Visualize ALL LineStrings on the map so we can see them
            if (mapRef.current.getSource('debug-corridors')) {
              mapRef.current.removeLayer('debug-corridors');
              mapRef.current.removeSource('debug-corridors');
            }
            
            mapRef.current.addSource('debug-corridors', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: walkablePaths
              }
            });
            
            mapRef.current.addLayer({
              id: 'debug-corridors',
              type: 'line',
              source: 'debug-corridors',
              paint: {
                'line-color': '#00ff00', // Bright green for visibility
                'line-width': 4,
                'line-opacity': 0.8
              }
            });
            
            console.log('✅ Added green lines showing ALL walkable corridors');
          }
        } else {
          console.warn('⚠️ Corridor pathfinding initialization failed');
        }

        // Manage building polygons source (replace data if exists)
        const buildingsData = {
          ...data,
          features: data.features.filter(f => f.geometry.type === 'Polygon')
        };
        
        console.log('🏗️ Building polygons:', buildingsData.features.length);
        console.log('📊 Polygons with names:', buildingsData.features.filter(f => f.properties.Name || f.properties.name).length);
        console.log('📝 Sample named polygons:', buildingsData.features
          .filter(f => f.properties.Name || f.properties.name)
          .slice(0, 5)
          .map(f => f.properties.Name || f.properties.name)
        );
        
        if (mapRef.current.getSource('campus-buildings')) {
          mapRef.current.getSource('campus-buildings').setData(buildingsData);
          console.log('✅ Updated campus-buildings source with new floor data');
        } else {
          mapRef.current.addSource('campus-buildings', { type: 'geojson', data: buildingsData });
          console.log('✅ Created campus-buildings source');
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
        
        console.log('📍 Created label points:', labelPoints.features.length);
        console.log('🔍 First 3 label points:', labelPoints.features.slice(0, 3).map(f => ({
          name: f.properties.Name,
          coords: f.geometry.coordinates
        })));
        
        if (mapRef.current.getSource('building-label-points')) {
          mapRef.current.getSource('building-label-points').setData(labelPoints);
          console.log('✅ Updated building-label-points source');
        } else {
          mapRef.current.addSource('building-label-points', { 
            type: 'geojson', 
            data: labelPoints 
          });
          console.log('✅ Created building-label-points source');
        }

        // Add paths/corridors FIRST (before buildings and labels for proper layering)
        const pathsData = 
        {
          ...data,
          features: data.features.filter(f => f.geometry.type === 'LineString')
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
          console.log('✅ Campus paths outline layer created (bottom layer)');
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
          console.log('✅ Campus paths/corridors layer created for pathfinding');
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
          console.log('🏷️ Creating building labels layer for the first time...');
          
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
          console.log('✅ Building labels layer created using POINT geometries!');
          console.log('📍 Labels should now be visible on 3rd floor');
          
          // Verify layer was created correctly
          setTimeout(() => {
            const layer = mapRef.current.getLayer('campus-buildings-labels');
            if (layer) {
              console.log('🔍 VERIFICATION - Layer exists:', layer.id);
              console.log('🔍 Layer type:', layer.type);
              console.log('🔍 Layer source:', layer.source);
              console.log('🔍 Layer visibility:', mapRef.current.getLayoutProperty('campus-buildings-labels', 'visibility'));
              
              // Check if source has data
              const source = mapRef.current.getSource('building-label-points');
              if (source && source._data) {
                console.log('🔍 Source has features:', source._data.features ? source._data.features.length : 'NO FEATURES');
                if (source._data.features && source._data.features.length > 0) {
                  console.log('🔍 First feature:', source._data.features[0]);
                }
              }
            } else {
              console.error('❌ Layer NOT FOUND after creation!');
            }
          }, 1000);
          console.log('� Layer will show labels for features with Name/name property');
        } else {
          console.log('� Labels layer already exists - it will auto-update with source data');
        }

        // Add room/office markers (labels removed, only clickable points with popups)
        if (markersRef.current && markersRef.current.length) {
          markersRef.current.forEach(m => m.remove());
          markersRef.current = [];
        }

        const pointFeatures = data.features.filter(f =>
          f.geometry.type === 'Point' && (f.properties.Name || f.properties.name)
        );

        // Set up the route function for this point feature
        animatedRouteRef.current = (coords, itemName) => {
          setRouteInfo(null); // Clear previous route info
          console.log('🧭 Navigating to:', itemName, 'at', coords);
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
            closeButton: true,
            className: 'campus-building-popup',
            maxWidth: '320px',
            anchor: 'bottom'
          }).setHTML(`
            <div style="padding: 0; font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-radius: 8px; overflow: hidden;">
              <!-- Header with accent color -->
              <div style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 14px 16px; border-bottom: 2px solid rgba(0,0,0,0.08);">
                <h3 style="margin: 0; color: white; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">
                  ${itemName}
                </h3>
              </div>
              
              <!-- Content section -->
              <div style="padding: 14px 16px; background: #fff;">
                <div style="font-size: 13px; color: #4b5563; line-height: 1.6;">
                  <div style="margin: 8px 0; display: flex; align-items: flex-start;">
                    <span style="color: #0f766e; font-weight: 600; min-width: 70px;">🏢 Building:</span>
                    <span style="color: #333; flex: 1;">${props.Building || props.building || 'Main Campus'}</span>
                  </div>
                  <div style="margin: 8px 0; display: flex; align-items: flex-start;">
                    <span style="color: #0f766e; font-weight: 600; min-width: 70px;">📍 Floor:</span>
                    <span style="color: #333; flex: 1;">${props.Floor || props.floor || 'Ground Floor'}</span>
                  </div>
                  <div style="margin: 8px 0; display: flex; align-items: flex-start;">
                    <span style="color: #0f766e; font-weight: 600; min-width: 70px;">🏷️ Type:</span>
                    <span style="color: #333; flex: 1;">${props.Type || props.type || 'Room'}</span>
                  </div>
                </div>
              </div>
              
              <!-- Navigation button -->
              <button id="navigate-btn-${itemName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')}" 
                style="
                  width: 100%;
                  padding: 12px 16px;
                  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
                  color: white;
                  border: none;
                  border-top: 1px solid rgba(0,0,0,0.08);
                  font-size: 14px;
                  font-weight: 600;
                  font-family: 'Open Sans', sans-serif;
                  letter-spacing: 0.3px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                "
                onmouseover="this.style.background='linear-gradient(135deg, #134e48 0%, #0d9488 100%)'; this.style.transform='translateY(-1px)';"
                onmouseout="this.style.background='linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)'; this.style.transform='translateY(0)';"
              >
                🧭 Navigate Here
              </button>
            </div>
          `).addTo(mapRef.current);
          
          // Add click handler for Navigate button
          setTimeout(() => {
            const navBtn = document.getElementById(`navigate-btn-${itemName.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '')}`);
            if (navBtn) {
              navBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Trigger search with the building name
                const searchInput = document.querySelector('input[placeholder*="Search"]') || 
                                   document.querySelector('input[type="search"]');
                if (searchInput) {
                  searchInput.value = itemName;
                  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                  // Close popup
                  popup.remove();
                } else {
                  console.log('🧭 Navigate to:', itemName);
                  // Fallback: center map on this location
                  if (e.lngLat) {
                    mapRef.current.flyTo({
                      center: e.lngLat,
                      zoom: 19,
                      duration: 1000
                    });
                  }
                }
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
        console.error('❌ Error loading GeoJSON:', error);
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
          <span style="color: #555;">Gardens 🌿</span>
        </div>
        <div style="display: flex; align-items: center; margin: 8px 0 4px 0;">
          <div style="width: 16px; height: 3px; background: #ffffff; border: 1px solid #757575; margin-right: 8px;"></div>
          <span style="color: #555; font-size: 11px;">� Pathways</span>
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



  // Handle destination changes with animated pathfinding
  useEffect(() => {
    // Enhanced destination search with fuzzy matching (Google Maps style)
    const findDestination = (searchTerm) => {
      if (!geojsonData || !searchTerm) return null;
      
      const normalizedSearch = searchTerm.toLowerCase().trim();
      
      // Get all point features (rooms, offices, etc.)
      const pointFeatures = geojsonData.features.filter(f => 
        f.geometry.type === 'Point' && (f.properties.Name || f.properties.name)
      );
      
      console.log(`🔍 Searching for: "${searchTerm}" in ${pointFeatures.length} locations`);
      
      // 1. Try exact match (case-insensitive)
      let match = pointFeatures.find(f => {
        const itemName = (f.properties.Name || f.properties.name || '').toLowerCase();
        return itemName === normalizedSearch;
      });
      
      if (match) {
        console.log('✅ Exact match found:', match.properties.Name || match.properties.name);
        return match;
      }
      
      // 2. Try starts-with match
      match = pointFeatures.find(f => {
        const itemName = (f.properties.Name || f.properties.name || '').toLowerCase();
        return itemName.startsWith(normalizedSearch);
      });
      
      if (match) {
        console.log('✅ Starts-with match found:', match.properties.Name || match.properties.name);
        return match;
      }
      
      // 3. Try contains match
      match = pointFeatures.find(f => {
        const itemName = (f.properties.Name || f.properties.name || '').toLowerCase();
        return itemName.includes(normalizedSearch);
      });
      
      if (match) {
        console.log('✅ Contains match found:', match.properties.Name || match.properties.name);
        return match;
      }
      
      // 4. Try reverse contains (search contains item name)
      match = pointFeatures.find(f => {
        const itemName = (f.properties.Name || f.properties.name || '').toLowerCase();
        return normalizedSearch.includes(itemName);
      });
      
      if (match) {
        console.log('✅ Reverse match found:', match.properties.Name || match.properties.name);
        return match;
      }
      
      // 5. Try word-by-word fuzzy match (for multi-word searches)
      const searchWords = normalizedSearch.split(/\s+/);
      match = pointFeatures.find(f => {
        const itemName = (f.properties.Name || f.properties.name || '').toLowerCase();
        const itemWords = itemName.split(/\s+/);
        
        // Check if any search word matches any item word
        return searchWords.some(searchWord => 
          itemWords.some(itemWord => 
            itemWord.includes(searchWord) || searchWord.includes(itemWord)
          )
        );
      });
      
      if (match) {
        console.log('✅ Fuzzy match found:', match.properties.Name || match.properties.name);
        return match;
      }
      
      // 6. Try building/type match
      match = pointFeatures.find(f => {
        const building = (f.properties.Building || '').toLowerCase();
        const type = (f.properties.Type || '').toLowerCase();
        return building.includes(normalizedSearch) || 
               type.includes(normalizedSearch) ||
               normalizedSearch.includes(building) ||
               normalizedSearch.includes(type);
      });
      
      if (match) {
        console.log('✅ Building/Type match found:', match.properties.Name || match.properties.name);
        return match;
      }
      
      console.warn(`⚠️ No match found for: "${searchTerm}"`);
      return null;
    };

    // SM Kiosk-style animated pathfinding
    function addAnimatedRoute(destinationName) {
      console.log('🎯 addAnimatedRoute called with:', destinationName);
      
      if (!mapRef.current) {
        console.error('❌ No map reference');
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
          console.log('✅ Found "You Are Here" in GeoJSON:', entrancePoint);
        } else {
          console.log('✅ Using exact "You Are Here" coordinates from GeoJSON:', entrancePoint);
        }
      }
      
      // Find destination coordinates from GeoJSON data
      const foundDestination = findDestination(destinationName);
      let destinationCoords;
      let destinationInfo = {};
      
      if (foundDestination) {
        destinationCoords = foundDestination.geometry.coordinates;
        destinationInfo = {
          name: foundDestination.properties.Name || foundDestination.properties.name,
          building: foundDestination.properties.Building || 'Unknown Building',
          floor: foundDestination.properties.Floor || 'Ground Floor',
          type: foundDestination.properties.Type || 'Location'
        };
        console.log('✅ Found destination in GeoJSON:', destinationInfo.name);
        console.log('📍 Location:', destinationCoords);
        console.log('🏢 Building:', destinationInfo.building);
        console.log('🏗️ Floor:', destinationInfo.floor);
        console.log('📌 Type:', destinationInfo.type);
      } else {
        console.warn(`⚠️ "${destinationName}" not found in GeoJSON - using fallback`);
        // Fallback to hardcoded destinations if not found in GeoJSON
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
        console.log('📍 Using fallback coordinates:', destinationCoords);
      }
      console.log('🎯 === CREATING ROUTE ===');
      console.log('📍 Start point (entrance):', entrancePoint);
      console.log('📍 End point (destination):', destinationCoords);
      console.log('🎯 Destination:', destinationInfo.name);
      
      // Use corridor-based A* pathfinding (only follows LineString paths)
      console.log('🔄 Running A* pathfinding algorithm...');
      const pathfindingResult = corridorPathfinder.findRoute(entrancePoint, destinationCoords);
      
      // DEBUG: Log the actual pathfinding result
      console.log('🔍 PATHFINDING RESULT:', pathfindingResult);
      console.log('🔍 Result valid:', pathfindingResult.valid);
      console.log('🔍 Result path length:', pathfindingResult.path?.length);
      console.log('🔍 First 3 points:', pathfindingResult.path?.slice(0, 3));
      console.log('🔍 Last 3 points:', pathfindingResult.path?.slice(-3));
      
      const routePath = pathfindingResult.path;
      const routeMetadata = {
        distance: pathfindingResult.distance,
        waypoints: pathfindingResult.waypoints,
        nodeCount: pathfindingResult.nodeCount,
        isValid: pathfindingResult.valid,
        followsCorridors: pathfindingResult.valid,
        destination: destinationInfo
      };
      
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
        console.log('✅ A* CORRIDOR PATH FOUND!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🎯 Destination: ${destinationInfo.name}`);
        console.log(`🏢 Building: ${destinationInfo.building}`);
        console.log(`🏗️ Floor: ${destinationInfo.floor}`);
        console.log(`📏 Distance: ${pathfindingResult.distance.toFixed(1)} meters`);
        console.log(`⏱️ Est. Time: ${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''}`);
        console.log(`🛤️ Waypoints: ${routePath.length} points`);
        console.log(`🔗 Nodes: ${pathfindingResult.nodeCount} corridor segments`);
        console.log('✅ Route follows corridors only - NO building overlap');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        // Enforce corridor-only routing: do NOT draw straight fallback lines
        console.warn('⚠️ No corridor path found. Route will not be drawn because we only allow paths along LineStrings.');
        console.log(`📏 Direct distance (not used): ${pathfindingResult.distance.toFixed(1)} meters`);
      }
      
      console.log('🎯 === END ROUTE CREATION ===');
      // Clear existing route first
      clearAnimatedRoute();
      // Add entrance marker
      addEntranceMarker(entrancePoint);
      // Add destination marker (Google Maps style)
      addDestinationMarker(destinationCoords, destinationInfo);
      // Only add route line if we have a valid corridor path
      if (pathfindingResult.valid && routePath && routePath.length > 1) {
        animateRouteLine(routePath, routeMetadata);
      } else {
        console.log('⚠️ No route line drawn (no valid corridor path)');
      }
    }
    function addEntranceMarker(coords) {
      console.log('📍 Adding entrance marker at:', coords);
      
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
        markerCircle.innerHTML = '●';
        
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
        
        console.log('📍 Creating marker element with precise positioning');
        const marker = new window.mapboxgl.Marker({ 
          element: entranceEl,
          anchor: 'bottom',
          offset: [0, 8]
        })
        .setLngLat(coords)
        .addTo(mapRef.current);
        
        console.log('✅ Entrance marker added successfully with system theme');
        return marker;
        
      } catch (error) {
        console.error('❌ Error adding entrance marker:', error);
      }
    }

    function addDestinationMarker(coords, destinationInfo) {
      console.log('🎯 Adding destination marker at:', coords);
      console.log('📍 Destination:', destinationInfo);
      
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
        subLabel.textContent = `${destinationInfo.building || 'Building'} • ${destinationInfo.floor || 'Floor'}`;
        
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
          closeButton: true,
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
        
        console.log('✅ Destination marker added successfully');
        return marker;
        
      } catch (error) {
        console.error('❌ Error adding destination marker:', error);
      }
    }

    function animateRouteLine(pathCoords, metadata = {}) {
      console.log('🎨 Creating enhanced animated route with coords:', pathCoords);
      console.log('📊 Route metadata:', metadata);
      
      try {
        // Check if map is ready
        if (!mapRef.current.isStyleLoaded || !mapRef.current.isStyleLoaded()) {
          console.log('⏳ Map style not loaded, retrying in 500ms');
          setTimeout(() => animateRouteLine(pathCoords), 500);
          return;
        }

        console.log('✅ Map style loaded, creating animated route');

        // Add route source with full path
        mapRef.current.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: pathCoords
            }
          }
        });

        // Add outer glow effect (system theme color)
        mapRef.current.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': '#00695C',
            'line-width': 14,
            'line-opacity': 0.3,
            'line-blur': 6
          }
        });

        // Add middle glow layer
        mapRef.current.addLayer({
          id: 'route-glow-mid',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': '#00695C',
            'line-width': 10,
            'line-opacity': 0.5,
            'line-blur': 3
          }
        });

        // Main route line (bold and visible)
        mapRef.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': '#00695C',
            'line-width': 6,
            'line-opacity': 0.95
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          }
        });

        // Add white inner line for contrast
        mapRef.current.addLayer({
          id: 'route-line-inner',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 2,
            'line-opacity': 0.6
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          }
        });

        // Add animated dots moving along the path
        let animationStep = 0;
        const animateMovingDot = () => {
          const step = (animationStep % 100) / 100;
          
          if (!mapRef.current.getSource('route-animation')) {
            mapRef.current.addSource('route-animation', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Point',
                  coordinates: interpolateAlongPath(pathCoords, step)
                }
              }
            });
          } else {
            mapRef.current.getSource('route-animation').setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Point',
                coordinates: interpolateAlongPath(pathCoords, step)
              }
            });
          }

          if (!mapRef.current.getLayer('route-animation')) {
            mapRef.current.addLayer({
              id: 'route-animation',
              type: 'circle',
              source: 'route-animation',
              paint: {
                'circle-radius': 8,
                'circle-color': '#FFFFFF',
                'circle-stroke-color': '#00695C',
                'circle-stroke-width': 3,
                'circle-opacity': 1
              }
            });
          }

          animationStep += 2;
          if (mapRef.current.getLayer('route-animation')) {
            requestAnimationFrame(animateMovingDot);
          }
        };

        // Start animation
        animateMovingDot();

        console.log('✅ Professional animated route created with system theme');

      } catch (error) {
        console.error('❌ Error creating animated route:', error);
      }
    }

    // Helper function to interpolate along path
    function interpolateAlongPath(coords, t) {
      if (coords.length < 2) return coords[0] || [0, 0];
      
      const totalSegments = coords.length - 1;
      const segmentIndex = Math.floor(t * totalSegments);
      const segmentT = (t * totalSegments) - segmentIndex;
      
      const start = coords[Math.min(segmentIndex, coords.length - 2)];
      const end = coords[Math.min(segmentIndex + 1, coords.length - 1)];
      
      return [
        start[0] + (end[0] - start[0]) * segmentT,
        start[1] + (end[1] - start[1]) * segmentT
      ];
    }



    function clearAnimatedRoute() {
      if (!mapRef.current) return;
      
      try {
        // Remove existing route layers safely
        ['route-line', 'route-line-inner', 'route-glow', 'route-glow-mid', 'route-animation'].forEach(layerId => {
          if (mapRef.current.getLayer && mapRef.current.getLayer(layerId)) {
            mapRef.current.removeLayer(layerId);
          }
        });
        
        // Remove route sources safely
        ['route-line', 'route-animation'].forEach(sourceId => {
          if (mapRef.current.getSource && mapRef.current.getSource(sourceId)) {
            mapRef.current.removeSource(sourceId);
          }
        });
        
        // Remove entrance marker safely
        const existingEntranceMarkers = document.querySelectorAll('#entrance-marker');
        existingEntranceMarkers.forEach(marker => marker.remove());
        
        // Remove destination marker safely
        const existingDestMarkers = document.querySelectorAll('#destination-marker');
        existingDestMarkers.forEach(marker => marker.remove());
        
      } catch (error) {
        console.warn('Error clearing animated route:', error);
      }
    }

    // Execute the routing logic
    if (destination && mapRef.current && mapLoaded) {
      console.log('🎯 Starting navigation to:', destination);
      console.log('Map ready:', !!mapRef.current);
      console.log('Map loaded:', mapLoaded);
      
      try {
        addAnimatedRoute(destination);
      } catch (error) {
        console.error('Error in animated route:', error);
      }
    } else if (mapRef.current && mapLoaded) {
      console.log('🧹 Clearing routes');
      try {
        clearAnimatedRoute();
        setRouteInfo(null); // Clear route information
      } catch (error) {
        console.error('Error clearing route:', error);
      }
    }
  }, [destination, mapLoaded, geojsonData]);

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
          🎯 Showing: <strong>{destination}</strong>
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
                    <span style={{ fontSize: '14px' }}>📏</span>
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
                    <span style={{ fontSize: '14px' }}>⏱️</span>
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
                    <span style={{ fontSize: '14px' }}>🏢</span>
                    <span>Floors</span>
                  </div>
                  <span style={{ 
                    color: '#00695C', 
                    fontWeight: '700',
                    fontSize: '11px'
                  }}>{routeInfo.floors.map(f => {
                    if (f === 'ground' || f === 'G' || f === '1') return 'GF';
                    return f === '2' ? '2F' : f === '3' ? '3F' : f === '4' ? '4F' : f + 'F';
                  }).join(' → ')}</span>
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
          <div>🗺️ Loading Mapbox...</div>
        </div>
      )}


    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;

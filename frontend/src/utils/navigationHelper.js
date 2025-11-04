/**
 * Navigation Helper - Simplified routing utilities for Google Maps-style navigation
 */
import * as turf from '@turf/turf';

/**
 * Find and draw a route between two points on the map
 * @param {Array} startCoords - [longitude, latitude] starting point
 * @param {Array} endCoords - [longitude, latitude] destination point
 * @param {Array} corridorFeatures - GeoJSON features containing LineString corridors
 * @returns {Object} Route information with path coordinates and distance
 */
export function calculateRoute(startCoords, endCoords, corridorFeatures = []) {
  console.log('🗺️ Calculating route...');
  console.log('  Start:', startCoords);
  console.log('  End:', endCoords);
  
  if (!startCoords || !endCoords) {
    return {
      success: false,
      error: 'Missing coordinates'
    };
  }

  // Filter for LineString corridors
  const corridors = corridorFeatures.filter(f => 
    f?.geometry?.type === 'LineString'
  );

  console.log(`  Found ${corridors.length} corridor paths`);

  if (corridors.length === 0) {
    // No corridors available - return direct line
    const distance = turf.distance(
      turf.point(startCoords),
      turf.point(endCoords),
      { units: 'meters' }
    );
    
    return {
      success: true,
      path: [startCoords, endCoords],
      distance: distance,
      waypoints: 2,
      isDirect: true
    };
  }

  // Find best corridor (closest to both start and end)
  let bestCorridor = null;
  let bestScore = Infinity;

  corridors.forEach(corridor => {
    try {
      const line = turf.lineString(corridor.geometry.coordinates);
      const startSnap = turf.nearestPointOnLine(line, turf.point(startCoords));
      const endSnap = turf.nearestPointOnLine(line, turf.point(endCoords));
      
      // Score is average distance (in meters)
      const score = (startSnap.properties.dist + endSnap.properties.dist) * 500; // Convert km to m
      
      if (score < bestScore) {
        bestScore = score;
        bestCorridor = corridor;
      }
    } catch {
      // Skip invalid corridors
    }
  });

  if (!bestCorridor) {
    // Fallback to direct line
    const distance = turf.distance(
      turf.point(startCoords),
      turf.point(endCoords),
      { units: 'meters' }
    );
    
    return {
      success: true,
      path: [startCoords, endCoords],
      distance: distance,
      waypoints: 2,
      isDirect: true
    };
  }

  try {
    // Snap points to corridor
    const line = turf.lineString(bestCorridor.geometry.coordinates);
    const startSnap = turf.nearestPointOnLine(line, turf.point(startCoords));
    const endSnap = turf.nearestPointOnLine(line, turf.point(endCoords));

    // Slice corridor between snapped points
    const segment = turf.lineSlice(startSnap, endSnap, line);

    // Build full path
    const pathCoords = [
      startCoords,
      startSnap.geometry.coordinates,
      ...segment.geometry.coordinates,
      endSnap.geometry.coordinates,
      endCoords
    ];

    // Remove duplicate consecutive points
    const cleanPath = [];
    for (let i = 0; i < pathCoords.length; i++) {
      if (i === 0 ||
          pathCoords[i][0] !== pathCoords[i-1][0] ||
          pathCoords[i][1] !== pathCoords[i-1][1]) {
        cleanPath.push(pathCoords[i]);
      }
    }

    // Calculate distance
    const pathLine = turf.lineString(cleanPath);
    const distance = turf.length(pathLine, { units: 'meters' });

    console.log(`✅ Route calculated: ${cleanPath.length} points, ${distance.toFixed(1)}m`);

    return {
      success: true,
      path: cleanPath,
      distance: distance,
      waypoints: cleanPath.length,
      corridorName: bestCorridor.properties?.Name || 'corridor'
    };
  } catch (error) {
    console.error('Error building route:', error);
    
    // Fallback
    const distance = turf.distance(
      turf.point(startCoords),
      turf.point(endCoords),
      { units: 'meters' }
    );
    
    return {
      success: true,
      path: [startCoords, endCoords],
      distance: distance,
      waypoints: 2,
      isDirect: true,
      error: error.message
    };
  }
}

/**
 * Draw a route line on the Mapbox map
 * @param {Object} map - Mapbox GL JS map instance
 * @param {Array} path - Array of [lng, lat] coordinates
 */
export function drawNavigationLine(map, path) {
  if (!map || !path || path.length < 2) {
    console.warn('Cannot draw navigation line: invalid map or path');
    return;
  }

  const source = map.getSource('navigation-route');
  if (!source) {
    console.warn('Navigation route source not found on map');
    return;
  }

  // Update the route line
  source.setData({
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: path
    }
  });

  console.log(`✅ Drew navigation line with ${path.length} points`);

  // Fit map to show full route
  if (path.length >= 2) {
    const bounds = path.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new window.mapboxgl.LngLatBounds(path[0], path[0]));

    map.fitBounds(bounds, {
      padding: 80,
      duration: 1200
    });
  }
}

/**
 * Clear the navigation line from the map
 * @param {Object} map - Mapbox GL JS map instance
 */
export function clearNavigationLine(map) {
  if (!map) return;

  const source = map.getSource('navigation-route');
  if (source) {
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: []
      }
    });
    console.log('🧹 Cleared navigation line');
  }
}

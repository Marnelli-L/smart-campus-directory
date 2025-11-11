/**
 * Advanced A* Pathfinding for Indoor Navigation
 * Google Maps-style routing with turn-by-turn directions
 */
import * as turf from '@turf/turf';

// Graph node for A* pathfinding with floor support
class PathNode {
  constructor(coords, id = null, floor = null) {
    this.coords = coords; // [lng, lat]
    this.floor = floor; // Floor identifier (F1, F2, F3, F4)
    this.id = id || `${coords[0]},${coords[1]},${floor || 'F1'}`;
    this.neighbors = []; // Array of {node, distance, isStair}
    this.g = Infinity; // Cost from start
    this.h = 0; // Heuristic to goal
    this.f = Infinity; // Total cost (g + h)
    this.parent = null;
  }
}

/**
 * Build a multi-floor navigation graph with stair connections
 */
function buildMultiFloorGraph(allFloorsFeatures) {
  const nodeMap = new Map();
  const stairLocations = []; // Store stair positions for cross-floor connections
  
  const getOrCreateNode = (coords, floor) => {
    const key = `${coords[0].toFixed(7)},${coords[1].toFixed(7)},${floor}`;
    if (!nodeMap.has(key)) {
      nodeMap.set(key, new PathNode(coords, key, floor));
    }
    return nodeMap.get(key);
  };

  // Process each floor
  Object.entries(allFloorsFeatures).forEach(([floor, features]) => {
    console.log(`  Processing ${floor}...`);
    
    // Filter corridors
    const corridors = features.filter(f => {
      if (f?.geometry?.type !== 'LineString') return false;
      const props = f.properties || {};
      if (props.Type === 'corridor' || props.type === 'corridor' ||
          props.Corridor || props.corridor) return true;
      const hasType = props.Type || props.type;
      if (hasType && hasType.toLowerCase() !== 'corridor') return false;
      return true;
    });
    
    // Build corridor graph for this floor
    corridors.forEach(corridor => {
      const coords = corridor.geometry.coordinates;
      for (let i = 0; i < coords.length - 1; i++) {
        const node1 = getOrCreateNode(coords[i], floor);
        const node2 = getOrCreateNode(coords[i + 1], floor);
        const distance = turf.distance(
          turf.point(coords[i]),
          turf.point(coords[i + 1]),
          { units: 'meters' }
        );
        
        if (!node1.neighbors.some(n => n.node.id === node2.id)) {
          node1.neighbors.push({ node: node2, distance, isStair: false });
        }
        if (!node2.neighbors.some(n => n.node.id === node1.id)) {
          node2.neighbors.push({ node: node1, distance, isStair: false });
        }
      }
    });
    
    // Find stairs on this floor
    const stairs = features.filter(f => {
      const props = f.properties || {};
      const type = (props.Type || props.type || '').toLowerCase();
      const name = (props.Name || props.name || '').toLowerCase();
      return type === 'stairs' || type === 'stair' || 
             name.includes('stair') || name === 'stairs';
    });
    
    stairs.forEach(stair => {
      const coords = stair.geometry.type === 'Point' 
        ? stair.geometry.coordinates 
        : turf.centroid(stair).geometry.coordinates;
      
      stairLocations.push({
        coords,
        floor,
        name: stair.properties.Name || stair.properties.name || 'Stairs'
      });
    });
    
    console.log(`    Found ${corridors.length} corridors, ${stairs.length} stairs`);
  });

  // Add cross-connections within each floor
  const CROSS_CONNECTION_THRESHOLD = 3.0;
  console.log(`  Adding cross-connections...`);
  let crossConnections = 0;
  
  const nodesByFloor = new Map();
  nodeMap.forEach(node => {
    if (!nodesByFloor.has(node.floor)) {
      nodesByFloor.set(node.floor, []);
    }
    nodesByFloor.get(node.floor).push(node);
  });
  
  nodesByFloor.forEach((nodes) => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        if (node1.neighbors.some(n => n.node.id === node2.id)) continue;
        
        const distance = turf.distance(
          turf.point(node1.coords),
          turf.point(node2.coords),
          { units: 'meters' }
        );
        
        if (distance <= CROSS_CONNECTION_THRESHOLD && distance > 0.1) {
          node1.neighbors.push({ node: node2, distance, isStair: false });
          node2.neighbors.push({ node: node1, distance, isStair: false });
          crossConnections++;
        }
      }
    }
  });
  
  console.log(`    Added ${crossConnections} cross-connections`);

  // Connect stairs between floors
  const STAIR_CONNECTION_THRESHOLD = 5.0; // Stairs within 5m on different floors connect
  let stairConnections = 0;
  
  for (let i = 0; i < stairLocations.length; i++) {
    for (let j = i + 1; j < stairLocations.length; j++) {
      const stair1 = stairLocations[i];
      const stair2 = stairLocations[j];
      
      // Only connect stairs on different floors
      if (stair1.floor === stair2.floor) continue;
      
      const distance = turf.distance(
        turf.point(stair1.coords),
        turf.point(stair2.coords),
        { units: 'meters' }
      );
      
      if (distance <= STAIR_CONNECTION_THRESHOLD) {
        // Find nearest corridor nodes to each stair
        const nodes1 = nodesByFloor.get(stair1.floor) || [];
        const nodes2 = nodesByFloor.get(stair2.floor) || [];
        
        let nearestNode1 = null;
        let nearestNode2 = null;
        let minDist1 = Infinity;
        let minDist2 = Infinity;
        
        nodes1.forEach(node => {
          const d = turf.distance(turf.point(node.coords), turf.point(stair1.coords), { units: 'meters' });
          if (d < minDist1) {
            minDist1 = d;
            nearestNode1 = node;
          }
        });
        
        nodes2.forEach(node => {
          const d = turf.distance(turf.point(node.coords), turf.point(stair2.coords), { units: 'meters' });
          if (d < minDist2) {
            minDist2 = d;
            nearestNode2 = node;
          }
        });
        
        // Connect the nearest corridor nodes via stairs
        if (nearestNode1 && nearestNode2 && minDist1 < 20 && minDist2 < 20) {
          const stairDistance = 5.0; // Fixed cost for using stairs
          nearestNode1.neighbors.push({ 
            node: nearestNode2, 
            distance: stairDistance + minDist1 + minDist2,
            isStair: true,
            stairName: stair1.name
          });
          nearestNode2.neighbors.push({ 
            node: nearestNode1, 
            distance: stairDistance + minDist1 + minDist2,
            isStair: true,
            stairName: stair2.name
          });
          stairConnections++;
          console.log(`    Connected ${stair1.floor} ↔ ${stair2.floor} via ${stair1.name}`);
        }
      }
    }
  }
  
  console.log(`  Added ${stairConnections} stair connections`);

  return { nodeMap, stairLocations };
}

/**
 * Build a navigation graph from corridor features with cross-connections
 * (Single floor version - kept for backward compatibility)
 */
function buildNavigationGraph(corridors) {
  const nodeMap = new Map();
  const getOrCreateNode = (coords) => {
    const key = `${coords[0].toFixed(7)},${coords[1].toFixed(7)}`;
    if (!nodeMap.has(key)) {
      nodeMap.set(key, new PathNode(coords, key));
    }
    return nodeMap.get(key);
  };

  // Build graph from corridors
  corridors.forEach(corridor => {
    const coords = corridor.geometry.coordinates;
    
    // Create nodes for each segment
    for (let i = 0; i < coords.length - 1; i++) {
      const node1 = getOrCreateNode(coords[i]);
      const node2 = getOrCreateNode(coords[i + 1]);
      
      const distance = turf.distance(
        turf.point(coords[i]),
        turf.point(coords[i + 1]),
        { units: 'meters' }
      );
      
      // Bidirectional edges
      if (!node1.neighbors.some(n => n.node.id === node2.id)) {
        node1.neighbors.push({ node: node2, distance });
      }
      if (!node2.neighbors.some(n => n.node.id === node1.id)) {
        node2.neighbors.push({ node: node1, distance });
      }
    }
  });

  // Add cross-connections for nearby nodes (corridor intersections)
  // This creates shortcuts through the graph for more direct routing
  const CROSS_CONNECTION_THRESHOLD = 5.0; // Increased from 3.0 for better connections
  const nodes = Array.from(nodeMap.values());
  
  console.log(`  Adding cross-connections between nearby nodes...`);
  let crossConnections = 0;
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      
      // Skip if already neighbors
      if (node1.neighbors.some(n => n.node.id === node2.id)) continue;
      
      const distance = turf.distance(
        turf.point(node1.coords),
        turf.point(node2.coords),
        { units: 'meters' }
      );
      
      // Create cross-connection for nearby nodes (hallway intersections)
      if (distance <= CROSS_CONNECTION_THRESHOLD && distance > 0.1) {
        node1.neighbors.push({ node: node2, distance, isStair: false });
        node2.neighbors.push({ node: node1, distance, isStair: false });
        crossConnections++;
      }
    }
  }
  
  console.log(`  Added ${crossConnections} cross-connections for shortcuts`);

  return nodeMap;
}

/**
 * Reset all nodes for a fresh A* search
 */
function resetNodes(nodeMap) {
  nodeMap.forEach(node => {
    node.g = Infinity;
    node.h = 0;
    node.f = Infinity;
    node.parent = null;
  });
}

/**
 * A* pathfinding algorithm with optimized heuristic
 * Uses priority queue and proper node reset for accurate shortest path
 */
function astar(startNode, endNode, nodeMap) {
  // Reset all nodes before search
  resetNodes(nodeMap);
  
  const openSet = [startNode];
  const closedSet = new Set();
  const openSetIds = new Set([startNode.id]);
  
  startNode.g = 0;
  startNode.h = turf.distance(
    turf.point(startNode.coords),
    turf.point(endNode.coords),
    { units: 'meters' }
  );
  startNode.f = startNode.h;

  while (openSet.length > 0) {
    // Find node with lowest f score (most promising path)
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    openSetIds.delete(current.id);

    // Goal reached - reconstruct path
    if (current.id === endNode.id) {
      const path = [];
      let node = current;
      while (node) {
        path.unshift(node.coords);
        node = node.parent;
      }
      return { found: true, path, distance: current.g };
    }

    closedSet.add(current.id);

    // Explore all neighbors
    for (const { node: neighbor, distance } of current.neighbors) {
      if (closedSet.has(neighbor.id)) continue;

      const tentativeG = current.g + distance;

      // Only update if this is a better path
      if (tentativeG < neighbor.g) {
        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.h = turf.distance(
          turf.point(neighbor.coords),
          turf.point(endNode.coords),
          { units: 'meters' }
        );
        neighbor.f = neighbor.g + neighbor.h;

        if (!openSetIds.has(neighbor.id)) {
          openSet.push(neighbor);
          openSetIds.add(neighbor.id);
        }
      }
    }
  }

  return { found: false, path: [], distance: 0 };
}

/**
 * Simplify path by removing unnecessary intermediate points
 * Uses Douglas-Peucker-like algorithm to keep only essential waypoints
 * DISABLED: Keeping all corridor nodes to prevent routes from leaving corridors
 */
// eslint-disable-next-line no-unused-vars
function simplifyPath(path, tolerance = 2.0) {
  if (path.length <= 2) return path;
  
  const simplified = [path[0]]; // Always keep start point
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const current = path[i];
    const next = path[i + 1];
    
    // Check if current point is necessary
    // Create a line from prev to next and see if current is far from it
    const line = turf.lineString([prev, next]);
    const point = turf.point(current);
    const distance = turf.pointToLineDistance(point, line, { units: 'meters' });
    
    // Keep point if it's far from the direct line OR if there's a significant direction change
    if (distance > tolerance) {
      simplified.push(current);
    } else {
      // Check for direction change
      const bearing1 = turf.bearing(turf.point(prev), turf.point(current));
      const bearing2 = turf.bearing(turf.point(current), turf.point(next));
      let angleDiff = Math.abs(bearing2 - bearing1);
      if (angleDiff > 180) angleDiff = 360 - angleDiff;
      
      // Keep if significant turn (> 20 degrees)
      if (angleDiff > 20) {
        simplified.push(current);
      }
    }
  }
  
  simplified.push(path[path.length - 1]); // Always keep end point
  
  console.log(`  Path simplified: ${path.length} → ${simplified.length} points`);
  return simplified;
}

/**
 * Generate enhanced turn-by-turn directions with clear instructions
 */
function generateDirections(path) {
  if (path.length < 2) return [];

  const directions = [];
  const threshold = 15; // degrees for considering a turn
  const sharpTurnThreshold = 70; // degrees for sharp turns
  
  let cumulativeDistance = 0;

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];

    // Calculate bearings
    const bearing1 = turf.bearing(turf.point(prev), turf.point(current));
    const bearing2 = turf.bearing(turf.point(current), turf.point(next));
    
    let angleDiff = bearing2 - bearing1;
    
    // Normalize angle to -180 to 180
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;

    const distance = turf.distance(
      turf.point(current),
      turf.point(next),
      { units: 'meters' }
    );
    
    cumulativeDistance += distance;

    // Determine instruction based on angle
    let instruction = '';
    let type = '';
    let icon = '';
    
    const absAngle = Math.abs(angleDiff);
    
    if (absAngle < threshold) {
      type = 'straight';
      icon = '↑';
      instruction = `Continue straight for ${distance.toFixed(0)}m`;
    } else if (absAngle > sharpTurnThreshold) {
      // Sharp turn
      if (angleDiff > 0) {
        type = 'sharp-right';
        icon = '↱';
        instruction = `Make a sharp right turn and continue for ${distance.toFixed(0)}m`;
      } else {
        type = 'sharp-left';
        icon = '↰';
        instruction = `Make a sharp left turn and continue for ${distance.toFixed(0)}m`;
      }
    } else {
      // Normal turn
      if (angleDiff > 0) {
        type = 'right';
        icon = '→';
        instruction = `Turn right and continue for ${distance.toFixed(0)}m`;
      } else {
        type = 'left';
        icon = '←';
        instruction = `Turn left and continue for ${distance.toFixed(0)}m`;
      }
    }

    directions.push({
      type,
      icon,
      instruction,
      voiceInstruction: instruction.replace(/(\d+)m/, '$1 meters'), // Voice-ready
      coords: current,
      distance: distance,
      cumulativeDistance: cumulativeDistance,
      angle: angleDiff,
      step: directions.length + 1
    });
  }

  return directions;
}

/**
 * Find a route using A* pathfinding algorithm (Google Maps style)
 * @param {Array} startCoords - [longitude, latitude] starting point
 * @param {Array} endCoords - [longitude, latitude] destination point
 * @param {Array} features - GeoJSON features containing corridor LineStrings
 * @returns {Object} Route information with path, distance, directions, and validity
 */
export function findSimpleRoute(startCoords, endCoords, features = []) {
  console.log('🗺️ Finding route with A* pathfinding...');
  console.log('  Start:', startCoords);
  console.log('  End:', endCoords);
  
  if (!startCoords || !endCoords || startCoords.length !== 2 || endCoords.length !== 2) {
    return {
      valid: false,
      path: [],
      distance: 0,
      waypoints: 0,
      floors: [],
      directions: [],
      error: 'Invalid coordinates'
    };
  }

  // Filter for LineString corridors
  // Accept LineStrings that are marked as corridors OR have no type/are unnamed (likely corridors)
  const corridors = features.filter(f => {
    if (f?.geometry?.type !== 'LineString') return false;
    
    const props = f.properties || {};
    
    // Explicitly marked as corridor
    if (props.Type === 'corridor' || props.type === 'corridor' ||
        props.Corridor || props.corridor) {
      return true;
    }
    
    // LineString with no properties or minimal properties (likely a corridor)
    // Exclude if it has a non-corridor Type
    const hasType = props.Type || props.type;
    if (hasType && hasType.toLowerCase() !== 'corridor') {
      return false; // It's something else (stairs, etc.)
    }
    
    // Accept unmarked LineStrings as potential corridors
    return true;
  });

  console.log(`  Found ${corridors.length} corridor paths`);

  if (corridors.length === 0) {
    console.warn('⚠️ No corridors in GeoJSON - using direct routing');
    
    // FALLBACK: Direct routing when no corridors exist
    const directDistance = turf.distance(
      turf.point(startCoords),
      turf.point(endCoords),
      { units: 'meters' }
    );
    
    // Create a simple 3-point path for visualization
    const midPoint = [
      (startCoords[0] + endCoords[0]) / 2,
      (startCoords[1] + endCoords[1]) / 2
    ];
    
    const path = [startCoords, midPoint, endCoords];
    
    // Generate simple directions
    const directions = [
      {
        type: 'start',
        instruction: 'Start from your location',
        coords: startCoords,
        distance: 0
      },
      {
        type: 'straight',
        instruction: `Walk directly to destination (${directDistance.toFixed(0)}m)`,
        coords: midPoint,
        distance: directDistance
      },
      {
        type: 'arrive',
        instruction: 'You have arrived at your destination',
        coords: endCoords,
        distance: 0
      }
    ];
    
    console.log(`✅ Direct route: ${directDistance.toFixed(1)}m`);
    
    return {
      valid: true,
      path: path,
      distance: directDistance,
      waypoints: path.length,
      floors: [features[0]?.properties?.Floor || features[0]?.properties?.floor || 'F1'],
      isMultiFloor: false,
      floorTransitions: [],
      directions: directions,
      estimatedTime: Math.ceil(directDistance / 1.4 / 60),
      isDirect: true // Flag to indicate this is direct routing
    };
  }

  try {
    // Build navigation graph
    console.log('  Building navigation graph...');
    const nodeMap = buildNavigationGraph(corridors);
    console.log(`  Graph has ${nodeMap.size} nodes`);

    // Find nearest nodes to start and end points
    let nearestStart = null;
    let nearestEnd = null;
    let minStartDist = Infinity;
    let minEndDist = Infinity;

    nodeMap.forEach(node => {
      const startDist = turf.distance(
        turf.point(startCoords),
        turf.point(node.coords),
        { units: 'meters' }
      );
      const endDist = turf.distance(
        turf.point(endCoords),
        turf.point(node.coords),
        { units: 'meters' }
      );

      if (startDist < minStartDist) {
        minStartDist = startDist;
        nearestStart = node;
      }
      if (endDist < minEndDist) {
        minEndDist = endDist;
        nearestEnd = node;
      }
    });

    if (!nearestStart || !nearestEnd) {
      throw new Error('Could not find nearest corridor nodes');
    }

    console.log(`  Start node: ${minStartDist.toFixed(1)}m away`);
    console.log(`  End node: ${minEndDist.toFixed(1)}m away`);
    
    // Debug: Check if start and end are well connected
    console.log(`  Start node has ${nearestStart.neighbors.length} neighbors`);
    console.log(`  End node has ${nearestEnd.neighbors.length} neighbors`);

    // Run A* algorithm
    console.log('  Running A* pathfinding...');
    const result = astar(nearestStart, nearestEnd, nodeMap);

    if (!result.found || result.path.length < 2) {
      return {
        valid: false,
        path: [],
        distance: 0,
        waypoints: 0,
        floors: [],
        directions: [],
        error: 'No path found between points'
      };
    }

    // Don't simplify or add start/end coords - keep ONLY corridor nodes
    // This ensures the route NEVER leaves the corridors
    const completePath = [...result.path];
    console.log(`  Path waypoints: ${result.path.length} points`);

    // Calculate total distance along corridor path
    let totalDistance = 0;
    for (let i = 0; i < completePath.length - 1; i++) {
      totalDistance += turf.distance(
        turf.point(completePath[i]),
        turf.point(completePath[i + 1]),
        { units: 'meters' }
      );
    }
    
    // Add estimated walking distance from start to first corridor node
    totalDistance += minStartDist;
    // Add estimated walking distance from last corridor node to destination
    totalDistance += minEndDist;

    // Generate turn-by-turn directions using only corridor nodes
    const directions = generateDirections(completePath);
    
    // Add start and end instructions
    const allDirections = [
      {
        type: 'start',
        instruction: `Start from corridor entrance`,
        coords: completePath[0], // Use first corridor node
        distance: 0
      },
      ...directions,
      {
        type: 'arrive',
        instruction: 'You have arrived near your destination',
        coords: completePath[completePath.length - 1], // Use last corridor node
        distance: 0
      }
    ];

    // Extract floor information
    const floor = corridors[0]?.properties?.Floor || 
                  corridors[0]?.properties?.floor || 'F1';

    console.log(`✅ Route found: ${completePath.length} waypoints, ${totalDistance.toFixed(1)}m, ${allDirections.length} directions`);

    return {
      valid: true,
      path: completePath,
      distance: totalDistance,
      waypoints: completePath.length,
      floors: [floor],
      isMultiFloor: false,
      floorTransitions: [],
      directions: allDirections,
      estimatedTime: Math.ceil(totalDistance / 1.4 / 60) // Walking speed ~1.4 m/s
    };

  } catch (error) {
    console.error('❌ Error in A* pathfinding:', error);
    
    const directDistance = turf.distance(
      turf.point(startCoords),
      turf.point(endCoords),
      { units: 'meters' }
    );
    
    return {
      valid: false,
      path: [],
      distance: directDistance,
      waypoints: 0,
      floors: [],
      directions: [],
      error: error.message
    };
  }
}

/**
 * Find the nearest entrance point to a given location
 * @param {Array} targetCoords - [longitude, latitude] target location
 * @param {Array} features - GeoJSON features to search for entrances
 * @returns {Object} {coords, distance, name} of nearest entrance or null
 */
export function findNearestEntrance(targetCoords, features = []) {
  if (!targetCoords || targetCoords.length !== 2) {
    return null;
  }

  const entrances = features.filter(f =>
    f?.properties?.Type === 'entrance' ||
    f?.properties?.type === 'entrance' ||
    f?.properties?.Name?.toLowerCase().includes('entrance') ||
    f?.properties?.name?.toLowerCase().includes('entrance')
  );

  if (entrances.length === 0) {
    console.warn('No entrances found in features');
    return null;
  }

  let nearestEntrance = null;
  let minDistance = Infinity;
  let entranceName = 'Main Entrance';

  const targetPoint = turf.point(targetCoords);

  entrances.forEach(entrance => {
    try {
      let entrancePoint;
      
      if (entrance.geometry.type === 'Point') {
        entrancePoint = entrance.geometry.coordinates;
      } else if (entrance.geometry.type === 'Polygon') {
        const centroid = turf.centroid(entrance);
        entrancePoint = centroid.geometry.coordinates;
      } else {
        return; // Skip unsupported geometry types
      }

      const distance = turf.distance(targetPoint, turf.point(entrancePoint), { units: 'meters' });
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestEntrance = entrancePoint;
        entranceName = entrance.properties?.Name || entrance.properties?.name || 'Main Entrance';
      }
    } catch (error) {
      console.warn('Error processing entrance:', error);
    }
  });

  if (!nearestEntrance) return null;

  return {
    coords: nearestEntrance,
    distance: minDistance,
    name: entranceName
  };
}

/**
 * Check if coordinates are inside campus bounds
 * @param {Array} coords - [longitude, latitude]
 * @returns {Boolean} true if inside campus
 */
export function isInsideCampus(coords) {
  if (!coords || coords.length !== 2) return false;

  // Campus bounds (approximate)
  const campusBounds = {
    west: 120.979000,
    south: 14.589500,
    east: 120.984500,
    north: 14.594500
  };

  const [lng, lat] = coords;
  
  return lng >= campusBounds.west &&
         lng <= campusBounds.east &&
         lat >= campusBounds.south &&
         lat <= campusBounds.north;
}

/**
 * Get starting point for navigation
 * If user is outside campus, use nearest entrance
 * Otherwise, use current location
 */
export function getNavigationStartPoint(userLocation, features) {
  if (!userLocation) return null;

  const isInside = isInsideCampus(userLocation);
  
  if (isInside) {
    console.log('📍 User is inside campus, using current location as start');
    return {
      coords: userLocation,
      type: 'current',
      message: 'Starting from your location'
    };
  } else {
    console.log('📍 User is outside campus, finding nearest entrance');
    const entrance = findNearestEntrance(userLocation, features);
    
    if (entrance) {
      return {
        coords: entrance.coords,
        type: 'entrance',
        message: `Starting from ${entrance.name} (${entrance.distance.toFixed(0)}m away)`,
        entranceName: entrance.name,
        distanceToEntrance: entrance.distance
      };
    }
    
    return null;
  }
}

/**
 * Find a multi-floor route using A* pathfinding with stair navigation
 * @param {Array} startCoords - [longitude, latitude] starting point
 * @param {Array} endCoords - [longitude, latitude] destination point
 * @param {String} startFloor - Starting floor (F1, F2, F3, F4)
 * @param {String} endFloor - Destination floor (F1, F2, F3, F4)
 * @param {Object} allFloorsFeatures - Object with floor keys and their GeoJSON features
 * @returns {Object} Route information with path, distance, directions, floor transitions
 */
export function findMultiFloorRoute(startCoords, endCoords, startFloor, endFloor, allFloorsFeatures) {
  console.log('🏢 Finding multi-floor route...');
  console.log(`  Start: ${startCoords} on ${startFloor}`);
  console.log(`  End: ${endCoords} on ${endFloor}`);
  
  if (!startCoords || !endCoords || startCoords.length !== 2 || endCoords.length !== 2) {
    return {
      valid: false,
      path: [],
      distance: 0,
      waypoints: 0,
      floors: [],
      directions: [],
      error: 'Invalid coordinates'
    };
  }

  // Build multi-floor graph with stair connections
  console.log('  Building multi-floor graph...');
  const { nodeMap, stairLocations } = buildMultiFloorGraph(allFloorsFeatures);
  console.log(`  Multi-floor graph has ${nodeMap.size} total nodes`);
  console.log(`  Found ${stairLocations.length} stair locations`);

  // Find nearest nodes to start and end points
  let nearestStart = null;
  let nearestEnd = null;
  let minStartDist = Infinity;
  let minEndDist = Infinity;

  nodeMap.forEach(node => {
    if (node.floor === startFloor) {
      const startDist = turf.distance(
        turf.point(startCoords),
        turf.point(node.coords),
        { units: 'meters' }
      );
      if (startDist < minStartDist) {
        minStartDist = startDist;
        nearestStart = node;
      }
    }
    
    if (node.floor === endFloor) {
      const endDist = turf.distance(
        turf.point(endCoords),
        turf.point(node.coords),
        { units: 'meters' }
      );
      if (endDist < minEndDist) {
        minEndDist = endDist;
        nearestEnd = node;
      }
    }
  });

  if (!nearestStart || !nearestEnd) {
    console.error('❌ Could not find corridor nodes on specified floors');
    return {
      valid: false,
      path: [],
      distance: 0,
      waypoints: 0,
      floors: [],
      directions: [],
      error: 'No corridor access on specified floors'
    };
  }

  console.log(`  Start node: ${minStartDist.toFixed(1)}m away on ${startFloor}`);
  console.log(`  End node: ${minEndDist.toFixed(1)}m away on ${endFloor}`);

  // Run A* algorithm
  console.log('  Running multi-floor A* pathfinding...');
  const result = astar(nearestStart, nearestEnd, nodeMap);

  if (!result.found || result.path.length < 2) {
    console.warn('⚠️ No path found between floors');
    return {
      valid: false,
      path: [],
      distance: 0,
      waypoints: 0,
      floors: [startFloor, endFloor],
      directions: [],
      error: 'No path found between points'
    };
  }

  // Extract floor transitions and stair usage
  const floorTransitions = [];
  const floorsVisited = new Set([startFloor]);
  
  // Reconstruct path with floor information
  const pathWithFloors = [];
  let node = nearestEnd;
  const nodeSequence = [];
  
  while (node) {
    nodeSequence.unshift(node);
    node = node.parent;
  }
  
  // Analyze path for floor changes
  for (let i = 0; i < nodeSequence.length - 1; i++) {
    const curr = nodeSequence[i];
    const next = nodeSequence[i + 1];
    
    pathWithFloors.push({ coords: curr.coords, floor: curr.floor });
    
    // Check if this is a stair transition
    const connection = curr.neighbors.find(n => n.node.id === next.id);
    if (connection && connection.isStair) {
      floorTransitions.push({
        from: curr.floor,
        to: next.floor,
        stairName: connection.stairName || 'Stairs',
        coords: curr.coords
      });
      floorsVisited.add(next.floor);
      console.log(`  🚶 Floor transition: ${curr.floor} → ${next.floor} via ${connection.stairName}`);
    }
  }
  
  // Add final node
  if (nodeSequence.length > 0) {
    const last = nodeSequence[nodeSequence.length - 1];
    pathWithFloors.push({ coords: last.coords, floor: last.floor });
  }

  // Don't simplify or add start/end - keep only corridor nodes
  const completePath = [...result.path];

  // Calculate total distance
  let totalDistance = 0;
  for (let i = 0; i < completePath.length - 1; i++) {
    totalDistance += turf.distance(
      turf.point(completePath[i]),
      turf.point(completePath[i + 1]),
      { units: 'meters' }
    );
  }
  totalDistance += minStartDist + minEndDist;

  // Generate turn-by-turn directions with floor transitions
  const directions = generateDirectionsWithFloors(pathWithFloors, floorTransitions);
  
  const allDirections = [
    {
      type: 'start',
      instruction: `Start on ${startFloor}`,
      coords: completePath[0],
      floor: startFloor,
      distance: 0
    },
    ...directions,
    {
      type: 'arrive',
      instruction: `Arrive at destination on ${endFloor}`,
      coords: completePath[completePath.length - 1],
      floor: endFloor,
      distance: 0
    }
  ];

  console.log(`✅ Multi-floor route found!`);
  console.log(`   Distance: ${totalDistance.toFixed(1)}m`);
  console.log(`   Floors: ${Array.from(floorsVisited).join(' → ')}`);
  console.log(`   Transitions: ${floorTransitions.length}`);

  return {
    valid: true,
    path: completePath,
    pathWithFloors,
    distance: totalDistance,
    waypoints: completePath.length,
    floors: Array.from(floorsVisited),
    isMultiFloor: startFloor !== endFloor,
    floorTransitions,
    directions: allDirections,
    estimatedTime: Math.ceil(totalDistance / 1.4 / 60),
    stairsUsed: floorTransitions.map(t => t.stairName)
  };
}

/**
 * Generate directions with floor transition information
 */
function generateDirectionsWithFloors(pathWithFloors, floorTransitions) {
  if (pathWithFloors.length < 2) return [];

  const directions = [];
  const threshold = 15;

  for (let i = 1; i < pathWithFloors.length - 1; i++) {
    const prev = pathWithFloors[i - 1];
    const current = pathWithFloors[i];
    const next = pathWithFloors[i + 1];

    // Check for floor transition
    const transition = floorTransitions.find(t => 
      t.coords[0] === current.coords[0] && t.coords[1] === current.coords[1]
    );

    if (transition) {
      directions.push({
        type: 'stairs',
        instruction: `Take ${transition.stairName} to ${transition.to}`,
        coords: current.coords,
        floor: transition.from,
        targetFloor: transition.to,
        distance: 5,
        isFloorChange: true
      });
      continue;
    }

    // Regular turn-by-turn directions
    const bearing1 = turf.bearing(turf.point(prev.coords), turf.point(current.coords));
    const bearing2 = turf.bearing(turf.point(current.coords), turf.point(next.coords));
    
    let angleDiff = bearing2 - bearing1;
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;

    const distance = turf.distance(
      turf.point(current.coords),
      turf.point(next.coords),
      { units: 'meters' }
    );

    if (Math.abs(angleDiff) < threshold) {
      directions.push({
        type: 'straight',
        instruction: `Continue straight for ${distance.toFixed(0)}m`,
        coords: current.coords,
        floor: current.floor,
        distance
      });
    } else if (angleDiff > 0) {
      directions.push({
        type: 'right',
        instruction: `Turn right and continue for ${distance.toFixed(0)}m`,
        coords: current.coords,
        floor: current.floor,
        distance,
        angle: angleDiff
      });
    } else {
      directions.push({
        type: 'left',
        instruction: `Turn left and continue for ${distance.toFixed(0)}m`,
        coords: current.coords,
        floor: current.floor,
        distance,
        angle: angleDiff
      });
    }
  }

  return directions;
}


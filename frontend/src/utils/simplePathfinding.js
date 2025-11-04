/**
 * CORRIDOR-FOLLOWING PATHFINDING - Follows LineString corridors with A* algorithm
 * Connects multiple corridors together to find optimal route
 * Avoids routing through building polygons
 */
import * as turf from '@turf/turf';

/**
 * Check if a line segment intersects with any building polygons
 */
function intersectsBuilding(coord1, coord2, buildings) {
  if (!buildings || buildings.length === 0) return false;
  
  const line = turf.lineString([coord1, coord2]);
  
  for (const building of buildings) {
    if (building.geometry.type === 'Polygon') {
      const polygon = turf.polygon(building.geometry.coordinates);
      
      // Check if line intersects the polygon boundary or interior
      if (turf.booleanIntersects(line, polygon)) {
        return true;
      }
      
      // Check if either endpoint is inside the polygon
      if (turf.booleanPointInPolygon(turf.point(coord1), polygon) ||
          turf.booleanPointInPolygon(turf.point(coord2), polygon)) {
        return true;
      }
      
      // Check if line crosses through the polygon
      const midPoint = [
        (coord1[0] + coord2[0]) / 2,
        (coord1[1] + coord2[1]) / 2
      ];
      if (turf.booleanPointInPolygon(turf.point(midPoint), polygon)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Build a graph from corridor LineStrings, excluding edges that pass through buildings
 */
function buildCorridorGraph(corridors, buildings = []) {
  const nodes = new Map(); // Map of "lng,lat" -> node info
  const edges = []; // List of edges with start, end, coords
  let nodeIdCounter = 0;
  
  const getNodeId = (coord) => {
    const key = `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
    if (!nodes.has(key)) {
      nodes.set(key, {
        id: nodeIdCounter++,
        coord: coord,
        key: key
      });
    }
    return nodes.get(key);
  };
  
  let skippedEdges = 0;
  
  // Process each corridor
  corridors.forEach((corridor) => {
    const coords = corridor.geometry.coordinates;
    
    // Create nodes and edges for each segment
    for (let i = 0; i < coords.length - 1; i++) {
      const startNode = getNodeId(coords[i]);
      const endNode = getNodeId(coords[i + 1]);
      
      // Skip edges that pass through buildings - forces path to bend around
      if (intersectsBuilding(coords[i], coords[i + 1], buildings)) {
        skippedEdges++;
        continue;
      }
      
      const distance = turf.distance(
        turf.point(coords[i]),
        turf.point(coords[i + 1]),
        { units: 'meters' }
      );
      
      // Bidirectional edges
      edges.push({
        from: startNode.id,
        to: endNode.id,
        distance: distance,
        path: [coords[i], coords[i + 1]]
      });
      
      edges.push({
        from: endNode.id,
        to: startNode.id,
        distance: distance,
        path: [coords[i + 1], coords[i]]
      });
    }
  });
  
  if (skippedEdges > 0) {
    console.log(`🏢 Skipped ${skippedEdges} edges that pass through buildings - path will bend around`);
  }
  
  // Build adjacency list
  const graph = new Map();
  edges.forEach(edge => {
    if (!graph.has(edge.from)) {
      graph.set(edge.from, []);
    }
    graph.get(edge.from).push(edge);
  });
  
  return { nodes, graph };
}

/**
 * Find nearest node to a coordinate
 */
function findNearestNode(coord, nodes) {
  let minDist = Infinity;
  let nearestNode = null;
  
  nodes.forEach(node => {
    const dist = turf.distance(
      turf.point(coord),
      turf.point(node.coord),
      { units: 'meters' }
    );
    
    if (dist < minDist) {
      minDist = dist;
      nearestNode = node;
    }
  });
  
  return { node: nearestNode, distance: minDist };
}

/**
 * A* pathfinding algorithm
 */
function aStar(startNodeId, endNodeId, nodes, graph) {
  const nodeArray = Array.from(nodes.values());
  const startNode = nodeArray.find(n => n.id === startNodeId);
  const endNode = nodeArray.find(n => n.id === endNodeId);
  
  if (!startNode || !endNode) return null;
  
  const openSet = new Set([startNodeId]);
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map([[startNodeId, 0]]);
  const fScore = new Map([[startNodeId, turf.distance(
    turf.point(startNode.coord),
    turf.point(endNode.coord),
    { units: 'meters' }
  )]]);
  
  let iterations = 0;
  const maxIterations = 10000;
  
  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;
    
    // Get node with lowest fScore
    let current = null;
    let lowestF = Infinity;
    openSet.forEach(nodeId => {
      const f = fScore.get(nodeId) || Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = nodeId;
      }
    });
    
    if (current === endNodeId) {
      // Reconstruct path
      const pathEdges = [];
      let curr = current;
      while (cameFrom.has(curr)) {
        const edge = cameFrom.get(curr);
        pathEdges.unshift(edge);
        curr = edge.from;
      }
      
      // Build full path from edges
      const fullPath = [];
      pathEdges.forEach((edge, idx) => {
        if (idx === 0) {
          fullPath.push(...edge.path);
        } else {
          fullPath.push(edge.path[1]); // Skip duplicate point
        }
      });
      
      return fullPath;
    }
    
    openSet.delete(current);
    closedSet.add(current);
    
    const neighbors = graph.get(current) || [];
    neighbors.forEach(edge => {
      const neighbor = edge.to;
      
      if (closedSet.has(neighbor)) return;
      
      const tentativeG = (gScore.get(current) || Infinity) + edge.distance;
      
      if (!openSet.has(neighbor)) {
        openSet.add(neighbor);
      } else if (tentativeG >= (gScore.get(neighbor) || Infinity)) {
        return;
      }
      
      cameFrom.set(neighbor, edge);
      gScore.set(neighbor, tentativeG);
      
      const neighborNode = nodeArray.find(n => n.id === neighbor);
      const h = turf.distance(
        turf.point(neighborNode.coord),
        turf.point(endNode.coord),
        { units: 'meters' }
      );
      fScore.set(neighbor, tentativeG + h);
    });
  }
  
  return null; // No path found
}

/**
 * Main pathfinding function - follows corridors using A*
 */
export function findSimpleRoute(startCoords, endCoords, corridorFeatures = []) {
  console.log('🎯 Corridor-Following Pathfinding');
  console.log('📍 Start:', startCoords);
  console.log('📍 End:', endCoords);
  
  if (!startCoords || !endCoords) {
    console.error('❌ Missing coordinates');
    return {
      path: [],
      distance: 0,
      waypoints: 0,
      valid: false,
      error: 'Missing coordinates'
    };
  }

  // Filter for LineString corridors
  const corridors = corridorFeatures.filter(f => 
    f && f.geometry && f.geometry.type === 'LineString'
  );
  
  // Filter for building polygons
  const buildings = corridorFeatures.filter(f => 
    f && f.geometry && f.geometry.type === 'Polygon' && 
    f.properties && (f.properties.Type === 'Building' || f.properties.Type === 'Polygon')
  );

  if (corridors.length === 0) {
    console.warn('⚠️ No corridors available - drawing direct line as fallback');
    const directDist = turf.distance(
      turf.point(startCoords),
      turf.point(endCoords),
      { units: 'meters' }
    );
    
    return {
      path: [startCoords, endCoords],
      distance: directDist,
      waypoints: 2,
      valid: true,
      isDirect: true,
      warning: 'No corridor data - showing direct line'
    };
  }

  console.log(`🛤️ Building graph from ${corridors.length} corridors`);
  console.log(`🏢 Checking ${buildings.length} building polygons as obstacles`);
  
  // Build corridor graph with building obstacle detection
  const { nodes, graph } = buildCorridorGraph(corridors, buildings);
  console.log(`📊 Graph: ${nodes.size} nodes, ${[...graph.values()].reduce((sum, edges) => sum + edges.length, 0)} edges`);
  
  // Find nearest nodes to start and end
  const { node: startNode, distance: startDist } = findNearestNode(startCoords, nodes);
  const { node: endNode, distance: endDist } = findNearestNode(endCoords, nodes);
  
  if (!startNode || !endNode) {
    console.warn('⚠️ Could not find corridor nodes - drawing direct line');
    const directDist = turf.distance(
      turf.point(startCoords),
      turf.point(endCoords),
      { units: 'meters' }
    );
    
    return {
      path: [startCoords, endCoords],
      distance: directDist,
      waypoints: 2,
      valid: true,
      isDirect: true
    };
  }
  
  console.log(`📍 Snap to corridor: start ${startDist.toFixed(1)}m, end ${endDist.toFixed(1)}m`);
  
  // Run A* pathfinding
  const corridorPath = aStar(startNode.id, endNode.id, nodes, graph);
  
  if (!corridorPath || corridorPath.length === 0) {
    console.warn('⚠️ A* found no corridor path - connecting via nearest points');
    
    // Fallback: Draw path connecting start to nearest corridor nodes to end
    const fallbackPath = [
      startCoords,
      startNode.coord,
      endNode.coord,
      endCoords
    ];
    
    const pathLine = turf.lineString(fallbackPath);
    const totalDistance = turf.length(pathLine, { units: 'meters' });
    
    console.log(`✅ Using fallback route: ${fallbackPath.length} points, ${totalDistance.toFixed(1)}m`);
    
    return {
      path: fallbackPath,
      distance: totalDistance,
      waypoints: fallbackPath.length,
      valid: true,
      isPartialRoute: true
    };
  }
  
  // Build full path: start -> corridor path -> end
  const fullPath = [
    startCoords,
    ...corridorPath,
    endCoords
  ];
  
  // Remove duplicate consecutive points
  const cleanPath = [];
  for (let i = 0; i < fullPath.length; i++) {
    if (i === 0 ||
        fullPath[i][0] !== fullPath[i-1][0] ||
        fullPath[i][1] !== fullPath[i-1][1]) {
      cleanPath.push(fullPath[i]);
    }
  }
  
  // Calculate total distance
  const pathLine = turf.lineString(cleanPath);
  const totalDistance = turf.length(pathLine, { units: 'meters' });
  
  console.log(`✅ Path found: ${cleanPath.length} points, ${totalDistance.toFixed(1)}m`);
  console.log(`   Follows ${corridorPath.length} corridor segments`);
  
  return {
    path: cleanPath,
    distance: totalDistance,
    waypoints: cleanPath.length,
    valid: true,
    corridorSegments: corridorPath.length
  };
}

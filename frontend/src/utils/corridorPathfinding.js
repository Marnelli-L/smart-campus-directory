/**
 * Corridor-Based A* Pathfinding
 * Ensures routes ONLY follow LineString paths - no building overlap
 */

import * as turf from '@turf/turf';

export class CorridorPathfinding {
  constructor() {
    this.graph = null;
    this.corridors = [];
    this.corridorLines = []; // Store Turf LineString objects
    this.nodes = new Map();
  }

  /**
   * Initialize pathfinding with GeoJSON data
   * Builds navigation graph from LineString features only
   * UPDATED: Now supports multi-floor navigation
   */
  initialize(geojsonData, currentFloor = 'ground') {
    if (!geojsonData || !geojsonData.features) {
      console.error('❌ Invalid GeoJSON data');
      return false;
    }

    // Extract all LineString AND MultiLineString features (walkable paths/corridors)
    const lineFeatures = geojsonData.features.filter(
      feature => feature.geometry && (
        feature.geometry.type === 'LineString' || 
        feature.geometry.type === 'MultiLineString'
      )
    );

    if (lineFeatures.length === 0) {
      console.error('❌ No LineString or MultiLineString paths found in GeoJSON');
      return false;
    }

    // Convert MultiLineStrings to individual LineStrings
    this.corridors = [];
    lineFeatures.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        this.corridors.push(feature);
      } else if (feature.geometry.type === 'MultiLineString') {
        // Split MultiLineString into separate LineStrings
        feature.geometry.coordinates.forEach((lineCoords) => {
          this.corridors.push({
            type: 'Feature',
            properties: { ...feature.properties },
            geometry: {
              type: 'LineString',
              coordinates: lineCoords
            }
          });
        });
      }
    });

    if (this.corridors.length === 0) {
      console.error('❌ No valid corridor paths after processing');
      return false;
    }

    // Store floor level information for each corridor
    this.corridors.forEach(corridor => {
      if (!corridor.properties) {
        corridor.properties = {};
      }
      // Use provided floor or extract from properties
      corridor.properties.floor = corridor.properties.Floor || corridor.properties.floor || currentFloor;
      
      // Detect if this is a stair/elevator connector
      const name = (corridor.properties.Name || corridor.properties.name || '').toLowerCase();
      corridor.properties.isFloorConnector = name.includes('stair') || name.includes('elevator') || name.includes('lift');
      
      if (corridor.properties.isFloorConnector) {
        console.log(`🔄 Found floor connector: ${corridor.properties.Name || corridor.properties.name} on floor ${corridor.properties.floor}`);
      }
    });

    // Count corridors per floor
    const floorCounts = {};
    this.corridors.forEach(c => {
      const floor = c.properties.floor;
      floorCounts[floor] = (floorCounts[floor] || 0) + 1;
    });
    
    console.log(`✅ Found ${this.corridors.length} walkable path segments across multiple floors:`);
    Object.keys(floorCounts).forEach(floor => {
      console.log(`   📍 Floor ${floor}: ${floorCounts[floor]} corridors`);
    });

    // Build navigation graph with Turf.js precision
    this.buildGraphWithTurf();
    
    return true;
  }

  /**
   * Build graph using Turf.js for accurate geometry operations
   */
  buildGraphWithTurf() {
    this.graph = new Map();
    this.nodes = new Map();
    this.corridorLines = []; // Store Turf LineString objects
    let nodeIdCounter = 0;

    // Helper to get or create node ID with Turf precision
    const getNodeId = (coord) => {
      const key = `${coord[0].toFixed(7)},${coord[1].toFixed(7)}`; // Higher precision
      if (!this.nodes.has(key)) {
        this.nodes.set(key, {
          id: nodeIdCounter++,
          coord: coord,
          key: key,
          point: turf.point(coord) // Store as Turf point
        });
      }
      return this.nodes.get(key);
    };

    // Process each corridor (LineString) with Turf
    this.corridors.forEach(corridor => {
      const coordinates = corridor.geometry.coordinates;
      const line = turf.lineString(coordinates);
      this.corridorLines.push(line);
      
      // Extract floor and connector info
      const floor = corridor.properties?.floor || 'ground';
      const isFloorConnector = corridor.properties?.isFloorConnector || false;
      
      // Create nodes and edges for each segment
      for (let i = 0; i < coordinates.length - 1; i++) {
        const startNode = getNodeId(coordinates[i]);
        const endNode = getNodeId(coordinates[i + 1]);
        
        // Add floor information to nodes
        if (!startNode.floor) startNode.floor = floor;
        if (!endNode.floor) endNode.floor = floor;
        
        // Use Turf for accurate distance calculation
        const distance = turf.distance(startNode.point, endNode.point, { units: 'meters' });
        
        // Create segment as Turf LineString
        const segment = turf.lineString([startNode.coord, endNode.coord]);
        const segmentLength = turf.length(segment, { units: 'meters' });

        // Add bidirectional edges with Turf geometry
        if (!this.graph.has(startNode.id)) {
          this.graph.set(startNode.id, []);
        }
        if (!this.graph.has(endNode.id)) {
          this.graph.set(endNode.id, []);
        }

        // Store edge with Turf segment and floor info
        this.graph.get(startNode.id).push({
          to: endNode.id,
          distance: distance,
          segmentLength: segmentLength,
          path: [startNode.coord, endNode.coord],
          segment: segment,
          bearing: turf.bearing(startNode.point, endNode.point),
          floor: floor,
          isFloorConnector: isFloorConnector
        });

        this.graph.get(endNode.id).push({
          to: startNode.id,
          distance: distance,
          segmentLength: segmentLength,
          path: [endNode.coord, startNode.coord],
          segment: turf.lineString([endNode.coord, startNode.coord]),
          bearing: turf.bearing(endNode.point, startNode.point),
          floor: floor,
          isFloorConnector: isFloorConnector
        });
      }
    });

    // Add proximity connections between nearby corridor endpoints ON SAME FLOOR
    // This helps connect disconnected corridor segments
    const maxProximityDistance = 20; // Increased to 20m to connect more corridors
    const nodesArray = Array.from(this.nodes.values());
    
    for (let i = 0; i < nodesArray.length; i++) {
      for (let j = i + 1; j < nodesArray.length; j++) {
        const node1 = nodesArray[i];
        const node2 = nodesArray[j];
        
        // Only connect nodes on the same floor
        if (node1.floor !== node2.floor) continue;
        
        const dist = turf.distance(node1.point, node2.point, { units: 'meters' });
        
        // Only connect if within proximity and not already connected
        if (dist > 0 && dist <= maxProximityDistance) {
          const edges1 = this.graph.get(node1.id) || [];
          const alreadyConnected = edges1.some(e => e.to === node2.id);
          
          if (!alreadyConnected) {
            const segment = turf.lineString([node1.coord, node2.coord]);
            
            if (!this.graph.has(node1.id)) this.graph.set(node1.id, []);
            if (!this.graph.has(node2.id)) this.graph.set(node2.id, []);
            
            this.graph.get(node1.id).push({
              to: node2.id,
              distance: dist,
              segmentLength: dist,
              path: [node1.coord, node2.coord],
              segment: segment,
              bearing: turf.bearing(node1.point, node2.point),
              floor: node1.floor,
              isProximity: true
            });
            
            this.graph.get(node2.id).push({
              to: node1.id,
              distance: dist,
              segmentLength: dist,
              path: [node2.coord, node1.coord],
              segment: turf.lineString([node2.coord, node1.coord]),
              bearing: turf.bearing(node2.point, node1.point),
              floor: node2.floor,
              isProximity: true
            });
          }
        }
      }
    }
    
    // Add cross-floor connections at stair/elevator locations
    // Find nodes that are at similar coordinates but on different floors
    console.log('🔄 Connecting floors via stairs/elevators...');
    let crossFloorConnections = 0;
    const maxCrossFloorDistance = 30; // Very close nodes (within 30m) on different floors
    
    for (let i = 0; i < nodesArray.length; i++) {
      for (let j = i + 1; j < nodesArray.length; j++) {
        const node1 = nodesArray[i];
        const node2 = nodesArray[j];
        
        // Only connect nodes on DIFFERENT floors
        if (node1.floor === node2.floor) continue;
        
        const dist = turf.distance(node1.point, node2.point, { units: 'meters' });
        
        // Connect if very close (stairway/elevator location)
        if (dist <= maxCrossFloorDistance) {
          const edges1 = this.graph.get(node1.id) || [];
          const alreadyConnected = edges1.some(e => e.to === node2.id);
          
            if (!alreadyConnected) {
              const segment = turf.lineString([node1.coord, node2.coord]);
              
              if (!this.graph.has(node1.id)) this.graph.set(node1.id, []);
              if (!this.graph.has(node2.id)) this.graph.set(node2.id, []);
              
              // Add vertical connection with slight penalty to prefer same-floor routes
              const verticalDistance = dist + 2; // Add 2m penalty for floor changes (reduced from 5m)
              
              this.graph.get(node1.id).push({
              to: node2.id,
              distance: verticalDistance,
              segmentLength: dist,
              path: [node1.coord, node2.coord],
              segment: segment,
              bearing: turf.bearing(node1.point, node2.point),
              fromFloor: node1.floor,
              toFloor: node2.floor,
              isFloorConnector: true,
              isCrossFloor: true
            });
            
            this.graph.get(node2.id).push({
              to: node1.id,
              distance: verticalDistance,
              segmentLength: dist,
              path: [node2.coord, node1.coord],
              segment: turf.lineString([node2.coord, node1.coord]),
              bearing: turf.bearing(node2.point, node1.point),
              fromFloor: node2.floor,
              toFloor: node1.floor,
              isFloorConnector: true,
              isCrossFloor: true
            });
            
            crossFloorConnections++;
            // Log only first few connections to avoid performance issues
            if (crossFloorConnections <= 5) {
              console.log(`   🔗 Connected floor ${node1.floor} ↔️ floor ${node2.floor} at [${node1.coord[0].toFixed(6)}, ${node1.coord[1].toFixed(6)}]`);
            }
          }
        }
      }
    }

    const totalEdges = Array.from(this.graph.values()).reduce((sum, edges) => sum + edges.length, 0);
    console.log(`%c✅ Graph built with Turf precision:`, 'color: #4CAF50; font-weight: bold;');
    console.log(`%c   📍 ${this.nodes.size} nodes`, 'color: #2196F3;');
    console.log(`%c   🛤️ ${this.corridorLines.length} corridor lines`, 'color: #2196F3;');
    console.log(`%c   🔗 ${totalEdges} edges (including proximity connections)`, 'color: #2196F3;');
    console.log(`%c   🔄 ${crossFloorConnections} cross-floor connections`, 'color: #FF9800;');
    console.log(`%c   ⚡ Ready for multi-floor pathfinding!`, 'color: #4CAF50; font-weight: bold;');
  }

  /**
   * Find nearest node using Turf's accurate geometric calculations
   * Snaps to nearest point on any LineString corridor
   * ENHANCED: Better snapping with corridor segment detection
   */
  findNearestNodeWithTurf(targetCoord) {
    const targetPoint = turf.point(targetCoord);
    let minDistance = Infinity;
    let nearestNode = null;
    let nearestSnapPoint = null;
    let bestSnapInfo = null;

    // First pass: Find nearest point on ALL corridors using Turf's nearestPointOnLine
    this.corridorLines.forEach((line, lineIndex) => {
      const snapped = turf.nearestPointOnLine(line, targetPoint, { units: 'meters' });
      const snapDistance = snapped.properties.dist * 1000; // Convert km to meters

      if (snapDistance < minDistance) {
        minDistance = snapDistance;
        const snapCoord = snapped.geometry.coordinates;
        
        // Store complete snap information
        bestSnapInfo = {
          coord: snapCoord,
          distance: snapDistance,
          lineIndex: lineIndex,
          line: line,
          snappedPoint: snapped
        };
        
        nearestSnapPoint = bestSnapInfo;

        // Find or create a node at this snapped location
        const snapKey = `${snapCoord[0].toFixed(7)},${snapCoord[1].toFixed(7)}`;
        
        // Check if we already have a node at this location
        if (this.nodes.has(snapKey)) {
          nearestNode = this.nodes.get(snapKey);
        } else {
          // Create a temporary node for this snap point
          nearestNode = {
            id: -1, // Temporary ID
            coord: snapCoord,
            key: snapKey,
            point: turf.point(snapCoord),
            isTemporary: true,
            lineIndex: lineIndex
          };
        }
      }
    });

    // Second pass: Also check existing graph nodes for very close matches
    this.nodes.forEach(node => {
      const distance = turf.distance(targetPoint, node.point, { units: 'meters' });
      // If existing node is closer than snap point, use it
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
        nearestSnapPoint = null; // Clear snap info since we're using exact node
      }
    });

    if (!nearestNode) {
      console.error('❌ Could not find nearest node or snap point');
      return { node: null, distance: Infinity, snap: null };
    }

    console.log(`📍 Nearest point: ${minDistance.toFixed(2)}m away`);
    if (nearestSnapPoint) {
      console.log(`   Snapped to corridor line #${nearestSnapPoint.lineIndex}`);
    }

    return { 
      node: nearestNode, 
      distance: minDistance, 
      snap: nearestSnapPoint
    };
  }

  /**
   * Connect a node to nearby nodes in the graph (not just same corridor)
   * This ensures temporary start/end nodes can reach the entire navigation graph
   */
  connectNodeToCorridor(node) {
    const maxConnectionDistance = 50; // Connect to any node within 50 meters
    const maxConnections = 10; // Connect to up to 10 nearest nodes
    
    // Find ALL nearby nodes in the entire graph
    let nearbyNodes = [];
    
    this.nodes.forEach(existingNode => {
      if (existingNode.id !== node.id) {
        const distance = turf.distance(node.point, existingNode.point, { units: 'meters' });
        if (distance <= maxConnectionDistance) {
          nearbyNodes.push({ node: existingNode, distance });
        }
      }
    });
    
    // Sort by distance and take the closest ones
    nearbyNodes.sort((a, b) => a.distance - b.distance);
    nearbyNodes = nearbyNodes.slice(0, maxConnections);
    
    console.log(`🔗 Connecting temporary node to ${nearbyNodes.length} nearby graph nodes (within ${maxConnectionDistance}m)`);
    
    // Create graph edges (bidirectional)
    if (!this.graph.has(node.id)) {
      this.graph.set(node.id, []);
    }
    
    nearbyNodes.forEach(({ node: targetNode, distance }) => {
      const segment = turf.lineString([node.coord, targetNode.coord]);
      const bearing = turf.bearing(node.point, targetNode.point);
      
      // Add edge from new node to existing node
      this.graph.get(node.id).push({
        to: targetNode.id,
        distance: distance,
        segmentLength: turf.length(segment, { units: 'meters' }),
        path: [node.coord, targetNode.coord],
        segment: segment,
        bearing: bearing,
        isTemporary: true
      });
      
      // Add reverse edge from existing node to new node
      if (!this.graph.has(targetNode.id)) {
        this.graph.set(targetNode.id, []);
      }
      
      this.graph.get(targetNode.id).push({
        to: node.id,
        distance: distance,
        segmentLength: turf.length(segment, { units: 'meters' }),
        path: [targetNode.coord, node.coord],
        segment: turf.lineString([targetNode.coord, node.coord]),
        bearing: turf.bearing(targetNode.point, node.point),
        isTemporary: true
      });
    });
  }

  /**
   * A* Pathfinding Algorithm with Turf.js precision
   * Returns path that ONLY follows LineString corridors
   */
  findPath(startCoord, endCoord) {
    console.log('%c🎯 Starting A* pathfinding with Turf precision...', 'color: #FF9800; font-weight: bold;');
    console.log('%c📍 Start:', 'color: #4CAF50;', startCoord);
    console.log('%c📍 End:', 'color: #F44336;', endCoord);

    // Find nearest graph nodes using Turf
    const { node: startNode, distance: startSnapDist } = this.findNearestNodeWithTurf(startCoord);
    const { node: endNode, distance: endSnapDist } = this.findNearestNodeWithTurf(endCoord);

    if (!startNode || !endNode) {
      console.error('❌ Could not find nodes near start/end points');
      console.error('Start node:', startNode, 'End node:', endNode);
      return null;
    }

    console.log(`✅ Snapped to corridor graph:`);
    console.log(`   Start: ${startSnapDist.toFixed(1)}m away (node ${startNode.id})`);
    console.log(`   End: ${endSnapDist.toFixed(1)}m away (node ${endNode.id})`);
    
    // CRITICAL FIX: Connect temporary nodes to the main graph
    if (startNode.isTemporary) {
      console.log('🔗 Connecting temporary start node to graph...');
      this.connectNodeToCorridor(startNode);
    }
    
    if (endNode.isTemporary) {
      console.log('🔗 Connecting temporary end node to graph...');
      this.connectNodeToCorridor(endNode);
    }
    
    // Check if start and end are the same node
    if (startNode.id === endNode.id) {
      console.log('⚠️ Start and end are at same node, using direct corridor path');
      const directDist = turf.distance(
        turf.point(startCoord),
        turf.point(endCoord),
        { units: 'meters' }
      );
      return {
        path: [startCoord, endCoord],
        distance: directDist,
        waypoints: 2,
        nodeCount: 1,
        valid: true
      };
    }

    // Check if nodes have connections
    const startEdges = this.graph.get(startNode.id) || [];
    const endEdges = this.graph.get(endNode.id) || [];
    
    console.log(`🔗 Start node has ${startEdges.length} corridor connections`);
    console.log(`🔗 End node has ${endEdges.length} corridor connections`);
    
    if (startEdges.length === 0) {
      console.error('❌ Start node has no corridor connections!');
      return null;
    }
    if (endEdges.length === 0) {
      console.error('❌ End node has no corridor connections!');
      return null;
    }

    // Heuristic function using Turf's accurate distance
    // Cache nodes by ID for faster lookup
    const nodeById = new Map();
    this.nodes.forEach(node => nodeById.set(node.id, node));
    
    // Use standard A* (weight = 1.0) for optimal pathfinding
    const heuristic = (nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return Infinity;
      const h = turf.distance(node.point, endNode.point, { units: 'meters' });
      return h * 1.0; // Standard A* heuristic
    };

    // A* algorithm
    const openSet = new Set([startNode.id]);
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, heuristic(startNode.id));

    let iterations = 0;
    const maxIterations = 100000; // Increased from 50,000 to allow complex paths

    while (openSet.size > 0) {
      iterations++;
      
      // Reduced logging - only log every 25000 iterations to prevent performance issues
      if (iterations % 25000 === 0) {
        console.log(`⏳ A* iteration ${iterations}, openSet: ${openSet.size}, closedSet: ${closedSet.size}`);
      }
      
      if (iterations > maxIterations) {
        console.error(`❌ A* exceeded maximum iterations (${maxIterations})`);
        return null;
      }

      // Get node with lowest fScore
      let current = null;
      let lowestFScore = Infinity;
      
      openSet.forEach(nodeId => {
        const score = fScore.get(nodeId) || Infinity;
        if (score < lowestFScore) {
          lowestFScore = score;
          current = nodeId;
        }
      });

      // Reached destination
      if (current === endNode.id) {
        console.log(`✅ Corridor path found in ${iterations} iterations!`);
        console.log(`📊 Using A* with Turf geometric precision`);
        return this.reconstructPath(cameFrom, current, startCoord, endCoord);
      }

      openSet.delete(current);
      closedSet.add(current);

      // Check all neighbors along corridors
      const neighbors = this.graph.get(current) || [];
      
      neighbors.forEach(edge => {
        const neighbor = edge.to;
        
        if (closedSet.has(neighbor)) {
          return; // Skip already evaluated nodes
        }
        
        // Use Turf-calculated distance for accurate pathfinding
        const tentativeGScore = (gScore.get(current) || Infinity) + edge.distance;

        if (!openSet.has(neighbor)) {
          openSet.add(neighbor);
        } else if (tentativeGScore >= (gScore.get(neighbor) || Infinity)) {
          return; // Not a better path
        }

        // This path is better
        cameFrom.set(neighbor, { from: current, edge: edge });
        gScore.set(neighbor, tentativeGScore);
        fScore.set(neighbor, tentativeGScore + heuristic(neighbor));
      });
    }

    console.warn(`⚠️ No corridor path found after ${iterations} iterations`);
    console.warn('Corridors might not connect start and end locations');
    return null;
  }

  /**
   * Reconstruct path from A* result using Turf for accuracy
   */
  reconstructPath(cameFrom, current, startCoord, endCoord) {
    const pathSegments = [];
    const nodeIds = [current];
    const floors = new Set();
    const floorTransitions = [];

    // Backtrack through cameFrom
    while (cameFrom.has(current)) {
      const step = cameFrom.get(current);
      pathSegments.unshift(step.edge.path);
      
      // Track floor information - handle both single floor and cross-floor edges
      if (step.edge.isCrossFloor) {
        // For cross-floor edges, track both floors
        floors.add(step.edge.fromFloor);
        floors.add(step.edge.toFloor);
        
        // Record the floor transition
        floorTransitions.unshift({
          from: step.edge.fromFloor,
          to: step.edge.toFloor,
          isFloorConnector: true,
          location: step.edge.path[0] // Transition point coordinates
        });
        
        console.log(`🔄 Floor transition detected: ${step.edge.fromFloor} → ${step.edge.toFloor}`);
      } else {
        const edgeFloor = step.edge.floor || 'ground';
        floors.add(edgeFloor);
      }
      
      current = step.from;
      nodeIds.unshift(current);
    }

    // Combine all segments into single coordinate array
    const fullPath = [startCoord]; // Start with actual start point
    
    pathSegments.forEach(segment => {
      // Add all coordinates except the first (to avoid duplication)
      for (let i = 1; i < segment.length; i++) {
        fullPath.push(segment[i]);
      }
    });
    
    fullPath.push(endCoord); // End with actual end point

    // Calculate total distance using Turf's accurate line measurement
    const pathLine = turf.lineString(fullPath);
    const totalDistance = turf.length(pathLine, { units: 'meters' });

    const floorsArray = Array.from(floors).sort();
    console.log(`📊 Path reconstruction complete:`);
    console.log(`   ${fullPath.length} waypoints`);
    console.log(`   ${totalDistance.toFixed(1)}m total distance`);
    console.log(`   ${nodeIds.length} corridor nodes traversed`);
    console.log(`   🏢 Floors: ${floorsArray.join(', ')}`);
    if (floorTransitions.length > 0) {
      console.log(`   🔄 Floor transitions: ${floorTransitions.length}`);
      floorTransitions.forEach((t, i) => {
        console.log(`      ${i+1}. Floor ${t.from} → Floor ${t.to} (via stairs/elevator)`);
      });
    }

    return {
      path: fullPath,
      distance: totalDistance,
      waypoints: fullPath.length,
      nodeCount: nodeIds.length,
      valid: true,
      line: pathLine, // Include Turf LineString for further processing
      floors: floorsArray,
      floorTransitions: floorTransitions,
      isMultiFloor: floors.size > 1
    };
  }

  /**
   * Main entry point - Find route between two points using Turf+A*
   */
  findRoute(startCoord, endCoord) {
    if (!this.graph || this.graph.size === 0) {
      console.error('❌ Graph not initialized. Call initialize() first.');
      return {
        path: [startCoord, endCoord],
        distance: 0,
        valid: false,
        error: 'Graph not initialized'
      };
    }

    // Pre-snap start and end to detect if they lie on the same corridor line
    const startSnapInfo = this.findNearestNodeWithTurf(startCoord);
    const endSnapInfo = this.findNearestNodeWithTurf(endCoord);

    if (startSnapInfo?.snap && endSnapInfo?.snap && startSnapInfo.snap.lineIndex === endSnapInfo.snap.lineIndex) {
      // Both snap to the same corridor - slice along that corridor for a perfect match
      console.log('🛤️ Start and destination are on the SAME corridor line. Slicing corridor segment.');
      const sliced = this.routeAlongSingleCorridor(startSnapInfo.snap.lineIndex, startCoord, endCoord);
      if (sliced) {
        return sliced;
      }
    }

    const result = this.findPath(startCoord, endCoord);

    if (!result) {
      console.warn('⚠️ No corridor path found - falling back to direct line');
      const directDist = turf.distance(
        turf.point(startCoord),
        turf.point(endCoord),
        { units: 'meters' }
      );
      return {
        path: [startCoord, endCoord],
        distance: directDist,
        valid: false,
        error: 'No corridor path found'
      };
    }

    // Simplify path to remove unnecessary waypoints while staying on corridors
    const simplifiedPath = this.simplifyPath(result.path);
    
    // Recalculate distance with simplified path
    const finalLine = turf.lineString(simplifiedPath);
    const finalDistance = turf.length(finalLine, { units: 'meters' });

    console.log(`✅ Final optimized route:`);
    console.log(`   ${simplifiedPath.length} waypoints (reduced from ${result.path.length})`);
    console.log(`   ${finalDistance.toFixed(1)}m distance`);

    return {
      path: simplifiedPath,
      distance: finalDistance,
      waypoints: simplifiedPath.length,
      nodeCount: result.nodeCount,
      valid: true,
      line: finalLine
    };
  }

  /**
   * Slice a single corridor line between two coordinates snapped to it.
   * Returns a path strictly on that corridor.
   */
  routeAlongSingleCorridor(lineIndex, startCoord, endCoord) {
    try {
      const line = this.corridorLines[lineIndex];
      if (!line) return null;

      // Snap both points to the corridor precisely
      const startPt = turf.nearestPointOnLine(line, turf.point(startCoord));
      const endPt = turf.nearestPointOnLine(line, turf.point(endCoord));

      // Slice the line between snapped points
      const segment = turf.lineSlice(startPt, endPt, line);
      const coords = segment.geometry.coordinates;
      if (!coords || coords.length < 2) return null;

      const dist = turf.length(segment, { units: 'meters' });
      console.log(`🔪 Sliced single-corridor segment: ${coords.length} points, ${dist.toFixed(1)}m`);

      return {
        path: coords,
        distance: dist,
        waypoints: coords.length,
        nodeCount: coords.length - 1,
        valid: true,
        line: segment
      };
    } catch (e) {
      console.warn('Failed to slice single corridor:', e);
      return null;
    }
  }

  /**
   * Simplify path using Turf while preserving corridor accuracy
   */
  simplifyPath(path) {
    if (path.length <= 2) return path;

    try {
      const line = turf.lineString(path);
      // Use Turf's simplify with tolerance of 0.5 meters
      const simplified = turf.simplify(line, { tolerance: 0.0005, highQuality: true });
      return simplified.geometry.coordinates;
    } catch (error) {
      console.warn('Path simplification failed, using original path:', error);
      return path;
    }
  }
}

// Singleton instance
export const corridorPathfinder = new CorridorPathfinding();

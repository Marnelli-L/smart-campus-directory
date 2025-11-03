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
   */
  initialize(geojsonData) {
    if (!geojsonData || !geojsonData.features) {
      console.error('❌ Invalid GeoJSON data');
      return false;
    }

    // Extract all LineString features (walkable paths/corridors)
    this.corridors = geojsonData.features.filter(
      feature => feature.geometry && feature.geometry.type === 'LineString'
    );

    if (this.corridors.length === 0) {
      console.error('❌ No LineString paths found in GeoJSON');
      return false;
    }

    console.log(`✅ Found ${this.corridors.length} walkable path segments`);

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
      
      // Create nodes and edges for each segment
      for (let i = 0; i < coordinates.length - 1; i++) {
        const startNode = getNodeId(coordinates[i]);
        const endNode = getNodeId(coordinates[i + 1]);
        
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

        // Store edge with Turf segment
        this.graph.get(startNode.id).push({
          to: endNode.id,
          distance: distance,
          segmentLength: segmentLength,
          path: [startNode.coord, endNode.coord],
          segment: segment,
          bearing: turf.bearing(startNode.point, endNode.point)
        });

        this.graph.get(endNode.id).push({
          to: startNode.id,
          distance: distance,
          segmentLength: segmentLength,
          path: [endNode.coord, startNode.coord],
          segment: turf.lineString([endNode.coord, startNode.coord]),
          bearing: turf.bearing(endNode.point, startNode.point)
        });
      }
    });

    // Add proximity connections between nearby corridor endpoints
    // This helps connect disconnected corridor segments
  const maxProximityDistance = 6; // tighten to 6m to only connect near-touching corridors
    const nodesArray = Array.from(this.nodes.values());
    
    for (let i = 0; i < nodesArray.length; i++) {
      for (let j = i + 1; j < nodesArray.length; j++) {
        const node1 = nodesArray[i];
        const node2 = nodesArray[j];
        
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
              isProximity: true
            });
            
            this.graph.get(node2.id).push({
              to: node1.id,
              distance: dist,
              segmentLength: dist,
              path: [node2.coord, node1.coord],
              segment: turf.lineString([node2.coord, node1.coord]),
              bearing: turf.bearing(node2.point, node1.point),
              isProximity: true
            });
          }
        }
      }
    }

    const totalEdges = Array.from(this.graph.values()).reduce((sum, edges) => sum + edges.length, 0);
    console.log(`✅ Graph built with Turf precision:`);
    console.log(`   ${this.nodes.size} nodes`);
    console.log(`   ${this.corridorLines.length} corridor lines`);
    console.log(`   ${totalEdges} edges (including proximity connections)`);
  }

  /**
   * Find nearest node using Turf's accurate geometric calculations
   * Snaps to nearest point on any LineString corridor
   */
  findNearestNodeWithTurf(targetCoord) {
    const targetPoint = turf.point(targetCoord);
    let minDistance = Infinity;
    let nearestNode = null;
    let nearestSnapPoint = null;

    // First pass: Check existing nodes
    this.nodes.forEach(node => {
      const distance = turf.distance(targetPoint, node.point, { units: 'meters' });
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    });

    console.log(`📍 Nearest existing node: ${minDistance.toFixed(1)}m away`);

    // Second pass: Use Turf's nearestPointOnLine to snap to corridor segments
    this.corridorLines.forEach((line, lineIndex) => {
      const snapped = turf.nearestPointOnLine(line, targetPoint, { units: 'meters' });
      const snapDistance = snapped.properties.dist * 1000; // Convert km to meters

      if (snapDistance < minDistance) {
        minDistance = snapDistance;
        nearestSnapPoint = {
          coord: snapped.geometry.coordinates,
          distance: snapDistance,
          lineIndex: lineIndex,
          line: line
        };
      }
    });

    // If we found a better snap point on a line, create a temporary node
    if (nearestSnapPoint && nearestSnapPoint.distance < minDistance) {
      console.log(`✅ Better snap point found on corridor: ${nearestSnapPoint.distance.toFixed(1)}m away`);
      
      const snapKey = `${nearestSnapPoint.coord[0].toFixed(7)},${nearestSnapPoint.coord[1].toFixed(7)}`;
      
      if (!this.nodes.has(snapKey)) {
        const tempNode = {
          id: this.nodes.size,
          coord: nearestSnapPoint.coord,
          key: snapKey,
          point: turf.point(nearestSnapPoint.coord),
          isTemporary: true
        };
        this.nodes.set(snapKey, tempNode);
        
        // Connect temp node to nearby graph nodes
        this.connectNodeToCorridor(tempNode);
        
        nearestNode = tempNode;
        minDistance = nearestSnapPoint.distance;
      } else {
        nearestNode = this.nodes.get(snapKey);
      }
    }

    // Return snap metadata for higher-level logic (e.g., same-corridor slicing)
    return { node: nearestNode, distance: minDistance, snap: nearestSnapPoint };
  }

  /**
   * Connect a node to nearby nodes in the graph (not just same corridor)
   * This ensures temporary start/end nodes can reach the entire navigation graph
   */
  connectNodeToCorridor(node) {
    const maxConnectionDistance = 10; // Connect to any node within 10 meters for accuracy
    const maxConnections = 5; // Connect to up to 5 nearest nodes
    
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
    
    console.log(`🔗 Connecting temporary node to ${nearbyNodes.length} nearby graph nodes`);
    
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
    console.log('🎯 Starting A* pathfinding with Turf precision...');
    console.log('📍 Start:', startCoord);
    console.log('📍 End:', endCoord);

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
    
    // Use weighted A* (weight = 1.2) to guide search more aggressively toward goal
    const heuristic = (nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return Infinity;
      const h = turf.distance(node.point, endNode.point, { units: 'meters' });
      return h * 1.2; // Weighted heuristic for faster convergence
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
    const maxIterations = 50000; // Increased from 10,000 to allow more complex paths

    while (openSet.size > 0) {
      iterations++;
      
      // Log progress every 5000 iterations
      if (iterations % 5000 === 0) {
        console.log(`⏳ A* iteration ${iterations}, openSet: ${openSet.size}, closedSet: ${closedSet.size}`);
      }
      
      if (iterations > maxIterations) {
        console.error(`❌ A* exceeded maximum iterations (${maxIterations})`);
        console.error(`   OpenSet size: ${openSet.size}`);
        console.error(`   ClosedSet size: ${closedSet.size}`);
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

    // Backtrack through cameFrom
    while (cameFrom.has(current)) {
      const step = cameFrom.get(current);
      pathSegments.unshift(step.edge.path);
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

    console.log(`📊 Path reconstruction complete:`);
    console.log(`   ${fullPath.length} waypoints`);
    console.log(`   ${totalDistance.toFixed(1)}m total distance`);
    console.log(`   ${nodeIds.length} corridor nodes traversed`);

    return {
      path: fullPath,
      distance: totalDistance,
      waypoints: fullPath.length,
      nodeCount: nodeIds.length,
      valid: true,
      line: pathLine // Include Turf LineString for further processing
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

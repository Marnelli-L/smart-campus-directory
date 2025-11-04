/**
 * Pathfinding Debug Utility
 * Helps visualize nodes and edges for debugging
 */

export function debugPathfinding(corridorPathfinder, geojsonData) {
  console.log('%c=== PATHFINDING DEBUG INFO ===', 'color: #FF9800; font-weight: bold; font-size: 16px;');
  
  // Check if initialized
  if (!corridorPathfinder.nodes || corridorPathfinder.nodes.size === 0) {
    console.error('❌ Pathfinding not initialized - no nodes found');
    return;
  }
  
  console.log(`📊 Total Nodes: ${corridorPathfinder.nodes.size}`);
  console.log(`📊 Total Edges: ${corridorPathfinder.graph ? corridorPathfinder.graph.size : 0}`);
  
  // Show first 5 nodes
  console.log('%c📍 Sample Nodes:', 'color: #2196F3; font-weight: bold;');
  let nodeCount = 0;
  for (const [_key, node] of corridorPathfinder.nodes) {
    if (nodeCount >= 5) break;
    console.log(`  Node ${node.id}: [${node.coord[0].toFixed(6)}, ${node.coord[1].toFixed(6)}] (Floor: ${node.floor || 'unknown'})`);
    nodeCount++;
  }
  
  // Show edge statistics
  if (corridorPathfinder.graph) {
    console.log('%c🔗 Edge Statistics:', 'color: #4CAF50; font-weight: bold;');
    let totalEdges = 0;
    let maxEdges = 0;
    let minEdges = Infinity;
    
    for (const [_nodeId, edges] of corridorPathfinder.graph) {
      totalEdges += edges.length;
      maxEdges = Math.max(maxEdges, edges.length);
      minEdges = Math.min(minEdges, edges.length);
    }
    
    console.log(`  Total Edges: ${totalEdges}`);
    console.log(`  Average Edges per Node: ${(totalEdges / corridorPathfinder.graph.size).toFixed(2)}`);
    console.log(`  Max Edges from Single Node: ${maxEdges}`);
    console.log(`  Min Edges from Single Node: ${minEdges}`);
  }
  
  // Check for LineStrings in GeoJSON
  if (geojsonData && geojsonData.features) {
    const lineStrings = geojsonData.features.filter(f => f.geometry?.type === 'LineString');
    const points = geojsonData.features.filter(f => f.geometry?.type === 'Point');
    const polygons = geojsonData.features.filter(f => f.geometry?.type === 'Polygon');
    
    console.log('%c📐 GeoJSON Features:', 'color: #9C27B0; font-weight: bold;');
    console.log(`  LineStrings (Corridors): ${lineStrings.length}`);
    console.log(`  Points (Locations): ${points.length}`);
    console.log(`  Polygons (Buildings): ${polygons.length}`);
    
    if (lineStrings.length > 0) {
      console.log('%c🛤️ Sample LineStrings:', 'color: #009688; font-weight: bold;');
      lineStrings.slice(0, 3).forEach((ls, idx) => {
        const coords = ls.geometry.coordinates;
        console.log(`  LineString ${idx + 1}: ${coords.length} points, Name: "${ls.properties?.Name || ls.properties?.name || 'unnamed'}"`);
      });
    }
  }
  
  console.log('%c=== END DEBUG INFO ===', 'color: #FF9800; font-weight: bold; font-size: 16px;');
}

export function testPathfinding(corridorPathfinder, startCoord, endCoord) {
  console.log('%c🧪 TESTING PATHFINDING', 'color: #E91E63; font-weight: bold; font-size: 14px;');
  console.log(`Start: [${startCoord[0]}, ${startCoord[1]}]`);
  console.log(`End: [${endCoord[0]}, ${endCoord[1]}]`);
  
  const result = corridorPathfinder.findRoute(startCoord, endCoord);
  
  console.log('%cResult:', 'font-weight: bold;');
  console.log(`  Valid: ${result.valid}`);
  console.log(`  Distance: ${result.distance?.toFixed(2)}m`);
  console.log(`  Waypoints: ${result.waypoints}`);
  console.log(`  Path Points: ${result.path?.length || 0}`);
  
  if (result.path && result.path.length > 0) {
    console.log(`  First point: [${result.path[0][0].toFixed(6)}, ${result.path[0][1].toFixed(6)}]`);
    console.log(`  Last point: [${result.path[result.path.length-1][0].toFixed(6)}, ${result.path[result.path.length-1][1].toFixed(6)}]`);
  }
  
  return result;
}

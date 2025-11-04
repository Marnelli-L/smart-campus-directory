const fs = require('fs');

// Read the GeoJSON file
const filePath = 'c:/smart-campus-directory/frontend/public/images/smart-campus-map-fixed.geojson';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Extract all corridors (LineStrings)
const corridors = data.features.filter(f => f.geometry.type === 'LineString');
console.log(`Total corridors found: ${corridors.length}`);

// Calculate distance between two points
function distance(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

// Get all corridor endpoints
const endpoints = [];
corridors.forEach((corridor, idx) => {
  const coords = corridor.geometry.coordinates;
  endpoints.push({
    point: coords[0],
    pointKey: coords[0].join(','),
    corridorIdx: idx
  });
  endpoints.push({
    point: coords[coords.length - 1],
    pointKey: coords[coords.length - 1].join(','),
    corridorIdx: idx
  });
});

// Build adjacency map
const adjMap = new Map();
endpoints.forEach(ep => {
  if (!adjMap.has(ep.pointKey)) {
    adjMap.set(ep.pointKey, []);
  }
  adjMap.get(ep.pointKey).push(ep.corridorIdx);
});

// Find connected components using DFS
const visited = new Set();
const components = [];

function dfs(pointKey, component) {
  if (visited.has(pointKey)) return;
  visited.add(pointKey);
  component.points.add(pointKey);
  
  const corridorIndices = adjMap.get(pointKey) || [];
  corridorIndices.forEach(idx => {
    component.corridors.add(idx);
    const corridor = corridors[idx];
    const coords = corridor.geometry.coordinates;
    const pts = [coords[0].join(','), coords[coords.length - 1].join(',')];
    pts.forEach(pt => dfs(pt, component));
  });
}

// Find all components
Array.from(adjMap.keys()).forEach(pointKey => {
  if (!visited.has(pointKey)) {
    const component = { points: new Set(), corridors: new Set() };
    dfs(pointKey, component);
    components.push(component);
  }
});

console.log(`Found ${components.length} connected components`);
components.forEach((c, i) => {
  console.log(`  Component ${i + 1}: ${c.points.size} points, ${c.corridors.size} corridors`);
});

// Connect components by finding closest pairs
const newCorridors = [];

function getComponentPoints(component) {
  return Array.from(component.points).map(key => {
    const [lon, lat] = key.split(',').map(Number);
    return { point: [lon, lat], key: key };
  });
}

// Connect each component to its nearest neighbor
const componentConnected = new Set();

while (componentConnected.size < components.length - 1) {
  let bestConnection = null;
  let bestDist = Infinity;
  let bestFrom = -1;
  let bestTo = -1;
  
  for (let i = 0; i < components.length; i++) {
    const compA = components[i];
    const pointsA = getComponentPoints(compA);
    
    for (let j = i + 1; j < components.length; j++) {
      const compB = components[j];
      const pointsB = getComponentPoints(compB);
      
      // Find closest pair between these components
      for (const pA of pointsA) {
        for (const pB of pointsB) {
          const dist = distance(pA.point, pB.point);
          if (dist < bestDist) {
            bestDist = dist;
            bestConnection = { pointA: pA.point, pointB: pB.point };
            bestFrom = i;
            bestTo = j;
          }
        }
      }
    }
  }
  
  if (bestConnection) {
    // Create a connecting corridor
    const newCorridor = {
      type: "Feature",
      properties: {
        connection: "component-connector",
        connects_components: [bestFrom, bestTo]
      },
      geometry: {
        coordinates: [bestConnection.pointA, bestConnection.pointB],
        type: "LineString"
      },
      id: `component-connector-${bestFrom}-${bestTo}`
    };
    
    newCorridors.push(newCorridor);
    console.log(`Connecting component ${bestFrom + 1} to ${bestTo + 1} - distance: ${bestDist.toFixed(8)}`);
    
    // Merge components (for tracking purposes)
    componentConnected.add(bestFrom);
    componentConnected.add(bestTo);
    
    // Update data for next iteration
    data.features.push(newCorridor);
    corridors.push(newCorridor);
    
    // Re-run component analysis
    visited.clear();
    components.length = 0;
    
    // Rebuild adjacency map
    adjMap.clear();
    const allEndpoints = [];
    corridors.forEach((corridor, idx) => {
      const coords = corridor.geometry.coordinates;
      allEndpoints.push({
        pointKey: coords[0].join(','),
        corridorIdx: idx
      });
      allEndpoints.push({
        pointKey: coords[coords.length - 1].join(','),
        corridorIdx: idx
      });
    });
    
    allEndpoints.forEach(ep => {
      if (!adjMap.has(ep.pointKey)) {
        adjMap.set(ep.pointKey, []);
      }
      adjMap.get(ep.pointKey).push(ep.corridorIdx);
    });
    
    // Re-find components
    Array.from(adjMap.keys()).forEach(pointKey => {
      if (!visited.has(pointKey)) {
        const component = { points: new Set(), corridors: new Set() };
        dfs(pointKey, component);
        components.push(component);
      }
    });
    
    console.log(`  -> Now ${components.length} components remaining`);
    
    if (components.length === 1) {
      console.log('All components connected!');
      break;
    }
  } else {
    break;
  }
}

console.log(`\nTotal new connections added: ${newCorridors.length}`);

// Write back to file
const outputPath = 'c:/smart-campus-directory/frontend/public/images/smart-campus-map-fixed.geojson';
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log(`Fixed GeoJSON saved to: ${outputPath}`);

// Final stats
const finalCorridorCount = data.features.filter(f => f.geometry.type === 'LineString').length;
console.log(`Final corridor count: ${finalCorridorCount}`);

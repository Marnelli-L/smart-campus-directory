const fs = require('fs');

// Read the GeoJSON file
const filePath = 'c:/smart-campus-directory/frontend/public/images/smart-campus-map.geojson';
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
    corridorIdx: idx,
    isStart: true,
    corridor: corridor
  });
  endpoints.push({
    point: coords[coords.length - 1],
    corridorIdx: idx,
    isStart: false,
    corridor: corridor
  });
});

// Find connection map
const connectionMap = new Map();
endpoints.forEach((ep, idx) => {
  const key = ep.point.join(',');
  if (!connectionMap.has(key)) {
    connectionMap.set(key, []);
  }
  connectionMap.get(key).push(ep);
});

// Find dead ends (points with only one corridor)
const deadEnds = Array.from(connectionMap.entries())
  .filter(([pt, eps]) => eps.length === 1)
  .map(([pt, eps]) => eps[0]);

console.log(`Dead ends found: ${deadEnds.length}`);

// Find nearby dead ends that should be connected
const threshold = 0.00005; // Distance threshold for connecting endpoints
const newCorridors = [];

for (let i = 0; i < deadEnds.length; i++) {
  const ep1 = deadEnds[i];
  
  for (let j = i + 1; j < deadEnds.length; j++) {
    const ep2 = deadEnds[j];
    
    // Skip if same corridor
    if (ep1.corridorIdx === ep2.corridorIdx) continue;
    
    const dist = distance(ep1.point, ep2.point);
    
    if (dist < threshold && dist > 0.000001) {
      // Create a connecting corridor
      const newCorridor = {
        type: "Feature",
        properties: {
          connection: "auto-generated",
          connects: [ep1.corridorIdx, ep2.corridorIdx]
        },
        geometry: {
          coordinates: [ep1.point, ep2.point],
          type: "LineString"
        },
        id: `connection-${i}-${j}`
      };
      
      newCorridors.push(newCorridor);
      console.log(`Connecting: [${ep1.point}] to [${ep2.point}] - distance: ${dist.toFixed(8)}`);
    }
  }
}

console.log(`\nTotal new connections to add: ${newCorridors.length}`);

// Add new corridors to the data
data.features.push(...newCorridors);

// Write back to file
const outputPath = 'c:/smart-campus-directory/frontend/public/images/smart-campus-map-fixed.geojson';
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log(`\nFixed GeoJSON saved to: ${outputPath}`);

// Verify the fix
const newCorridorCount = data.features.filter(f => f.geometry.type === 'LineString').length;
console.log(`New total corridors: ${newCorridorCount} (added ${newCorridorCount - corridors.length})`);

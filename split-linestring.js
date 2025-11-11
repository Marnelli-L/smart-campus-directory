/**
 * Split a single complex LineString into individual corridor segments
 * Detects junction points (visited multiple times) and creates separate LineStrings
 */
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'frontend', 'public', 'images', 'smart-campus-map.geojson');
const outputFile = path.join(__dirname, 'frontend', 'public', 'images', 'smart-campus-map-fixed.geojson');

// Read the GeoJSON
const geojson = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Find the LineString feature
const lineStringFeature = geojson.features.find(f => f.geometry.type === 'LineString');

if (!lineStringFeature) {
  console.error('No LineString found in GeoJSON');
  process.exit(1);
}

const coords = lineStringFeature.geometry.coordinates;
console.log(`📏 Original LineString has ${coords.length} coordinates`);

// Helper: create coordinate key for comparison
function coordKey(coord) {
  return `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
}

// Find all junction points (coordinates that appear more than once)
const coordCount = new Map();
coords.forEach(coord => {
  const key = coordKey(coord);
  coordCount.set(key, (coordCount.get(key) || 0) + 1);
});

const junctions = new Set();
coordCount.forEach((count, key) => {
  if (count > 1) {
    junctions.add(key);
  }
});

console.log(`🔄 Found ${junctions.size} junction points (visited multiple times)`);

// Split the LineString into segments at junctions
const segments = [];
let currentSegment = [coords[0]];

for (let i = 1; i < coords.length; i++) {
  const coord = coords[i];
  const key = coordKey(coord);
  
  currentSegment.push(coord);
  
  // If this is a junction AND we have at least 2 points, save segment
  if (junctions.has(key) && currentSegment.length >= 2) {
    segments.push([...currentSegment]);
    // Start new segment from this junction point
    currentSegment = [coord];
  }
}

// Add final segment if it has points
if (currentSegment.length >= 2) {
  segments.push(currentSegment);
}

console.log(`✂️ Split into ${segments.length} corridor segments`);

// Remove duplicate segments (segments with identical start and end)
const uniqueSegments = [];
const segmentKeys = new Set();

segments.forEach(seg => {
  if (seg.length < 2) return;
  
  const startKey = coordKey(seg[0]);
  const endKey = coordKey(seg[seg.length - 1]);
  const key1 = `${startKey}-${endKey}`;
  const key2 = `${endKey}-${startKey}`; // bidirectional
  
  if (!segmentKeys.has(key1) && !segmentKeys.has(key2)) {
    uniqueSegments.push(seg);
    segmentKeys.add(key1);
  }
});

console.log(`🎯 After removing duplicates: ${uniqueSegments.length} unique corridors`);

// Create new features for each corridor segment
const corridorFeatures = uniqueSegments.map((seg, idx) => ({
  type: 'Feature',
  properties: {
    Name: `Corridor ${idx + 1}`,
    Type: 'Corridor',
    Floor: 'Ground Floor'
  },
  geometry: {
    type: 'LineString',
    coordinates: seg
  },
  id: `corridor-${idx + 1}`
}));

// Remove old LineString and add new corridor segments
const newFeatures = geojson.features.filter(f => f.id !== lineStringFeature.id);
newFeatures.push(...corridorFeatures);

const newGeoJSON = {
  ...geojson,
  features: newFeatures
};

// Write the fixed GeoJSON
fs.writeFileSync(outputFile, JSON.stringify(newGeoJSON, null, 2));

console.log(`\n✅ Created ${outputFile}`);
console.log(`   📊 Total features: ${newFeatures.length}`);
console.log(`   🛤️ Corridor segments: ${corridorFeatures.length}`);
console.log('\n🎉 Done! Your corridors are now properly split for navigation.');

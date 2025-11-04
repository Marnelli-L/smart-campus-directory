/**
 * Automatic LineString Connection Fixer
 * Snaps endpoints and merges connected corridors using Turf.js
 */

const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// Floor files to process
const floorFiles = [
  'frontend/public/images/smart-campus-map.geojson',
  'frontend/public/images/2nd-floor-map.geojson',
  'frontend/public/images/3rd-floor-map.geojson',
  'frontend/public/images/4th-floor-map.geojson'
];

const floorNames = ['Ground Floor', '2nd Floor', '3rd Floor', '4th Floor'];

console.log('🔧 Starting automatic corridor connection fix...\n');

floorFiles.forEach((file, index) => {
  const filePath = path.join(__dirname, file);
  const floorName = floorNames[index];
  
  console.log(`\n📂 Processing ${floorName}: ${file}`);
  
  try {
    // Load GeoJSON
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Separate LineStrings from other features
    const lineStrings = data.features.filter(f => f.geometry.type === 'LineString');
    const otherFeatures = data.features.filter(f => f.geometry.type !== 'LineString');
    
    console.log(`   📊 Found ${lineStrings.length} LineStrings`);
    console.log(`   📊 Found ${otherFeatures.length} other features (Polygons, Points)`);
    
    if (lineStrings.length === 0) {
      console.log(`   ⚠️  No LineStrings to process, skipping...`);
      return;
    }
    
    // Create a FeatureCollection of just LineStrings
    const lineCollection = {
      type: 'FeatureCollection',
      features: lineStrings
    };
    
    console.log(`   🔄 Step 1: Snapping close endpoints (tolerance: 3 meters)...`);
    
    // Snap endpoints that are very close together (within 3 meters)
    // Convert 3 meters to degrees (approximately 0.000027 degrees)
    const tolerance = 0.000027; // ~3 meters
    let snapped;
    
    try {
      snapped = turf.snap(lineCollection, lineCollection, tolerance);
      console.log(`   ✅ Endpoints snapped successfully`);
    } catch (e) {
      console.log(`   ⚠️  Snap failed, using original: ${e.message}`);
      snapped = lineCollection;
    }
    
    console.log(`   🔄 Step 2: Combining separate LineStrings...`);
    
    // Combine LineStrings that share endpoints
    let combined;
    try {
      combined = turf.combine(snapped);
      console.log(`   ✅ LineStrings combined`);
    } catch (e) {
      console.log(`   ⚠️  Combine failed, using snapped: ${e.message}`);
      combined = snapped;
    }
    
    console.log(`   🔄 Step 3: Merging connected lines...`);
    
    // Merge LineStrings that are connected
    let merged;
    try {
      merged = turf.lineMerge(combined);
      
      // lineMerge returns a FeatureCollection or single Feature
      if (merged.type === 'Feature') {
        merged = {
          type: 'FeatureCollection',
          features: [merged]
        };
      }
      
      console.log(`   ✅ Connected lines merged`);
      console.log(`   📊 Result: ${merged.features.length} corridor segments`);
    } catch (e) {
      console.log(`   ⚠️  Merge failed, using combined: ${e.message}`);
      merged = combined;
    }
    
    // Preserve properties from original features
    merged.features.forEach((feature, idx) => {
      if (!feature.properties) {
        feature.properties = {};
      }
      
      // Try to find matching original feature by coordinates
      const matchingOriginal = lineStrings.find(orig => {
        if (!orig.geometry.coordinates || !feature.geometry.coordinates) return false;
        const origFirst = orig.geometry.coordinates[0];
        const mergedFirst = feature.geometry.coordinates[0];
        return origFirst[0] === mergedFirst[0] && origFirst[1] === mergedFirst[1];
      });
      
      if (matchingOriginal && matchingOriginal.properties) {
        // Preserve original properties
        feature.properties = { ...matchingOriginal.properties };
      } else {
        // Set default properties
        feature.properties = {
          Name: feature.properties.Name || `Corridor ${idx + 1}`,
          Type: feature.properties.Type || 'Corridor',
          Floor: feature.properties.Floor || (index === 0 ? 'Ground' : `${index + 1}`),
          ...feature.properties
        };
      }
    });
    
    // Combine fixed LineStrings with other features
    const fixedData = {
      type: 'FeatureCollection',
      features: [...merged.features, ...otherFeatures]
    };
    
    // Create backup of original file
    const backupPath = filePath.replace('.geojson', '.backup.geojson');
    fs.writeFileSync(backupPath, fs.readFileSync(filePath));
    console.log(`   💾 Backup saved: ${path.basename(backupPath)}`);
    
    // Write fixed data
    fs.writeFileSync(filePath, JSON.stringify(fixedData, null, 2));
    console.log(`   ✅ Fixed file saved: ${path.basename(filePath)}`);
    console.log(`   📊 Final: ${merged.features.length} LineStrings + ${otherFeatures.length} other features`);
    
  } catch (error) {
    console.error(`   ❌ Error processing ${floorName}:`, error.message);
  }
});

console.log('\n✅ Corridor connection fix complete!');
console.log('\n📋 Summary:');
console.log('   • Snapped endpoints within 3 meters');
console.log('   • Combined separate LineStrings');
console.log('   • Merged connected corridors');
console.log('   • Preserved building polygons and room points');
console.log('   • Created .backup.geojson files\n');
console.log('🔄 Reload your application to see the improvements!');

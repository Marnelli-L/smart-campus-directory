/**
 * Add corridors around the Library and courtyard area
 */
const fs = require('fs');

console.log('🛤️ Adding Library area corridors...\n');

// Load GeoJSON
const geojsonPath = './frontend/public/images/smart-campus-map.geojson';
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

console.log(`📦 Loaded ${data.features.length} features`);

const corridors = data.features.filter(f => f.geometry.type === 'LineString');
console.log(`🛤️ Existing corridors: ${corridors.length}\n`);

// Backup
fs.writeFileSync(geojsonPath + '.pre-library', JSON.stringify(data, null, 2));
console.log('💾 Backup created: smart-campus-map.geojson.pre-library\n');

// Define new corridors around Library and courtyard
// These connect the entrance area to the library area
const newCorridors = [
    // Courtyard perimeter - East side (along Management Division)
    {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [120.981789, 14.591899], // Near Management Division
                [120.981789, 14.592100],
                [120.981789, 14.592300],
                [120.981789, 14.592500],
                [120.981789, 14.592700],
                [120.981789, 14.592850]  // Near Library
            ]
        },
        properties: {
            Name: 'Courtyard East Corridor',
            Type: 'Corridor',
            floor: 'Ground Floor'
        }
    },
    
    // Courtyard perimeter - West side (along gardens)
    {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [120.981350, 14.591900],
                [120.981350, 14.592100],
                [120.981350, 14.592300],
                [120.981350, 14.592500],
                [120.981350, 14.592700],
                [120.981350, 14.592850]
            ]
        },
        properties: {
            Name: 'Courtyard West Corridor',
            Type: 'Corridor',
            floor: 'Ground Floor'
        }
    },
    
    // Courtyard perimeter - North side (near Library entrance)
    {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [120.981350, 14.592850],
                [120.981450, 14.592850],
                [120.981550, 14.592850],
                [120.981650, 14.592850],
                [120.981750, 14.592850]
            ]
        },
        properties: {
            Name: 'Library Entrance Corridor',
            Type: 'Corridor',
            floor: 'Ground Floor'
        }
    },
    
    // Courtyard perimeter - South side (connects to existing corridors)
    {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [120.981350, 14.591900],
                [120.981450, 14.591900],
                [120.981550, 14.591900],
                [120.981650, 14.591900],
                [120.981750, 14.591900]
            ]
        },
        properties: {
            Name: 'Courtyard South Corridor',
            Type: 'Corridor',
            floor: 'Ground Floor'
        }
    },
    
    // Cross-corridor 1 (mid-courtyard)
    {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [120.981350, 14.592375],
                [120.981450, 14.592375],
                [120.981550, 14.592375],
                [120.981650, 14.592375],
                [120.981750, 14.592375]
            ]
        },
        properties: {
            Name: 'Courtyard Cross Corridor 1',
            Type: 'Corridor',
            floor: 'Ground Floor'
        }
    },
    
    // Connect entrance area to courtyard
    {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [120.981616, 14.591631], // Entrance "You are here"
                [120.981616, 14.591750],
                [120.981616, 14.591900]
            ]
        },
        properties: {
            Name: 'Entrance to Courtyard Connector',
            Type: 'Corridor',
            floor: 'Ground Floor'
        }
    },
    
    // Central pathway
    {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [120.981550, 14.591900],
                [120.981550, 14.592100],
                [120.981550, 14.592300],
                [120.981550, 14.592500],
                [120.981550, 14.592700],
                [120.981550, 14.592850]
            ]
        },
        properties: {
            Name: 'Central Courtyard Pathway',
            Type: 'Corridor',
            floor: 'Ground Floor'
        }
    }
];

// Add new corridors
data.features.push(...newCorridors);

// Save
fs.writeFileSync(geojsonPath, JSON.stringify(data, null, 2));

console.log('✅ Added corridors:');
newCorridors.forEach(c => {
    console.log(`   - ${c.properties.Name}: ${c.geometry.coordinates.length} points`);
});

console.log(`\n📊 New total: ${data.features.length} features`);
console.log(`🛤️ Corridors: ${corridors.length} → ${corridors.length + newCorridors.length}`);
console.log('\n✅ Library area is now connected!');
console.log('🔄 Restart dev server to see changes');

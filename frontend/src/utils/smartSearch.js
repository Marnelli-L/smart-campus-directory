/**
 * DIRECT GeoJSON Search - 100% Accurate
 * Searches directly from GeoJSON data across all floors
 * No complex scoring - just simple, accurate matching
 */
import * as turf from '@turf/turf';

// Floor configuration - keys must match MapView floor state
const FLOOR_CONFIGS = [
  { key: 'ground', name: 'Ground Floor', file: '/images/1st-floor-map.geojson' },
  { key: '2', name: '2nd Floor', file: '/images/2nd-floor-map.geojson' },
  { key: '3', name: '3rd Floor', file: '/images/3rd-floor-map.geojson' },
  { key: '4', name: '4th Floor', file: '/images/4th-floor-map.geojson' }
];

// Cache for loaded GeoJSON data
let geojsonCache = {};
let isLoading = false;

/**
 * Load all GeoJSON files into cache
 */
export async function loadAllFloorData() {
  if (Object.keys(geojsonCache).length === 4) {
    return geojsonCache; // Already loaded
  }

  if (isLoading) {
    // Wait for loading to complete
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!isLoading) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
    return geojsonCache;
  }

  isLoading = true;
  console.log('📥 Loading all floor GeoJSON data...');

  try {
    const loadPromises = FLOOR_CONFIGS.map(async (floor) => {
      try {
        const response = await fetch(floor.file);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        geojsonCache[floor.key] = {
          data,
          name: floor.name,
          file: floor.file
        };
        console.log(`✅ Loaded ${floor.name}: ${data.features?.length || 0} features`);
      } catch (error) {
        console.error(`❌ Error loading ${floor.name}:`, error);
        geojsonCache[floor.key] = null;
      }
    });

    await Promise.all(loadPromises);
    console.log(`✅ All floor data loaded: ${Object.keys(geojsonCache).length} floors`);
  } finally {
    isLoading = false;
  }

  return geojsonCache;
}

/**
 * Simple case-insensitive string matching
 */
function matchesSearch(text, search) {
  if (!text) return false;
  const textLower = text.toLowerCase().trim();
  const searchLower = search.toLowerCase().trim();
  return textLower.includes(searchLower);
}

/**
 * Direct GeoJSON search - returns ALL matching locations
 */
export async function smartSearch(searchTerm) {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return { results: [], bestMatch: null };
  }

  const search = searchTerm.toLowerCase().trim();
  console.log(`🔍 Searching GeoJSON for: "${searchTerm}"`);

  // Load all floor data if not cached
  await loadAllFloorData();

  const allMatches = [];

  // Search through all floors
  for (const [floorKey, floorData] of Object.entries(geojsonCache)) {
    if (!floorData || !floorData.data) continue;

    // Search through all features
    floorData.data.features.forEach(feature => {
      const props = feature.properties || {};
      const name = (props.Name || props.name || '').trim();
      const building = (props.Building || props.building || '').trim();
      const type = (props.Type || props.type || '').trim();
      const room = (props.Room || props.room || '').trim();

      // Skip features without a name
      if (!name) return;

      // Check if search matches name, type, room, or building
      if (matchesSearch(name, search) || 
          matchesSearch(type, search) || 
          matchesSearch(room, search) ||
          matchesSearch(building, search)) {
        
        // Get coordinates
        let coordinates;
        if (feature.geometry.type === 'Point') {
          coordinates = feature.geometry.coordinates;
        } else if (feature.geometry.type === 'Polygon') {
          coordinates = turf.centroid(feature).geometry.coordinates;
        } else {
          return; // Skip unsupported geometry types
        }

        // Calculate simple priority score
        let priority = 0;
        const nameLower = name.toLowerCase();
        
        // Exact match gets highest priority
        if (nameLower === search) {
          priority = 1000;
        }
        // Starts with search term
        else if (nameLower.startsWith(search)) {
          priority = 500;
        }
        // Contains search term
        else if (nameLower.includes(search)) {
          priority = 100;
        }
        // Room or type match
        else if (matchesSearch(room, search) || matchesSearch(type, search)) {
          priority = 50;
        }
        
        // Add match to results
        allMatches.push({
          feature,
          floor: floorData.name,
          floorKey,
          coordinates,
          name,
          building: building || 'Main Building',
          type: type || 'Location',
          room,
          priority
        });
      }
    });
  }

  // Sort by priority (highest first), then by name length (shorter first)
  allMatches.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.name.length - b.name.length;
  });

  // Get top results
  const topResults = allMatches.slice(0, 15);
  const bestMatch = topResults.length > 0 ? topResults[0] : null;

  if (bestMatch) {
    console.log(`✅ Best match: "${bestMatch.name}" on ${bestMatch.floor} (priority: ${bestMatch.priority})`);
  } else {
    console.warn(`⚠️ No matches found for: "${searchTerm}"`);
  }

  if (topResults.length > 1) {
    console.log(`📋 Found ${topResults.length} matches:`, 
      topResults.slice(0, 5).map(r => `${r.name} (${r.floor})`)
    );
  }

  return {
    results: topResults,
    bestMatch,
    searchTerm
  };
}

/**
 * Get intelligent suggestions for autocomplete
 * Returns top 8 most relevant, unique suggestions
 */
export async function getSearchSuggestions(searchTerm) {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const { results } = await smartSearch(searchTerm);
  
  // Deduplication by name (keep highest priority)
  const uniqueResults = [];
  const seenNames = new Map();
  
  for (const r of results) {
    const nameLower = r.name.trim().toLowerCase();
    
    // Check if we've seen this name before
    if (seenNames.has(nameLower)) {
      const existing = seenNames.get(nameLower);
      
      // Keep the one with higher priority
      if (r.priority > existing.priority) {
        // Replace with higher priority version
        const index = uniqueResults.findIndex(ur => ur.name.trim().toLowerCase() === nameLower);
        if (index > -1) {
          uniqueResults[index] = {
            name: r.name.trim(),
            building: r.building,
            floor: r.floor,
            floorKey: r.floorKey,
            coordinates: r.coordinates,
            type: r.type,
            room: r.room,
            priority: r.priority
          };
          seenNames.set(nameLower, r);
        }
      }
    } else {
      // New unique location
      seenNames.set(nameLower, r);
      uniqueResults.push({
        name: r.name.trim(),
        building: r.building,
        floor: r.floor,
        floorKey: r.floorKey,
        coordinates: r.coordinates,
        type: r.type,
        room: r.room,
        priority: r.priority
      });
    }
  }
  
  // Return top 8 suggestions, sorted by priority
  return uniqueResults
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8)
    .map(({ name, building, floor, floorKey, coordinates, type, room }) => ({
      name,
      building,
      floor,
      floorKey,
      coordinates,
      type,
      room
    }));
}

/**
 * Clear cache (useful for development)
 */
export function clearSearchCache() {
  geojsonCache = {};
  console.log('🗑️ Search cache cleared');
}

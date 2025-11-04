/**
 * Smart Multi-Floor Search Algorithm (Google Maps Style)
 * Searches across all GeoJSON files and intelligently matches locations
 */

// Floor configuration
const FLOOR_CONFIGS = [
  { key: 'ground', name: 'Ground Floor', file: '/images/smart-campus-map.geojson' },
  { key: '2nd', name: '2nd Floor', file: '/images/2nd-floor-map.geojson' },
  { key: '3rd', name: '3rd Floor', file: '/images/3rd-floor-map.geojson' },
  { key: '4th', name: '4th Floor', file: '/images/4th-floor-map.geojson' }
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
 * Calculate string similarity (Levenshtein distance normalized)
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Quick exact match
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - (matrix[s2.length][s1.length] / maxLen);
}

/**
 * Extract searchable text from a feature
 */
function getSearchableText(feature) {
  const props = feature.properties || {};
  return {
    name: props.Name || props.name || '',
    building: props.Building || props.building || '',
    type: props.Type || props.type || '',
    description: props.Description || props.description || '',
    room: props.Room || props.room || '',
    floor: props.Floor || props.floor || ''
  };
}

/**
 * Score a feature match against search term
 */
function scoreMatch(feature, searchTerm) {
  const search = searchTerm.toLowerCase().trim();
  const searchable = getSearchableText(feature);
  
  let score = 0;
  const scores = {
    exactMatch: 100,
    startsWith: 80,
    contains: 60,
    roomCodeMatch: 70, // Special score for room codes
    wordMatch: 50,
    similarityHigh: 40,
    similarityMed: 20,
    similarityLow: 10
  };

  // Name matching (highest priority)
  const name = searchable.name.toLowerCase();
  if (name === search) {
    score += scores.exactMatch;
  } else if (name.startsWith(search)) {
    score += scores.startsWith;
  } else if (name.includes(search)) {
    score += scores.contains;
  } else {
    const similarity = calculateSimilarity(name, search);
    if (similarity > 0.8) score += scores.similarityHigh;
    else if (similarity > 0.6) score += scores.similarityMed;
    else if (similarity > 0.4) score += scores.similarityLow;
  }

  // Room code matching with special handling for variations
  // e.g., "NB306" should match "N306", "M306"
  const room = searchable.room.toLowerCase();
  if (room) {
    if (room === search) {
      score += scores.exactMatch;
    } else if (room.includes(search) || search.includes(room)) {
      score += scores.contains;
    } else {
      // Handle room code variations: NB306 -> N306, M306
      const searchDigits = search.match(/\d+/)?.[0];
      const roomDigits = room.match(/\d+/)?.[0];
      
      if (searchDigits && roomDigits && searchDigits === roomDigits) {
        // Same number - check if letter prefixes are similar
        const searchLetters = search.replace(/\d+/g, '').replace(/\s+/g, '');
        const roomLetters = room.replace(/\d+/g, '').replace(/\s+/g, '');
        
        if (searchLetters && roomLetters) {
          // Check if search contains room letters or vice versa
          if (searchLetters.includes(roomLetters) || roomLetters.includes(searchLetters)) {
            score += scores.roomCodeMatch;
          } else if (searchLetters[0] === roomLetters[0]) {
            // Same first letter (e.g., N matches NB)
            score += scores.roomCodeMatch * 0.8;
          }
        } else if (!roomLetters) {
          // Room has no letters but numbers match (e.g., "306" matches "NB306")
          score += scores.roomCodeMatch * 0.6;
        }
      }
    }
  }
  
  // Check name for room code patterns too (since room might be in Name field)
  if (!room && name) {
    const searchDigits = search.match(/\d+/)?.[0];
    const nameDigits = name.match(/\d+/)?.[0];
    
    if (searchDigits && nameDigits && searchDigits === nameDigits) {
      const searchLetters = search.replace(/\d+/g, '').replace(/\s+/g, '');
      const nameLetters = name.replace(/\d+/g, '').replace(/\s+/g, '');
      
      if (searchLetters && nameLetters) {
        if (searchLetters.includes(nameLetters) || nameLetters.includes(searchLetters)) {
          score += scores.roomCodeMatch;
        } else if (searchLetters[0] === nameLetters[0]) {
          score += scores.roomCodeMatch * 0.8;
        }
      }
    }
  }

  // Building matching
  const building = searchable.building.toLowerCase();
  if (building && (building.includes(search) || search.includes(building))) {
    score += 30;
  }

  // Type matching
  const type = searchable.type.toLowerCase();
  if (type && (type.includes(search) || search.includes(type))) {
    score += 20;
  }

  // Word-by-word matching
  const searchWords = search.split(/[\s\-_]+/);
  const nameWords = name.split(/[\s\-_]+/);
  
  for (const searchWord of searchWords) {
    for (const nameWord of nameWords) {
      if (nameWord.includes(searchWord) || searchWord.includes(nameWord)) {
        score += scores.wordMatch / searchWords.length;
      }
    }
  }

  // Acronym matching (e.g., "COL" matches "College Of Law")
  if (search.length >= 2 && !/\s/.test(search)) {
    const acronym = nameWords.map(w => w[0]).join('').toLowerCase();
    if (acronym.includes(search) || search.includes(acronym)) {
      score += 35;
    }
  }

  return score;
}

/**
 * Smart search across all floors
 * Returns: { feature, floor, floorKey, coordinates, score }
 */
export async function smartSearch(searchTerm) {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return { results: [], bestMatch: null };
  }

  console.log(`🔍 Smart Search: "${searchTerm}"`);

  // Load all floor data if not cached
  await loadAllFloorData();

  const allMatches = [];

  // Search through all floors
  for (const [floorKey, floorData] of Object.entries(geojsonCache)) {
    if (!floorData || !floorData.data) continue;

    const pointFeatures = floorData.data.features.filter(f => 
      f.geometry.type === 'Point' && 
      (f.properties.Name || f.properties.name)
    );

    for (const feature of pointFeatures) {
      const score = scoreMatch(feature, searchTerm);
      
      if (score > 0) {
        allMatches.push({
          feature,
          floor: floorData.name,
          floorKey,
          coordinates: feature.geometry.coordinates,
          score,
          name: feature.properties.Name || feature.properties.name,
          building: feature.properties.Building || feature.properties.building || 'Main Building',
          type: feature.properties.Type || feature.properties.type || 'Location'
        });
      }
    }
  }

  // Sort by score (highest first)
  allMatches.sort((a, b) => b.score - a.score);

  // Get top 10 results
  const topResults = allMatches.slice(0, 10);

  // Best match (highest score)
  const bestMatch = topResults.length > 0 ? topResults[0] : null;

  if (bestMatch) {
    console.log(`✅ Best match: "${bestMatch.name}" on ${bestMatch.floor} (score: ${bestMatch.score})`);
  } else {
    console.warn(`⚠️ No matches found for: "${searchTerm}"`);
  }

  if (topResults.length > 1) {
    console.log(`📋 Top ${topResults.length} matches:`, topResults.map(r => 
      `${r.name} (${r.floor}, score: ${r.score})`
    ));
  }

  return {
    results: topResults,
    bestMatch,
    searchTerm
  };
}

/**
 * Get suggestions for autocomplete (top 5 matches)
 */
export async function getSearchSuggestions(searchTerm) {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  const { results } = await smartSearch(searchTerm);
  return results.slice(0, 5).map(r => ({
    label: r.name,
    sublabel: `${r.floor} • ${r.building}`,
    floor: r.floorKey,
    coordinates: r.coordinates
  }));
}

/**
 * Clear cache (useful for development)
 */
export function clearSearchCache() {
  geojsonCache = {};
  console.log('🗑️ Search cache cleared');
}

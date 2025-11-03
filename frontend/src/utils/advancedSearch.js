/**
 * Advanced Search Engine for Smart Campus Directory
 * 
 * Features:
 * - Fuzzy matching with typo tolerance
 * - Semantic search with synonyms
 * - Abbreviation and acronym support
 * - Multi-language search support
 * - Relevance scoring and ranking
 * - Search analytics and optimization
 * - Real-time suggestions
 * - Voice search integration
 */

// Levenshtein distance calculation for fuzzy matching
// eslint-disable-next-line no-unused-vars
function levenshteinDistance(str1, str2) {
  const matrix = [];
  const n = str1.length;
  const m = str2.length;

  if (n === 0) return m;
  if (m === 0) return n;

  for (let i = 0; i <= n; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= m; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[n][m];
}

// Jaro-Winkler similarity for better fuzzy matching
function jaroWinklerSimilarity(s1, s2) {
  if (s1.length === 0 && s2.length === 0) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  if (matchWindow < 0) return s1 === s2 ? 1 : 0;

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  if (jaro < 0.7) return jaro;

  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + (0.1 * prefix * (1 - jaro));
}

// Campus-specific synonyms and abbreviations
const CAMPUS_SYNONYMS = {
  // Buildings
  'library': ['lib', 'books', 'study hall', 'reading room', 'learning center'],
  'cafeteria': ['dining', 'food court', 'restaurant', 'canteen', 'mess hall', 'cafe'],
  'laboratory': ['lab', 'research facility', 'testing center'],
  'auditorium': ['hall', 'theater', 'assembly hall', 'lecture hall'],
  'gymnasium': ['gym', 'sports center', 'fitness center', 'recreation center'],
  'administration': ['admin', 'office', 'registrar', 'admissions'],
  'parking': ['car park', 'vehicle area', 'lot'],
  
  // Services
  'restroom': ['bathroom', 'toilet', 'washroom', 'lavatory', 'wc'],
  'information': ['info', 'help desk', 'reception', 'inquiry'],
  'security': ['guard', 'safety', 'protection'],
  'medical': ['health', 'clinic', 'infirmary', 'first aid'],
  'financial': ['finance', 'accounting', 'treasury', 'billing'],
  
  // Academic departments
  'computer science': ['cs', 'computing', 'it', 'information technology'],
  'engineering': ['eng', 'technical'],
  'mathematics': ['math', 'statistics', 'calculus'],
  'science': ['physics', 'chemistry', 'biology'],
  'business': ['commerce', 'management', 'economics'],
  'humanities': ['arts', 'literature', 'history', 'philosophy'],
  
  // Common abbreviations
  'room': ['rm', 'r'],
  'building': ['bldg', 'hall'],
  'floor': ['fl', 'level'],
  'department': ['dept', 'division'],
  'office': ['ofc'],
  'center': ['ctr', 'centre']
};

// Multi-language support
const LANGUAGE_MAPPINGS = {
  en: {
    search: 'Search',
    noResults: 'No results found',
    suggestions: 'Suggestions',
    didYouMean: 'Did you mean'
  },
  es: {
    search: 'Buscar',
    noResults: 'No se encontraron resultados',
    suggestions: 'Sugerencias',
    didYouMean: '¿Quisiste decir'
  },
  fr: {
    search: 'Rechercher',
    noResults: 'Aucun résultat trouvé',
    suggestions: 'Suggestions',
    didYouMean: 'Vouliez-vous dire'
  }
};

class AdvancedSearchEngine {
  constructor(options = {}) {
    this.options = {
      fuzzyThreshold: 0.6,
      maxSuggestions: 10,
      enableVoiceSearch: true,
      enableAnalytics: true,
      cacheResults: true,
      language: 'en',
      ...options
    };

    this.searchIndex = new Map();
    this.searchHistory = [];
    this.popularSearches = new Map();
    this.resultCache = new Map();
    this.searchAnalytics = {
      totalSearches: 0,
      uniqueQueries: new Set(),
      noResultQueries: [],
      popularTerms: new Map()
    };

    this.initializeVoiceSearch();
  }

  // Initialize voice search capabilities
  initializeVoiceSearch() {
    if (!this.options.enableVoiceSearch || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.continuous = false;
    this.speechRecognition.interimResults = false;
    this.speechRecognition.lang = this.options.language === 'es' ? 'es-ES' : 
                                  this.options.language === 'fr' ? 'fr-FR' : 'en-US';

    this.speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.onVoiceResult?.(transcript);
    };

    this.speechRecognition.onerror = (event) => {
      console.warn('Voice search error:', event.error);
      this.onVoiceError?.(event.error);
    };
  }

  // Build search index from data sources
  buildIndex(dataSources) {
    this.searchIndex.clear();
    
    const indexItem = (item, type, priority = 1) => {
      const searchableText = this.extractSearchableText(item, type);
      const normalizedText = this.normalizeText(searchableText);
      
      const indexEntry = {
        id: item.id || item.name || item.title,
        type,
        priority,
        originalItem: item,
        searchableText,
        normalizedText,
        keywords: this.extractKeywords(searchableText),
        synonyms: this.getSynonyms(searchableText)
      };

      this.searchIndex.set(indexEntry.id, indexEntry);
    };

    // Index different data types
    if (dataSources.buildings) {
      dataSources.buildings.forEach(building => indexItem(building, 'building', 1.2));
    }
    
    if (dataSources.rooms) {
      dataSources.rooms.forEach(room => indexItem(room, 'room', 1.1));
    }
    
    if (dataSources.services) {
      dataSources.services.forEach(service => indexItem(service, 'service', 1.0));
    }
    
    if (dataSources.departments) {
      dataSources.departments.forEach(dept => indexItem(dept, 'department', 0.9));
    }
    
    if (dataSources.people) {
      dataSources.people.forEach(person => indexItem(person, 'person', 0.8));
    }

    console.log(`Search index built with ${this.searchIndex.size} entries`);
  }

  // Extract searchable text from different item types
  extractSearchableText(item, type) {
    const texts = [];
    
    switch (type) {
      case 'building':
        texts.push(item.name, item.description, item.location, item.code);
        break;
      case 'room':
        texts.push(item.name, item.number, item.building, item.type, item.description);
        break;
      case 'service':
        texts.push(item.name, item.category, item.description, item.keywords);
        break;
      case 'department':
        texts.push(item.name, item.abbreviation, item.description, item.faculty);
        break;
      case 'person':
        texts.push(item.name, item.title, item.department, item.email);
        break;
    }
    
    return texts.filter(Boolean).join(' ').toLowerCase();
  }

  // Normalize text for consistent searching
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract keywords from text
  extractKeywords(text) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    return text
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit keywords
  }

  // Get synonyms for search terms
  getSynonyms(text) {
    const synonyms = [];
    const words = text.split(/\s+/);
    
    words.forEach(word => {
      Object.entries(CAMPUS_SYNONYMS).forEach(([key, syns]) => {
        if (key.includes(word) || syns.some(syn => syn.includes(word))) {
          synonyms.push(...syns, key);
        }
      });
    });
    
    return [...new Set(synonyms)];
  }

  // Main search function
  search(query, options = {}) {
    const searchOptions = { ...this.options, ...options };
    const normalizedQuery = this.normalizeText(query);
    
    // Check cache first
    const cacheKey = `${normalizedQuery}:${JSON.stringify(searchOptions)}`;
    if (this.options.cacheResults && this.resultCache.has(cacheKey)) {
      return this.resultCache.get(cacheKey);
    }

    // Update analytics
    this.updateSearchAnalytics(query);

    // Perform search
    const results = this.performSearch(normalizedQuery, searchOptions);
    
    // Cache results
    if (this.options.cacheResults) {
      this.resultCache.set(cacheKey, results);
    }

    return results;
  }

  // Core search algorithm
  performSearch(query, options) {
    const results = [];
    const queryTerms = query.split(/\s+/).filter(term => term.length > 0);
    
    for (const [, item] of this.searchIndex) {
      const score = this.calculateRelevanceScore(queryTerms, item, options);
      
      if (score > 0) {
        results.push({
          ...item.originalItem,
          searchScore: score,
          type: item.type,
          matchedText: this.getMatchedText(queryTerms, item)
        });
      }
    }

    // Sort by relevance score and apply limits
    results.sort((a, b) => b.searchScore - a.searchScore);
    
    return {
      results: results.slice(0, options.maxResults || 20),
      suggestions: this.generateSuggestions(query, results),
      correctedQuery: this.getSpellCorrection(query),
      totalFound: results.length,
      query: query
    };
  }

  // Calculate relevance score for search results
  calculateRelevanceScore(queryTerms, item, options) {
    let score = 0;
    const text = item.normalizedText;
    const keywords = item.keywords;
    const synonyms = item.synonyms;

    queryTerms.forEach(term => {
      // Exact match bonus
      if (text.includes(term)) {
        score += 10 * item.priority;
      }

      // Fuzzy matching
      keywords.forEach(keyword => {
        const similarity = jaroWinklerSimilarity(term, keyword);
        if (similarity >= options.fuzzyThreshold) {
          score += similarity * 5 * item.priority;
        }
      });

      // Synonym matching
      synonyms.forEach(synonym => {
        if (synonym.includes(term) || term.includes(synonym)) {
          score += 3 * item.priority;
        }
      });

      // Partial matching
      keywords.forEach(keyword => {
        if (keyword.startsWith(term) || keyword.endsWith(term)) {
          score += 2 * item.priority;
        }
      });
    });

    // Boost popular items
    const popularity = this.popularSearches.get(item.id) || 0;
    score += popularity * 0.1;

    return score;
  }

  // Generate search suggestions
  generateSuggestions(query, results) {
    const suggestions = [];

    // Add popular searches that are similar
    for (const [searchTerm, count] of this.popularSearches) {
      if (searchTerm.includes(query) || query.includes(searchTerm)) {
        suggestions.push({
          text: searchTerm,
          type: 'popular',
          score: count
        });
      }
    }

    // Add partial matches from results
    results.slice(0, 5).forEach(result => {
      const name = result.name || result.title || '';
      if (name.toLowerCase().includes(query)) {
        suggestions.push({
          text: name,
          type: 'result',
          score: result.searchScore
        });
      }
    });

    // Add autocomplete suggestions
    for (const [, item] of this.searchIndex) {
      const text = item.searchableText;
      if (text.includes(query) && !suggestions.find(s => s.text === text)) {
        suggestions.push({
          text: text.split(' ').find(word => word.includes(query)) || text,
          type: 'autocomplete',
          score: item.priority
        });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, this.options.maxSuggestions)
      .map(s => s.text);
  }

  // Spell correction using fuzzy matching
  getSpellCorrection(query) {
    const words = query.split(/\s+/);
    const correctedWords = [];
    let correctionMade = false;

    words.forEach(word => {
      let bestMatch = word;
      let bestScore = 0;

      for (const [, item] of this.searchIndex) {
        item.keywords.forEach(keyword => {
          const similarity = jaroWinklerSimilarity(word, keyword);
          if (similarity > bestScore && similarity > 0.8) {
            bestScore = similarity;
            bestMatch = keyword;
            correctionMade = true;
          }
        });
      }

      correctedWords.push(bestMatch);
    });

    return correctionMade ? correctedWords.join(' ') : null;
  }

  // Get highlighted matched text
  getMatchedText(queryTerms, item) {
    let text = item.searchableText;
    
    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      text = text.replace(regex, '<mark>$1</mark>');
    });
    
    return text;
  }

  // Update search analytics
  updateSearchAnalytics(query) {
    if (!this.options.enableAnalytics) return;

    this.searchAnalytics.totalSearches++;
    this.searchAnalytics.uniqueQueries.add(query);
    
    // Track popular terms
    query.split(/\s+/).forEach(term => {
      const current = this.searchAnalytics.popularTerms.get(term) || 0;
      this.searchAnalytics.popularTerms.set(term, current + 1);
    });

    // Update search history
    this.searchHistory.unshift({
      query,
      timestamp: new Date(),
      results: 0 // Will be updated after search
    });

    // Keep only recent history
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(0, 100);
    }
  }

  // Start voice search
  startVoiceSearch() {
    if (this.speechRecognition) {
      this.speechRecognition.start();
      return true;
    }
    return false;
  }

  // Stop voice search
  stopVoiceSearch() {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }
  }

  // Get search analytics
  getAnalytics() {
    return {
      ...this.searchAnalytics,
      searchHistory: this.searchHistory.slice(0, 20),
      popularSearches: Array.from(this.popularSearches.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      cacheSize: this.resultCache.size,
      indexSize: this.searchIndex.size
    };
  }

  // Clear cache and reset
  clearCache() {
    this.resultCache.clear();
    console.log('Search cache cleared');
  }

  // Export search data for backup
  exportData() {
    return {
      searchHistory: this.searchHistory,
      popularSearches: Array.from(this.popularSearches.entries()),
      analytics: this.searchAnalytics
    };
  }

  // Import search data from backup
  importData(data) {
    if (data.searchHistory) {
      this.searchHistory = data.searchHistory;
    }
    if (data.popularSearches) {
      this.popularSearches = new Map(data.popularSearches);
    }
    if (data.analytics) {
      this.searchAnalytics = { ...this.searchAnalytics, ...data.analytics };
    }
  }
}

// Utility functions for search components
export const SearchUtils = {
  // Debounce function for search input
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Highlight search terms in text
  highlightTerms(text, terms) {
    if (!text || !terms || terms.length === 0) return text;
    
    let highlightedText = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    });
    
    return highlightedText;
  },

  // Extract excerpt around search terms
  getSearchExcerpt(text, terms, maxLength = 150) {
    if (!text || !terms || terms.length === 0) {
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    const firstTerm = terms[0];
    const index = text.toLowerCase().indexOf(firstTerm.toLowerCase());
    
    if (index === -1) {
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, start + maxLength);
    
    let excerpt = text.substring(start, end);
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';
    
    return excerpt;
  },

  // Format search results for display
  formatSearchResult(result, query) {
    const terms = query.toLowerCase().split(/\s+/);
    
    return {
      ...result,
      highlightedName: this.highlightTerms(result.name || result.title || '', terms),
      excerpt: this.getSearchExcerpt(result.description || '', terms),
      relevancePercentage: Math.round(result.searchScore * 10)
    };
  }
};

// Global search engine instance
export const campusSearchEngine = new AdvancedSearchEngine({
  fuzzyThreshold: 0.6,
  maxSuggestions: 8,
  enableVoiceSearch: true,
  enableAnalytics: true,
  cacheResults: true,
  language: 'en'
});

export { AdvancedSearchEngine };
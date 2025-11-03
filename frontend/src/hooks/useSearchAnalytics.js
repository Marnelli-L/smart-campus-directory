import { useState, useEffect } from 'react';

export const useSearchAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading analytics data
    const loadAnalytics = async () => {
      setIsLoading(true);
      
      // In a real app, this would fetch from your analytics service
      const mockAnalytics = {
        totalSearches: 15420,
        uniqueUsers: 3287,
        averageResponseTime: 142,
        popularSearches: [
          ['library', 1250],
          ['cafeteria', 980],
          ['parking', 856],
          ['computer lab', 743],
          ['student services', 692]
        ],
        searchHistory: [
          { query: 'library', timestamp: Date.now() - 1000000, results: 5, responseTime: 120 },
          { query: 'cafeteria', timestamp: Date.now() - 2000000, results: 3, responseTime: 98 },
          { query: 'parking', timestamp: Date.now() - 3000000, results: 8, responseTime: 156 },
          { query: 'xyz building', timestamp: Date.now() - 4000000, results: 0, responseTime: 89 }
        ],
        noResultQueries: ['xyz building', 'pool', 'gym equipment'],
        uniqueQueries: new Set(['library', 'cafeteria', 'parking', 'computer lab'])
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAnalytics(mockAnalytics);
      setIsLoading(false);
    };

    loadAnalytics();
  }, []);

  const recordSearch = (query, results, responseTime) => {
    if (analytics) {
      const newSearch = {
        query,
        timestamp: Date.now(),
        results: results.length,
        responseTime
      };

      setAnalytics(prev => ({
        ...prev,
        totalSearches: prev.totalSearches + 1,
        searchHistory: [newSearch, ...prev.searchHistory.slice(0, 99)], // Keep last 100
        uniqueQueries: new Set([...prev.uniqueQueries, query])
      }));
    }
  };

  return {
    analytics,
    isLoading,
    recordSearch
  };
};
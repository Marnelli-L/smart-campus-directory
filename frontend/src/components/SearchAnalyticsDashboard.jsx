/**
 * Search Analytics and Optimization System
 * 
 * Features:
 * - Real-time search performance tracking
 * - Popular searches dashboard
 * - A/B testing for search improvements
 * - Search result quality metrics
 * - User behavior analytics
 * - Performance optimization recommendations
 */

import React, { useState, useEffect } from 'react';
import { useSearchAnalytics } from '../hooks/useSearchAnalytics';

// Search Performance Monitor Component
export const SearchPerformanceMonitor = () => {
  const { analytics, loading } = useSearchAnalytics();
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageResponseTime: 0,
    successRate: 0,
    totalSearches: 0,
    uniqueUsers: 0
  });

  useEffect(() => {
    if (analytics) {
      // Calculate performance metrics
      const metrics = {
        averageResponseTime: calculateAverageResponseTime(analytics.searchHistory),
        successRate: calculateSuccessRate(analytics.searchHistory),
        totalSearches: analytics.totalSearches,
        uniqueUsers: analytics.uniqueQueries.size
      };
      setPerformanceMetrics(metrics);
    }
  }, [analytics]);

  const calculateAverageResponseTime = (searchHistory) => {
    if (!searchHistory.length) return 0;
    return searchHistory.reduce((acc, search) => acc + (search.responseTime || 0), 0) / searchHistory.length;
  };

  const calculateSuccessRate = (searchHistory) => {
    if (!searchHistory.length) return 0;
    const successfulSearches = searchHistory.filter(search => search.results > 0).length;
    return (successfulSearches / searchHistory.length) * 100;
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Search Performance</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {performanceMetrics.averageResponseTime.toFixed(0)}ms
          </div>
          <div className="text-sm text-gray-600">Avg Response Time</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {performanceMetrics.successRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {performanceMetrics.totalSearches.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Searches</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {performanceMetrics.uniqueUsers.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Unique Users</div>
        </div>
      </div>

      {/* Performance Status */}
      <div className="mt-4 p-3 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Search Performance Status</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            performanceMetrics.successRate > 85 
              ? 'bg-green-100 text-green-800'
              : performanceMetrics.successRate > 70
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {performanceMetrics.successRate > 85 ? 'Excellent' : 
             performanceMetrics.successRate > 70 ? 'Good' : 'Needs Improvement'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Popular Searches Dashboard
export const PopularSearchesDashboard = () => {
  const { analytics, loading } = useSearchAnalytics();

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Popular Searches</h3>
      
      {analytics?.popularSearches?.length > 0 ? (
        <div className="space-y-3">
          {analytics.popularSearches.slice(0, 10).map(([query, count], index) => (
            <div key={query} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div className="flex items-center">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-800">{query}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">{count} searches</span>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(count / analytics.popularSearches[0][1]) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No search data available yet</p>
        </div>
      )}
    </div>
  );
};

// Search Quality Metrics
export const SearchQualityMetrics = () => {
  const { analytics, loading } = useSearchAnalytics();
  const [qualityScore, setQualityScore] = useState(0);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const calculateQualityScore = (analytics) => {
      const factors = {
        successRate: (analytics.searchHistory.filter(s => s.results > 0).length / analytics.searchHistory.length) * 40,
        responseTime: Math.max(0, 30 - (averageResponseTime(analytics.searchHistory) / 100) * 30),
        coverage: Math.min(30, (analytics.uniqueQueries.size / 100) * 30)
      };
      
      return Math.round(Object.values(factors).reduce((a, b) => a + b, 0));
    };

    const averageResponseTime = (searchHistory) => {
      if (!searchHistory.length) return 0;
      return searchHistory.reduce((acc, search) => acc + (search.responseTime || 100), 0) / searchHistory.length;
    };

    const generateRecommendations = (analytics) => {
      const recs = [];
      
      if (analytics.noResultQueries.length > 0) {
        recs.push({
          type: 'warning',
          title: 'High No-Result Queries',
          description: `${analytics.noResultQueries.length} queries returned no results. Consider expanding the search index.`,
          action: 'Review and add missing content'
        });
      }
      
      const avgResponseTime = averageResponseTime(analytics.searchHistory);
      if (avgResponseTime > 200) {
        recs.push({
          type: 'warning',
          title: 'Slow Response Time',
          description: `Average response time is ${avgResponseTime.toFixed(0)}ms. Consider optimizing search algorithms.`,
          action: 'Optimize search performance'
        });
      }
      
      if (analytics.popularSearches.length > 0) {
        recs.push({
          type: 'info',
          title: 'Popular Content',
          description: `"${analytics.popularSearches[0][0]}" is the most searched term. Consider featuring this content.`,
          action: 'Feature popular content'
        });
      }
      
      return recs;
    };

    if (analytics) {
      const score = calculateQualityScore(analytics);
      const recs = generateRecommendations(analytics);
      setQualityScore(score);
      setRecommendations(recs);
    }
  }, [analytics]);

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Search Quality</h3>
      
      {/* Quality Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Quality Score</span>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            qualityScore >= 80 ? 'bg-green-100 text-green-800' :
            qualityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {qualityScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              qualityScore >= 80 ? 'bg-green-500' :
              qualityScore >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${qualityScore}%` }}
          ></div>
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Recommendations</h4>
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className={`p-3 rounded-lg border-l-4 ${
                rec.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                rec.type === 'error' ? 'bg-red-50 border-red-400' :
                'bg-blue-50 border-blue-400'
              }`}>
                <h5 className="font-medium text-gray-800">{rec.title}</h5>
                <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                <button className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium">
                  {rec.action} →
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm">Search system is performing well!</p>
          </div>
        )}
      </div>
    </div>
  );
};

// A/B Testing Component
export const SearchABTesting = () => {
  const [activeTests, setActiveTests] = useState([]);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    // Simulate A/B test data
    setActiveTests([
      {
        id: 'fuzzy-threshold-test',
        name: 'Fuzzy Search Threshold',
        description: 'Testing different fuzzy matching thresholds',
        variants: ['0.6 threshold', '0.7 threshold'],
        status: 'running',
        traffic: 50
      },
      {
        id: 'suggestion-count-test',
        name: 'Suggestion Count',
        description: 'Testing optimal number of search suggestions',
        variants: ['5 suggestions', '8 suggestions'],
        status: 'running',
        traffic: 50
      }
    ]);

    setTestResults([
      {
        id: 'voice-search-test',
        name: 'Voice Search Feature',
        winner: 'Voice Enabled',
        improvement: '+15% user engagement',
        confidence: 95,
        status: 'completed'
      }
    ]);
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">A/B Testing</h3>
      
      {/* Active Tests */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Active Tests</h4>
        {activeTests.length > 0 ? (
          <div className="space-y-3">
            {activeTests.map(test => (
              <div key={test.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-800">{test.name}</h5>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {test.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Variants: {test.variants.join(' vs ')}
                  </span>
                  <span className="text-gray-500">
                    Traffic Split: {test.traffic}% each
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No active tests</p>
        )}
      </div>

      {/* Test Results */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Recent Results</h4>
        {testResults.length > 0 ? (
          <div className="space-y-3">
            {testResults.map(result => (
              <div key={result.id} className="p-4 border border-gray-200 rounded-lg bg-green-50">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-800">{result.name}</h5>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {result.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Winner:</span>
                    <div className="font-medium">{result.winner}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Improvement:</span>
                    <div className="font-medium text-green-600">{result.improvement}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Confidence:</span>
                    <div className="font-medium">{result.confidence}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No test results yet</p>
        )}
      </div>
    </div>
  );
};

// Main Search Analytics Dashboard
const SearchAnalyticsDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SearchPerformanceMonitor />
        <SearchQualityMetrics />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PopularSearchesDashboard />
        <SearchABTesting />
      </div>
    </div>
  );
};

export default SearchAnalyticsDashboard;
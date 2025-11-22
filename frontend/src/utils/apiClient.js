/**
 * Centralized API Client
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Generic fetch wrapper with error handling
 * @param {string} endpoint - API endpoint (e.g., '/api/announcements')
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Response data
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJSON = contentType && contentType.includes('application/json');
    
    if (!response.ok) {
      const errorData = isJSON ? await response.json() : { message: response.statusText };
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }
    
    return isJSON ? await response.json() : await response.text();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * API Client with common methods
 */
export const apiClient = {
  /**
   * GET request
   */
  get: (endpoint, options = {}) => {
    return fetchAPI(endpoint, { method: 'GET', ...options });
  },

  /**
   * POST request
   */
  post: (endpoint, data, options = {}) => {
    return fetchAPI(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  /**
   * PUT request
   */
  put: (endpoint, data, options = {}) => {
    return fetchAPI(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  },

  /**
   * PATCH request
   */
  patch: (endpoint, data, options = {}) => {
    return fetchAPI(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  },

  /**
   * DELETE request
   */
  delete: (endpoint, options = {}) => {
    return fetchAPI(endpoint, { method: 'DELETE', ...options });
  },

  /**
   * Upload file with FormData
   */
  upload: (endpoint, formData, options = {}) => {
    // Remove Content-Type header for FormData (browser sets it automatically with boundary)
    const { headers: _headers, ...restOptions } = options;
    return fetchAPI(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type with boundary
      ...restOptions,
    });
  },
};

/**
 * Export the base URL for direct use
 */
export const API_URL = API_BASE_URL;

export default apiClient;

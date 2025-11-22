import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/apiClient';

/**
 * useFeedback - Custom hook for managing feedback
 * Handles CRUD operations for feedback, reports, and visitor feedback
 * 
 * @param {string} type - 'feedback', 'reports', or 'visitor-feedback'
 * @returns {Object} Feedback data and operations
 */
export const useFeedback = (type = 'feedback') => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map type to endpoint
  const getEndpoint = useCallback(() => {
    const endpoints = {
      feedback: '/feedback',
      reports: '/reports',
      'visitor-feedback': '/visitor-feedback',
    };
    return `${API_URL}${endpoints[type] || endpoints.feedback}`;
  }, [type]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(getEndpoint());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setItems(data || []);
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [type, getEndpoint]);

  // Create item
  const createItem = useCallback(async (itemData) => {
    try {
      const response = await fetch(getEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create ${type}`);
      }

      const newItem = await response.json();
      setItems(prev => [newItem, ...prev]);
      return { success: true, data: newItem };
    } catch (err) {
      console.error(`Error creating ${type}:`, err);
      return { success: false, error: err.message };
    }
  }, [type, getEndpoint]);

  // Update item
  const updateItem = useCallback(async (id, itemData) => {
    try {
      const response = await fetch(`${getEndpoint()}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${type}`);
      }

      const updatedItem = await response.json();
      setItems(prev =>
        prev.map(item => (item.id === id ? updatedItem : item))
      );
      return { success: true, data: updatedItem };
    } catch (err) {
      console.error(`Error updating ${type}:`, err);
      return { success: false, error: err.message };
    }
  }, [type, getEndpoint]);

  // Delete item
  const deleteItem = useCallback(async (id) => {
    try {
      const response = await fetch(`${getEndpoint()}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${type}`);
      }

      setItems(prev => prev.filter(item => item.id !== id));
      return { success: true };
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      return { success: false, error: err.message };
    }
  }, [type, getEndpoint]);

  // Bulk delete
  const bulkDeleteItems = useCallback(async (ids) => {
    try {
      const response = await fetch(`${getEndpoint()}/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${type}`);
      }

      setItems(prev => prev.filter(item => !ids.includes(item.id)));
      return { success: true };
    } catch (err) {
      console.error(`Error bulk deleting ${type}:`, err);
      return { success: false, error: err.message };
    }
  }, [type, getEndpoint]);

  // Update status (for reports)
  const updateStatus = useCallback(async (id, status, notes = '') => {
    try {
      const response = await fetch(`${getEndpoint()}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${type} status`);
      }

      const updatedItem = await response.json();
      setItems(prev =>
        prev.map(item => (item.id === id ? updatedItem : item))
      );
      return { success: true, data: updatedItem };
    } catch (err) {
      console.error(`Error updating ${type} status:`, err);
      return { success: false, error: err.message };
    }
  }, [type, getEndpoint]);

  // Load items on mount or when type changes
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    bulkDeleteItems,
    updateStatus,
  };
};

export default useFeedback;

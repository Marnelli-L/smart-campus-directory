import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/apiClient';

/**
 * useBuildings - Custom hook for managing buildings
 * Handles CRUD operations and state management for buildings
 * 
 * @returns {Object} Building data and operations
 */
export const useBuildings = () => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch buildings
  const fetchBuildings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/buildings`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setBuildings(data || []);
    } catch (err) {
      console.error('Error fetching buildings:', err);
      setError(err.message);
      setBuildings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create building
  const createBuilding = useCallback(async (formData) => {
    try {
      const response = await fetch(`${API_URL}/buildings`, {
        method: 'POST',
        body: formData, // FormData for image upload
      });

      if (!response.ok) {
        throw new Error('Failed to create building');
      }

      const newBuilding = await response.json();
      setBuildings(prev => [...prev, newBuilding]);
      return { success: true, data: newBuilding };
    } catch (err) {
      console.error('Error creating building:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Update building
  const updateBuilding = useCallback(async (id, formData) => {
    try {
      const response = await fetch(`${API_URL}/buildings/${id}`, {
        method: 'PUT',
        body: formData, // FormData for image upload
      });

      if (!response.ok) {
        throw new Error('Failed to update building');
      }

      const updatedBuilding = await response.json();
      setBuildings(prev =>
        prev.map(building => (building.id === id ? updatedBuilding : building))
      );
      return { success: true, data: updatedBuilding };
    } catch (err) {
      console.error('Error updating building:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Delete building
  const deleteBuilding = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_URL}/buildings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete building');
      }

      setBuildings(prev => prev.filter(building => building.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting building:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Bulk delete
  const bulkDeleteBuildings = useCallback(async (ids) => {
    try {
      const response = await fetch(`${API_URL}/buildings/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete buildings');
      }

      setBuildings(prev => prev.filter(building => !ids.includes(building.id)));
      return { success: true };
    } catch (err) {
      console.error('Error bulk deleting buildings:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Load buildings on mount
  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  return {
    buildings,
    loading,
    error,
    fetchBuildings,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    bulkDeleteBuildings,
  };
};

export default useBuildings;

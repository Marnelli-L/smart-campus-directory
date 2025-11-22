import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/apiClient';

/**
 * useAnnouncements - Custom hook for managing announcements
 * Handles CRUD operations and state management for announcements
 * 
 * @returns {Object} Announcement data and operations
 */
export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/announcements`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err.message);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create announcement
  const createAnnouncement = useCallback(async (announcementData) => {
    try {
      const response = await fetch(`${API_URL}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementData),
      });

      if (!response.ok) {
        throw new Error('Failed to create announcement');
      }

      const newAnnouncement = await response.json();
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      return { success: true, data: newAnnouncement };
    } catch (err) {
      console.error('Error creating announcement:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Update announcement
  const updateAnnouncement = useCallback(async (id, announcementData) => {
    try {
      const response = await fetch(`${API_URL}/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementData),
      });

      if (!response.ok) {
        throw new Error('Failed to update announcement');
      }

      const updatedAnnouncement = await response.json();
      setAnnouncements(prev =>
        prev.map(ann => (ann.id === id ? updatedAnnouncement : ann))
      );
      return { success: true, data: updatedAnnouncement };
    } catch (err) {
      console.error('Error updating announcement:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Delete announcement
  const deleteAnnouncement = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_URL}/announcements/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      setAnnouncements(prev => prev.filter(ann => ann.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting announcement:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Bulk delete
  const bulkDeleteAnnouncements = useCallback(async (ids) => {
    try {
      const response = await fetch(`${API_URL}/announcements/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcements');
      }

      setAnnouncements(prev => prev.filter(ann => !ids.includes(ann.id)));
      return { success: true };
    } catch (err) {
      console.error('Error bulk deleting announcements:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Load announcements on mount
  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return {
    announcements,
    loading,
    error,
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    bulkDeleteAnnouncements,
  };
};

export default useAnnouncements;

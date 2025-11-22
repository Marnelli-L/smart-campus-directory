// Shared hook for Admin components to access common state and functions
import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const useAdminState = () => {
  // State declarations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data collections
  const [announcements, setAnnouncements] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [reports, setReports] = useState([]);
  const [visitorFeedback, setVisitorFeedback] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  
  // Dashboard context
  const [activityFeed, setActivityFeed] = useState([]);
  const [auditStats, setAuditStats] = useState({ total: 0, created: 0, updated: 0, deleted: 0 });

  // Helper function to add activity log
  const addActivityLog = useCallback(async (action, description, entity = 'System', metadata = {}) => {
    const timestamp = new Date().toLocaleString();
    const newLog = { action, description, timestamp };
    setActivityFeed(prev => [newLog, ...prev].slice(0, 50));

    // Send to database
    try {
      const response = await fetch(`${API_URL}/api/audit-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          entity,
          description,
          metadata,
          user_name: 'Admin'
        })
      });
      
      if (response.ok) {
        // Audit log will be refetched by component
      }
    } catch (error) {
      console.error('Failed to create audit log entry:', error);
    }
  }, []);

  // Fetch audit log from database
  const fetchAuditLog = useCallback(async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', '200');
      
      const response = await fetch(`${API_URL}/api/audit-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLog(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching audit log:', error);
    }
  }, []);

  // Fetch audit log statistics
  const fetchAuditStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/audit-log/stats`);
      if (response.ok) {
        const data = await response.json();
        setAuditStats(data.data || { total: 0, created: 0, updated: 0, deleted: 0 });
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  }, []);

  return {
    // State
    loading,
    setLoading,
    error,
    setError,
    announcements,
    setAnnouncements,
    feedback,
    setFeedback,
    reports,
    setReports,
    visitorFeedback,
    setVisitorFeedback,
    buildings,
    setBuildings,
    auditLog,
    setAuditLog,
    activityFeed,
    setActivityFeed,
    auditStats,
    setAuditStats,
    
    // Functions
    addActivityLog,
    fetchAuditLog,
    fetchAuditStats,
    
    // API_URL for use in components
    API_URL
  };
};

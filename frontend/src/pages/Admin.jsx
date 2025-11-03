import React, { useState, useEffect, useCallback } from "react";

// Centralized API base URL and safe fetch patch
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// In production builds, some legacy calls still point to localhost.
// Patch window.fetch once to rewrite those URLs to the configured API_URL.
if (typeof window !== 'undefined' && !window.__apiFetchPatched) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string') {
        if (input.startsWith('http://localhost:5000')) {
          input = input.replace('http://localhost:5000', API_URL);
        } else if (input.startsWith('/api/')) {
          input = `${API_URL}${input}`;
        }
      }
    } catch {
      // ignore and fall back to original input
    }
    return originalFetch(input, init);
  };
  window.__apiFetchPatched = true;
}

// Enhanced nav links with section categories for possible RBAC expansion
const navLinks = [
  { name: "Dashboard" },
  { name: "Announcements" },
  { name: "Directory" },
  { name: "Buildings" },
  { name: "Feedback" },
  { name: "Audit Log" },
];

const Admin = ({ setIsAuthenticated }) => {
  // State declarations
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [modal, setModal] = useState(null);

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    type: 'danger',
  });

  // Toast notification state
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success',
  });

  const showToast = (type, message) => {
    setToast({ isVisible: true, message, type });
    setTimeout(() => {
      setToast({ isVisible: false, message: '', type: 'success' });
    }, 4000);
  };

  const showDeleteToast = (message) => {
    setToast({ isVisible: true, message, type: 'delete' });
    setTimeout(() => {
      setToast({ isVisible: false, message: '', type: 'success' });
    }, 4000);
  };

  // Data collections
  const [announcements, setAnnouncements] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dashboard context
  const [activityFeed, setActivityFeed] = useState([]);
  const [systemHealth] = useState({
    uptime: "99.99%",
    lastSync: "Just now",
    errors: [],
  });
  const [role] = useState("Super Admin");
  const [globalSearch, setGlobalSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Building management
  const [buildingFilter, setBuildingFilter] = useState({
    category: "",
    status: "",
  });
  const [imagePreview, setImagePreview] = useState(null);

  // Selection states for bulk delete and audit
  const [selectedAnnouncements, setSelectedAnnouncements] = useState([]);
  const [selectedBuildings, setSelectedBuildings] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [selectedVisitorFeedback, setSelectedVisitorFeedback] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [auditFilter, setAuditFilter] = useState({ action: '', entity: '' });
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStats, setAuditStats] = useState({ total: 0, created: 0, updated: 0, deleted: 0 });

  // Selection mode states (like Shopee/Lazada)
  const [isSelectingAnnouncements, setIsSelectingAnnouncements] = useState(false);
  const [isSelectingBuildings, setIsSelectingBuildings] = useState(false);
  const [isSelectingFeedback, setIsSelectingFeedback] = useState(false);
  const [isSelectingReports, setIsSelectingReports] = useState(false);
  const [isSelectingVisitorFeedback, setIsSelectingVisitorFeedback] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Feedback management
  const [feedbackFilter, setFeedbackFilter] = useState({
    building: "",
    status: "",
    urgency: "",
    topic: "",
    severity: "",
    type: 'feedback',
    rating: "",
  });
  const [reports, setReports] = useState([]);
  const [visitorFeedback, setVisitorFeedback] = useState([]);

  // Helper function to add activity log
  const addActivityLog = async (action, description, entity = 'System', metadata = {}) => {
    const timestamp = new Date().toLocaleString();
    const newLog = { action, description, timestamp };
    setActivityFeed(prev => [newLog, ...prev].slice(0, 50));

    // Send to database
    try {
      const response = await fetch('http://localhost:5000/api/audit-log', {
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
        // Refresh audit log to show the new entry
        fetchAuditLog();
      }
    } catch (error) {
      console.error('Failed to create audit log entry:', error);
    }

    console.log(`[${timestamp}] ${entity} ${action}: ${description}`);
  };

  // Fetch audit log from database
  const fetchAuditLog = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (auditFilter.action) params.append('action', auditFilter.action);
      if (auditFilter.entity) params.append('entity', auditFilter.entity);
      if (auditSearch) params.append('search', auditSearch);
      params.append('limit', '200'); // Fetch last 200 entries
      
      const response = await fetch(`http://localhost:5000/api/audit-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLog(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching audit log:', error);
    }
  }, [auditFilter.action, auditFilter.entity, auditSearch]);

  // Fetch audit log statistics
  const fetchAuditStats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/audit-log/stats');
      if (response.ok) {
        const data = await response.json();
        setAuditStats(data.data || { total: 0, created: 0, updated: 0, deleted: 0 });
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  }, []);

  // Effect to fetch audit log when filters change
  useEffect(() => {
    if (activeNav === 'Audit Log') {
      fetchAuditLog();
      fetchAuditStats();
    }
  }, [auditFilter, auditSearch, activeNav, fetchAuditLog, fetchAuditStats]);

  useEffect(() => {
    // Remove localStorage persistence since we're using database now
    // This effect is kept empty for backward compatibility
  }, [auditLog]);

  // Helper function to handle quick actions (modal opening)
  const handleQuickAction = (actionType) => {
    setModal(actionType);
  };

  // Data normalization helpers keep API responses consistent in UI
  const normalizeAnnouncement = (item = {}) => {
    const rawTags = Array.isArray(item.tags)
      ? item.tags
      : typeof item.tags === 'string' && item.tags.trim().length > 0
        ? item.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];
    return {
      ...item,
      title: item.title || item.announcement_title || item.heading || 'Untitled Announcement',
      content: item.content || item.body || '',
      tags: rawTags,
      status: item.status || 'Draft',
      priority: item.priority || 'Normal',
    };
  };

  const normalizeFeedbackEntry = (item = {}) => ({
    id: item.id,
    name: item.name || item.full_name || 'Anonymous',
    email: item.email || 'Not provided',
    message: item.message || item.feedback || '',
    date: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A',
    status: item.status || 'New',
  });

  const normalizeReportEntry = (item = {}) => ({
    id: item.id,
    name: item.name || 'Unknown Reporter',
    email: item.email || 'Not provided',
    issue_type: item.issue_type || 'General',
    description: item.description || '',
    severity: item.severity || 'Medium',
    status: item.status || 'New',
    assigned_to: item.assigned_to || 'Unassigned',
    date: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A',
  });

  const normalizeVisitorFeedbackEntry = (item = {}) => ({
    id: item.id,
    name: item.name || 'Visitor',
    contact: item.contact || 'Not provided',
    services_visited: item.services_visited || '',
    feedback: item.feedback || '',
    rating: item.rating !== null && item.rating !== undefined ? Number(item.rating) : null,
    date: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A',
  });

  // Fetch announcements, feedback, buildings, analytics, etc.
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component
    
    // Fetch Announcements
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/announcements/admin/all', {
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format - expected JSON");
        }
        
        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        
        if (isMounted) {
          setAnnouncements(rows.map(normalizeAnnouncement));
          console.log(`✅ Loaded ${rows.length} announcements`);
        }
      } catch (error) {
        console.error('❌ Error fetching announcements:', error);
        if (isMounted) {
          setAnnouncements([]);
          setError('Failed to load announcements. Please check your connection.');
        }
      }
    };

    // Fetch Feedback
    const fetchFeedback = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/feedback', {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        
        if (isMounted) {
          setFeedback(rows.map(normalizeFeedbackEntry));
          console.log(`✅ Loaded ${rows.length} feedback entries`);
        }
      } catch (error) {
        console.error('❌ Error fetching feedback:', error);
        if (isMounted) setFeedback([]);
      }
    };

    // Fetch Reports
    const fetchReports = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/reports', {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        
        if (isMounted) {
          setReports(rows.map(normalizeReportEntry));
          console.log(`✅ Loaded ${rows.length} reports`);
        }
      } catch (error) {
        console.error('❌ Error fetching reports:', error);
        if (isMounted) setReports([]);
      }
    };

    // Fetch Visitor Feedback
    const fetchVisitorFeedback = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/visitor-feedback', {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        
        if (isMounted) {
          setVisitorFeedback(rows.map(normalizeVisitorFeedbackEntry));
          console.log(`✅ Loaded ${rows.length} visitor feedback entries`);
        }
      } catch (error) {
        console.error('❌ Error fetching visitor feedback:', error);
        if (isMounted) setVisitorFeedback([]);
      }
    };

    // Fetch Buildings
    const fetchBuildings = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/buildings', {
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const rows = Array.isArray(data) ? data : [];
        
        if (isMounted) {
          setBuildings(rows);
          console.log(`✅ Loaded ${rows.length} directory entries`);
        }
      } catch (error) {
        console.error('❌ Error fetching buildings:', error);
        if (isMounted) setBuildings([]);
      }
    };

    // Initial load - sequential to avoid overwhelming the server
    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchAnnouncements(),
          fetchFeedback(),
          fetchReports(),
          fetchVisitorFeedback(),
          fetchBuildings()
        ]);
        
        if (isMounted) {
          console.log('✅ All data loaded successfully');
        }
      } catch (error) {
        console.error('❌ Error loading data:', error);
        if (isMounted) {
          setError('Some data failed to load. Please refresh the page.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadAllData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  const deleteAnnouncement = async (id) => {
    const announcement = announcements.find(a => a.id === id);
    try {
      const response = await fetch(`http://localhost:5000/api/announcements/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete announcement');
      setAnnouncements(announcements.filter(a => a.id !== id));
      // Backend already logs to audit_log
      showDeleteToast(`Announcement "${announcement?.title || 'Unknown'}" has been removed.`);
      setError(null);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showToast('error', 'Failed to delete announcement. Please try again or check your connection.');
      setError('Failed to delete announcement');
    }
  };

  // Add new announcement
  const addAnnouncement = async (announcement) => {
    try {
      const response = await fetch('http://localhost:5000/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcement)
      });
      
      if (!response.ok) throw new Error('Failed to add announcement');
      const createdPayload = await response.json();
      const createdRecord = normalizeAnnouncement(createdPayload.data || createdPayload);
      setAnnouncements([...announcements, createdRecord]);
      // Backend already logs to audit_log
      showToast('success', `Announcement "${createdRecord.title}" has been created successfully.`);
      setError(null);
      setModal(null);
    } catch (error) {
      console.error('Error adding announcement:', error);
      showToast('error', 'Failed to create announcement. Please check your connection and try again.');
      setError('Failed to save announcement');
    }
  };

  // Edit existing announcement
  const editAnnouncement = async (id, updatedData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      
      if (!response.ok) throw new Error('Failed to update announcement');
      const updatedPayload = await response.json();
      const updatedRecord = normalizeAnnouncement(updatedPayload.data || updatedPayload);
      setAnnouncements(announcements.map(a => a.id === id ? updatedRecord : a));
      // Backend already logs to audit_log
      showToast('success', `Announcement "${updatedRecord.title}" has been updated successfully.`);
      setError(null);
      setModal(null);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating announcement:', error);
      showToast('error', 'Failed to update announcement. Please check your connection and try again.');
      setError('Failed to update announcement');
    }
  };

  // Bulk delete announcements
  const bulkDeleteAnnouncements = async () => {
    if (selectedAnnouncements.length === 0) return;
    
    try {
      // Use bulk delete endpoint
      const response = await fetch('http://localhost:5000/api/announcements/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedAnnouncements })
      });

      if (!response.ok) {
        throw new Error('Bulk delete failed');
      }

      const data = await response.json();
      
      setAnnouncements(announcements.filter(a => !selectedAnnouncements.includes(a.id)));
      // Backend already logs bulk delete to audit_log
      showDeleteToast(`${data.count || selectedAnnouncements.length} announcement(s) have been removed.`);
      setSelectedAnnouncements([]);
    } catch (error) {
      console.error('❌ Error bulk deleting announcements:', error);
      showToast('error', 'Failed to delete some announcements. Please try again.');
    }
  };

  // Bulk delete buildings
  const bulkDeleteBuildings = async () => {
    if (selectedBuildings.length === 0) return;
    
    try {
      // Use bulk delete endpoint
      const response = await fetch('http://localhost:5000/api/buildings/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedBuildings })
      });

      if (!response.ok) {
        throw new Error('Bulk delete failed');
      }

      const data = await response.json();
      
      setBuildings(buildings.filter(b => !selectedBuildings.includes(b.id)));
      // Backend already logs bulk delete to audit_log
      showDeleteToast(`${data.count || selectedBuildings.length} directory entry/entries have been removed.`);
      setSelectedBuildings([]);
    } catch (error) {
      console.error('❌ Error bulk deleting buildings:', error);
      showToast('error', 'Failed to delete some directory entries. Please try again.');
    }
  };

  // Bulk delete feedback
  const bulkDeleteFeedback = async () => {
    if (selectedFeedback.length === 0) return;
    
    try {
      // Use bulk delete endpoint
      const response = await fetch('http://localhost:5000/api/feedback/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedFeedback })
      });

      if (!response.ok) {
        throw new Error('Bulk delete failed');
      }

      const data = await response.json();
      
      setFeedback(feedback.filter(f => !selectedFeedback.includes(f.id)));
      // Backend already logs bulk delete to audit_log
      showDeleteToast(`${data.count || selectedFeedback.length} feedback item(s) have been removed.`);
      setSelectedFeedback([]);
    } catch (error) {
      console.error('❌ Error bulk deleting feedback:', error);
      showToast('error', 'Failed to delete some feedback. Please try again.');
    }
  };

  // Bulk delete visitor feedback
  const bulkDeleteVisitorFeedback = async () => {
    if (selectedVisitorFeedback.length === 0) return;
    
    try {
      // Use bulk delete endpoint
      const response = await fetch('http://localhost:5000/api/visitor-feedback/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedVisitorFeedback })
      });

      if (!response.ok) {
        throw new Error('Bulk delete failed');
      }

      const data = await response.json();
      
      setVisitorFeedback(visitorFeedback.filter(v => !selectedVisitorFeedback.includes(v.id)));
      // Backend already logs bulk delete to audit_log
      showDeleteToast(`${data.count || selectedVisitorFeedback.length} visitor feedback item(s) have been removed.`);
      setSelectedVisitorFeedback([]);
    } catch (error) {
      console.error('❌ Error bulk deleting visitor feedback:', error);
      showToast('error', 'Failed to delete some visitor feedback. Please try again.');
    }
  };

  // Bulk delete reports
  const bulkDeleteReports = async () => {
    if (selectedReports.length === 0) return;
    
    try {
      // Use bulk delete endpoint
      const response = await fetch('http://localhost:5000/api/reports/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedReports })
      });

      if (!response.ok) {
        throw new Error('Bulk delete failed');
      }

      const data = await response.json();
      
      setReports(reports.filter(r => !selectedReports.includes(r.id)));
      // Backend already logs bulk delete to audit_log
      showDeleteToast(`${data.count || selectedReports.length} report(s) have been removed.`);
      setSelectedReports([]);
    } catch (error) {
      console.error('❌ Error bulk deleting reports:', error);
      showToast('error', 'Failed to delete some reports. Please try again.');
    }
  };

  // Feedback status update and assignment
  // Update feedback status (available for future use in inline status changes)
  const _updateFeedbackStatus = async (id, status) => {
    try {
      // Update local state immediately for responsiveness
      setFeedback(feedback.map(fb => fb.id === id ? { ...fb, status } : fb));
      
      // Map UI status back to API status
      const apiStatus = status === 'Open' ? 'New' : status === 'In Progress' ? 'Read' : status;
      
      // Call API to persist the change
      const response = await fetch(`http://localhost:5000/api/feedback/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: apiStatus })
      });
      
      if (!response.ok) {
        console.error('Failed to update feedback status');
        // Revert on error
        setFeedback(feedback.map(fb => fb.id === id ? { ...fb, status: fb.status } : fb));
      }
      // Backend already logs status update to audit_log
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  // Refresh all feedback data
  const refreshFeedbackData = async () => {
    setLoading(true);
    console.log('🔄 Refreshing all feedback data...');
    
    try {
      // Fetch all feedback types in parallel
      const [feedbackResponse, reportsResponse, visitorResponse] = await Promise.allSettled([
        fetch('http://localhost:5000/api/feedback', {
          headers: { 'Accept': 'application/json' }
        }),
        fetch('http://localhost:5000/api/reports', {
          headers: { 'Accept': 'application/json' }
        }),
        fetch('http://localhost:5000/api/visitor-feedback', {
          headers: { 'Accept': 'application/json' }
        })
      ]);
      
      // Process feedback
      if (feedbackResponse.status === 'fulfilled' && feedbackResponse.value.ok) {
        const data = await feedbackResponse.value.json();
        if (data.data && Array.isArray(data.data)) {
          setFeedback(data.data.map(normalizeFeedbackEntry));
          console.log(`✅ Refreshed ${data.data.length} feedback entries`);
        }
      } else {
        console.error('❌ Failed to refresh feedback');
      }
      
      // Process reports
      if (reportsResponse.status === 'fulfilled' && reportsResponse.value.ok) {
        const data = await reportsResponse.value.json();
        if (data.data && Array.isArray(data.data)) {
          setReports(data.data.map(normalizeReportEntry));
          console.log(`✅ Refreshed ${data.data.length} reports`);
        }
      } else {
        console.error('❌ Failed to refresh reports');
      }
      
      // Process visitor feedback
      if (visitorResponse.status === 'fulfilled' && visitorResponse.value.ok) {
        const data = await visitorResponse.value.json();
        if (data.data && Array.isArray(data.data)) {
          setVisitorFeedback(data.data.map(normalizeVisitorFeedbackEntry));
          console.log(`✅ Refreshed ${data.data.length} visitor feedback entries`);
        }
      } else {
        console.error('❌ Failed to refresh visitor feedback');
      }
      
      addActivityLog('System', 'Feedback data refreshed successfully', 'Feedback Center');
      showToast('success', 'Feedback data refreshed successfully');
      console.log('✅ Feedback data refresh complete');
    } catch (error) {
      console.error('❌ Error refreshing feedback:', error);
      addActivityLog('System', 'Failed to refresh feedback data', 'Feedback Center', { error: error.message });
      showToast('error', 'Failed to refresh some feedback data');
    } finally {
      setLoading(false);
    }
  };

  // Building CRUD with API integration
  const addBuilding = async (building) => {
    try {
      const formData = new FormData();
      formData.append('name', building.name);
      formData.append('location', building.location || building.info || '');
      formData.append('contact', building.contact || '');
      formData.append('email', building.email || '');
      formData.append('staff', building.staff || '');
      formData.append('office_hours', building.office_hours || building.hours || 'Mon-Fri 8:00am-5:00pm');
      formData.append('category', building.category || 'General');
      formData.append('status', building.status || 'open');
      formData.append('announcement', building.announcement || '');
      
      // Add image file if present
      if (building.image) {
        formData.append('image', building.image);
      }

      const response = await fetch('http://localhost:5000/api/buildings', {
        method: 'POST',
        body: formData // Don't set Content-Type header, browser will set it with boundary
      });
      
      if (!response.ok) throw new Error('Failed to add building');
    const newBuilding = await response.json();
    setBuildings([...buildings, newBuilding]);
    // Backend already logs to audit_log
    showToast('success', `Directory entry "${newBuilding.name || building.name}" has been created successfully.`);
      setError(null);
    } catch (error) {
      console.error('Error adding building:', error);
      showToast('error', `Failed to create directory entry. Please check your connection and try again.`);
      setError('Failed to save to server. Changes saved locally.');
    } finally {
      setModal(null);
    }
  };

  const editBuilding = async (id, updated) => {
    try {
      const formData = new FormData();
      formData.append('name', updated.name);
      formData.append('location', updated.location || updated.info || '');
      formData.append('contact', updated.contact || '');
      formData.append('email', updated.email || '');
      formData.append('staff', updated.staff || '');
      formData.append('office_hours', updated.office_hours || updated.hours || 'Mon-Fri 8:00am-5:00pm');
      formData.append('category', updated.category || 'General');
      formData.append('status', updated.status || 'open');
      formData.append('announcement', updated.announcement || '');
      
      // Add image file if new one is provided
      if (updated.image && updated.image instanceof File) {
        formData.append('image', updated.image);
      } else if (updated.existingImage) {
        // Keep existing image if no new upload
        formData.append('image', updated.existingImage);
      }

      const response = await fetch(`http://localhost:5000/api/buildings/${id}`, {
        method: 'PUT',
        body: formData // Don't set Content-Type header, browser will set it with boundary
      });
      
      if (!response.ok) throw new Error('Failed to update building');
    const updatedBuilding = await response.json();
    setBuildings(buildings.map(b => b.id === id ? updatedBuilding : b));
    // Backend already logs to audit_log
    showToast('success', `Directory entry "${updatedBuilding.name || updated.name}" has been updated successfully.`);
      setError(null);
    } catch (error) {
      console.error('Error updating building:', error);
      showToast('error', `Failed to update directory entry. Please check your connection and try again.`);
      setError('Failed to save to server. Changes saved locally.');
    } finally {
      setModal(null);
      setEditingItem(null);
    }
  };

  const deleteBuilding = async (id) => {
    const building = buildings.find(b => b.id === id);
    try {
      const response = await fetch(`http://localhost:5000/api/buildings/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete building');
      setBuildings(buildings.filter(b => b.id !== id));
      // Backend already logs to audit_log, no need to log here
      showDeleteToast(`Directory entry "${building?.name || 'Unknown'}" has been removed.`);
      setError(null);
    } catch (error) {
      console.error('Error deleting building:', error);
      showToast('error', `Failed to delete directory entry. Please try again or check your connection.`);
      setError('Failed to delete from server. Removed locally.');
    }
  };

  // Directory export
  const exportDirectory = (e) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      console.log('📊 Exporting directory data...', buildings.length, 'entries');
      
      if (!buildings || buildings.length === 0) {
        showToast('warning', 'No directory entries to export');
        return;
      }
      
      // Create CSV content with correct field names
      const headers = ['ID', 'Name', 'Category', 'Location', 'Contact', 'Email', 'Staff', 'Office Hours', 'Status', 'Announcement'];
      const csvRows = [headers.join(',')];
      
      // Add building data with proper field mapping
      buildings.forEach(building => {
        const row = [
          building.id || '',
          `"${(building.name || '').replace(/"/g, '""')}"`,
          `"${(building.category || '').replace(/"/g, '""')}"`,
          `"${(building.location || building.info || '').replace(/"/g, '""')}"`,
          `"${(building.contact || '').replace(/"/g, '""')}"`,
          `"${(building.email || '').replace(/"/g, '""')}"`,
          `"${(building.staff || '').replace(/"/g, '""')}"`,
          `"${(building.office_hours || building.hours || '').replace(/"/g, '""')}"`,
          `"${(building.status || '').replace(/"/g, '""')}"`,
          `"${(building.announcement || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      // Create blob and download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `directory-export-${date}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      addActivityLog('Exported', `Directory data exported (${buildings.length} entries)`, 'Directory', { count: buildings.length });
      showToast('success', `Successfully exported ${buildings.length} directory entries to CSV`);
      console.log('✅ Export completed successfully');
    } catch (error) {
      console.error('❌ Export error:', error);
      showToast('error', 'Failed to export directory data. Please try again.');
    }
  };
  
  // Global search handler and filtered data
  const handleGlobalSearch = (e) => {
    setGlobalSearch(e.target.value);
  };

  // Apply global search filter to all data types
  const searchLower = globalSearch.toLowerCase().trim();
  
  const filteredAnnouncements = announcements.filter(ann => {
    if (!searchLower) return true;
    return (
      ann.title?.toLowerCase().includes(searchLower) ||
      ann.content?.toLowerCase().includes(searchLower) ||
      ann.category?.toLowerCase().includes(searchLower) ||
      ann.priority?.toLowerCase().includes(searchLower) ||
      ann.created_by?.toLowerCase().includes(searchLower) ||
      (ann.tags && Array.isArray(ann.tags) && ann.tags.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  });

  const filteredBuildings = buildings.filter(bldg => {
    if (!searchLower) return true;
    // Apply category filter first
    if (buildingFilter.category && bldg.category !== buildingFilter.category) return false;
    // Then apply search
    return (
      bldg.name?.toLowerCase().includes(searchLower) ||
      bldg.location?.toLowerCase().includes(searchLower) ||
      bldg.info?.toLowerCase().includes(searchLower) ||
      bldg.contact?.toLowerCase().includes(searchLower) ||
      bldg.email?.toLowerCase().includes(searchLower) ||
      bldg.staff?.toLowerCase().includes(searchLower) ||
      bldg.category?.toLowerCase().includes(searchLower)
    );
  });

  const filteredFeedback = feedback.filter(fb => {
    if (!searchLower) return true;
    return (
      fb.name?.toLowerCase().includes(searchLower) ||
      fb.email?.toLowerCase().includes(searchLower) ||
      fb.building?.toLowerCase().includes(searchLower) ||
      fb.message?.toLowerCase().includes(searchLower) ||
      fb.topic?.toLowerCase().includes(searchLower) ||
      fb.status?.toLowerCase().includes(searchLower)
    );
  });

  const filteredReports = reports.filter(rpt => {
    if (!searchLower) return true;
    return (
      rpt.name?.toLowerCase().includes(searchLower) ||
      rpt.email?.toLowerCase().includes(searchLower) ||
      rpt.issue_type?.toLowerCase().includes(searchLower) ||
      rpt.location?.toLowerCase().includes(searchLower) ||
      rpt.description?.toLowerCase().includes(searchLower) ||
      rpt.severity?.toLowerCase().includes(searchLower) ||
      rpt.status?.toLowerCase().includes(searchLower)
    );
  });

  const filteredVisitorFeedback = visitorFeedback.filter(vf => {
    if (!searchLower) return true;
    return (
      vf.name?.toLowerCase().includes(searchLower) ||
      vf.email?.toLowerCase().includes(searchLower) ||
      vf.message?.toLowerCase().includes(searchLower) ||
      vf.purpose?.toLowerCase().includes(searchLower) ||
      vf.rating?.toString().includes(searchLower)
    );
  });

  const filteredAuditLog = auditLog.filter(log => {
    if (!searchLower) return true;
    return (
      log.action?.toLowerCase().includes(searchLower) ||
      log.entity?.toLowerCase().includes(searchLower) ||
      log.description?.toLowerCase().includes(searchLower) ||
      log.user_name?.toLowerCase().includes(searchLower)
    );
  });

  // Handle navigation click
  const handleNavClick = (navName) => {
    setActiveNav(navName);
    addActivityLog('Navigation', `Navigated to ${navName} section`);
  };

  // Contextual help
  const renderHelp = () => showHelp && (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 shadow-lg max-w-lg">
        <h3 className="text-lg font-semibold mb-4 text-[#00332E]">Admin Help & Documentation</h3>
        <p>Find tips and documentation for managing announcements, feedback, buildings, and more.</p>
        <ul className="list-disc ml-6 mt-2 text-sm">
          <li>Use the global search bar to quickly find any building, announcement, or feedback.</li>
          <li>Click the <b>?</b> icon on any section for contextual help.</li>
          <li>Role-based access control ensures only authorized users can edit or view sensitive data.</li>
          <li>Use import/export for bulk directory updates.</li>
          <li>Check the system health panel for real-time status.</li>
        </ul>
        <button
          className="mt-6 px-4 py-2 bg-[#00594A] text-white rounded-lg hover:bg-[#007763]"
          onClick={() => setShowHelp(false)}
        >
          Close
        </button>
      </div>
    </div>
  );

  // Dynamic main content
  const renderContent = () => {
    switch (activeNav) {
      case "Dashboard":
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Stats Grid */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Stats - Unified style, now includes Reports and Visitor Feedback */}
                  <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                    <p className="text-[#007763] text-sm font-semibold mb-1">Announcements</p>
                    <p className="text-2xl font-bold text-[#00332E]">{announcements.length}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                    <p className="text-[#007763] text-sm font-semibold mb-1">Feedback</p>
                    <p className="text-2xl font-bold text-[#00332E]">{feedback.length}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                    <p className="text-[#007763] text-sm font-semibold mb-1">Reports</p>
                    <p className="text-2xl font-bold text-[#00332E]">{reports?.length || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                    <p className="text-[#007763] text-sm font-semibold mb-1">Visitor Feedback</p>
                    <p className="text-2xl font-bold text-[#00332E]">{visitorFeedback?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <button
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition text-sm font-medium"
                      onClick={() => handleQuickAction("Add Announcement")}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      New Announcement
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
                      onClick={() => handleQuickAction("Add Directory Entry")}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Add Directory
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
                      onClick={(e) => exportDirectory(e)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export Directory
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
                      onClick={() => window.open('/directory', '_blank')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Site
                    </button>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
                  <ul className="text-sm space-y-2 max-h-48 overflow-y-auto">
                    {activityFeed.length === 0 ? (
                      <li className="text-gray-500">No recent activity.</li>
                    ) : (
                      activityFeed.slice(0, 5).map((a, idx) => (
                        <li key={idx} className="text-gray-700">
                          <span className="font-medium text-[#00594A]">[{a.action}]</span> {a.description}
                          <span className="text-xs text-gray-500 ml-2">- {a.timestamp}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">System Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Uptime</span>
                      <span className="font-medium text-gray-900">{systemHealth.uptime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last Sync</span>
                      <span className="font-medium text-gray-900">{systemHealth.lastSync}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5"></span>
                        Operational
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case "Announcements":
        return (
          <div className="p-6 md:p-8">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-[#00332E] mb-2">Announcements</h2>
                  <p className="text-[#007763] text-sm">Manage campus announcements and notifications</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isSelectingAnnouncements ? (
                    <button
                      onClick={() => setIsSelectingAnnouncements(true)}
                      disabled={announcements.length === 0}
                      className={`px-4 py-2 border rounded-md text-sm font-medium transition ${announcements.length === 0 ? 'cursor-not-allowed opacity-60 border-gray-200 text-gray-400' : 'text-[#00594A] border-[#00594A] hover:bg-[#00594A] hover:text-white'}`}
                    >
                      Select
                    </button>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAnnouncements.length === announcements.length && announcements.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAnnouncements(announcements.map(a => a.id));
                            } else {
                              setSelectedAnnouncements([]);
                            }
                          }}
                          className="w-5 h-5 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-700">Select All</span>
                      </label>
                      <span className="text-sm text-gray-600 min-w-[110px]">
                        {selectedAnnouncements.length > 0 ? `${selectedAnnouncements.length} selected` : ''}
                      </span>
                      <button
                        onClick={() => {
                          setIsSelectingAnnouncements(false);
                          setSelectedAnnouncements([]);
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition text-sm font-medium"
                      >
                        Cancel
                      </button>
                      {selectedAnnouncements.length > 0 && (
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: 'Delete Selected Announcements',
                              message: `Are you sure you want to delete ${selectedAnnouncements.length} announcement(s)?`,
                              onConfirm: () => {
                                bulkDeleteAnnouncements();
                                setIsSelectingAnnouncements(false);
                              },
                              confirmText: 'Delete',
                              cancelText: 'Cancel',
                              type: 'danger'
                            });
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete ({selectedAnnouncements.length})
                        </button>
                      )}
                    </>
                  )}
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition font-medium shadow-sm"
                    onClick={() => handleQuickAction("Add Announcement")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    New Announcement
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Total</p>
                <p className="text-2xl font-bold text-[#00332E]">{announcements.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600">{announcements.filter(a => a.status === 'Active').length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{announcements.filter(a => a.priority === 'High' || a.priority === 'Critical').length}</p>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="p-12 bg-white rounded-xl text-center border border-[#E0F2EF] shadow-sm">
                <div className="w-10 h-10 border-4 border-[#E0F2EF] border-t-[#007763] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[#007763] font-semibold">Loading announcements...</p>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-50 rounded-xl text-red-700 mb-4 border-l-4 border-red-500 shadow-sm">
                <p className="font-semibold mb-2">⚠️ Error Loading Announcements</p>
                <p className="text-sm mb-4">{error}</p>
                <button 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-sm"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0018 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No announcements yet</h3>
                <p className="text-gray-600 mb-6">Start by creating your first announcement</p>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition text-sm font-medium"
                  onClick={() => handleQuickAction("Add Announcement")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Announcement
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                {filteredAnnouncements && filteredAnnouncements.length > 0 ? (
                  filteredAnnouncements.map((ann) => {
                  // Get category color
                  const getCategoryColor = (category) => {
                    const colors = {
                      'Maintenance': { bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', border: 'border-red-200' },
                      'Events': { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
                      'Services': { bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', border: 'border-green-200' },
                      'Academic': { bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
                      'Safety': { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
                      'General': { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700', border: 'border-gray-200' }
                    };
                    return colors[category] || colors['General'];
                  };
                  
                  const categoryStyle = getCategoryColor(ann.category);
                  const isExpired = ann.expire_date && new Date(ann.expire_date) < new Date();
                  
                  return (
                    <div key={ann.id} className={`bg-white rounded-xl shadow-sm border-2 transition hover:shadow-lg ${categoryStyle.border} ${selectedAnnouncements.includes(ann.id) ? 'ring-4 ring-[#00594A] ring-opacity-50 border-[#00594A]' : ''}`}>
                      <div className="p-6">
                        {/* Top Row - Checkbox (only in select mode), Title, Category, Status */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                          <div className="flex items-start gap-4 flex-1">
                            {/* Checkbox - only visible in selection mode */}
                            {isSelectingAnnouncements && (
                              <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition -ml-2">
                                <input
                                  type="checkbox"
                                  checked={selectedAnnouncements.includes(ann.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAnnouncements([...selectedAnnouncements, ann.id]);
                                    } else {
                                      setSelectedAnnouncements(selectedAnnouncements.filter(id => id !== ann.id));
                                    }
                                  }}
                                  className="w-5 h-5 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </label>
                            )}
                            <div className="flex-1">
                            <h3 className="text-lg font-bold text-[#00332E] mb-1">{ann.title}</h3>
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${categoryStyle.badge}`}>
                                {ann.category}
                              </span>
                              {ann.priority === 'High' && (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                  ⚠️ High Priority
                                </span>
                              )}
                              {ann.priority === 'Critical' && (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                  🚨 Critical
                                </span>
                              )}
                              {ann.status !== 'Active' && (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                  {ann.status}
                                </span>
                              )}
                              {isExpired && (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                  ⏰ Expired
                                </span>
                              )}
                            </div>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-gray-700 text-sm mb-4 line-clamp-2">{ann.content}</p>

                        {/* Tags */}
                        {Array.isArray(ann.tags) && ann.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {ann.tags.map((tag, i) => (
                              <span key={i} className="bg-[#F5FAF9] text-[#007763] px-2 py-1 rounded text-xs font-medium border border-[#E0F2EF]">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Date Info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-[#F5FAF9] rounded-lg border border-[#E0F2EF]">
                          <div>
                            <p className="text-[#007763] text-xs font-semibold mb-1">Publish Date</p>
                            <p className="text-[#00332E] font-medium text-sm">
                              {ann.publish_date ? new Date(ann.publish_date).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[#007763] text-xs font-semibold mb-1">Expiry Date</p>
                            <p className="text-[#00332E] font-medium text-sm">
                              {ann.expire_date ? new Date(ann.expire_date).toLocaleDateString() : 'No expiry'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[#007763] text-xs font-semibold mb-1">Created By</p>
                            <p className="text-[#00332E] font-medium text-sm">{ann.created_by || 'Admin'}</p>
                          </div>
                          <div>
                            <p className="text-[#007763] text-xs font-semibold mb-1">Created On</p>
                            <p className="text-[#00332E] font-medium text-sm">
                              {ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons - hidden in selection mode */}
                        {!isSelectingAnnouncements && (
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition text-sm font-medium"
                            onClick={() => { setEditingItem(ann); handleQuickAction("Edit Announcement"); }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
                            onClick={() => {
                              const text = `${ann.title}\n${ann.content}\n\nCategory: ${ann.category}\nPriority: ${ann.priority}`;
                              navigator.clipboard.writeText(text).then(() => {
                                showToast('Announcement copied to clipboard!', 'success');
                              }).catch(() => {
                                showToast('Failed to copy to clipboard', 'error');
                              });
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition text-sm font-medium ml-auto"
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Delete Announcement',
                                message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
                                onConfirm: () => {
                                  deleteAnnouncement(ann.id);
                                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                },
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                type: 'danger'
                              });
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                        )}
                      </div>
                    </div>
                  );
                })
                ) : globalSearch ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No Results Found</h3>
                    <p className="text-gray-600 mb-2">No announcements match "{globalSearch}"</p>
                    <button
                      className="text-[#00594A] hover:underline text-sm"
                      onClick={() => setGlobalSearch('')}
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No Announcements</h3>
                    <p className="text-gray-600 mb-6">Start by creating your first announcement</p>
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition text-sm font-medium"
                      onClick={() => handleQuickAction("Add Announcement")}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Announcement
                    </button>
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        );
      case "Feedback":
        return (
          <div className="p-6">
            <div className="mb-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-[#00332E]">Feedback & Reports Management</h2>
                <p className="text-[#007763] mt-1">View and manage user feedback and issue reports</p>
              </div>
              <div className="flex gap-2 items-center">
                {/* Shopee/Lazada-style Select button - Dynamic based on active tab */}
                {(feedbackFilter.type === 'feedback' || !feedbackFilter.type) && (
                  <>
                    {!isSelectingFeedback ? (
                      <button
                        onClick={() => setIsSelectingFeedback(true)}
                        className="px-4 py-2 text-[#00594A] border border-[#00594A] rounded-md hover:bg-[#00594A] hover:text-white transition text-sm font-medium"
                      >
                        Select
                      </button>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFeedback.length === feedback.length && feedback.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFeedback(feedback.map(f => f.id));
                              } else {
                                setSelectedFeedback([]);
                              }
                            }}
                            className="w-5 h-5 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Select All
                          </span>
                        </label>
                        <span className="text-sm text-gray-600">
                          {selectedFeedback.length > 0 ? `${selectedFeedback.length} selected` : ''}
                        </span>
                        <button
                          onClick={() => {
                            setIsSelectingFeedback(false);
                            setSelectedFeedback([]);
                          }}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition text-sm font-medium"
                        >
                          Cancel
                        </button>
                        {selectedFeedback.length > 0 && (
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Delete Selected Feedback',
                                message: `Are you sure you want to delete ${selectedFeedback.length} feedback item(s)?`,
                                onConfirm: () => {
                                  bulkDeleteFeedback();
                                  setIsSelectingFeedback(false);
                                },
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                type: 'danger'
                              });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete ({selectedFeedback.length})
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
                {/* Selection for Visitor Feedback */}
                {feedbackFilter.type === 'visitors' && (
                  <>
                    {!isSelectingVisitorFeedback ? (
                      <button
                        onClick={() => setIsSelectingVisitorFeedback(true)}
                        className="px-4 py-2 text-[#00594A] border border-[#00594A] rounded-md hover:bg-[#00594A] hover:text-white transition text-sm font-medium"
                      >
                        Select
                      </button>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedVisitorFeedback.length === visitorFeedback.length && visitorFeedback.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVisitorFeedback(visitorFeedback.map(v => v.id));
                              } else {
                                setSelectedVisitorFeedback([]);
                              }
                            }}
                            className="w-5 h-5 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Select All
                          </span>
                        </label>
                        <span className="text-sm text-gray-600">
                          {selectedVisitorFeedback.length > 0 ? `${selectedVisitorFeedback.length} selected` : ''}
                        </span>
                        <button
                          onClick={() => {
                            setIsSelectingVisitorFeedback(false);
                            setSelectedVisitorFeedback([]);
                          }}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition text-sm font-medium"
                        >
                          Cancel
                        </button>
                        {selectedVisitorFeedback.length > 0 && (
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Delete Selected Visitor Feedback',
                                message: `Are you sure you want to delete ${selectedVisitorFeedback.length} visitor feedback item(s)?`,
                                onConfirm: () => {
                                  bulkDeleteVisitorFeedback();
                                  setIsSelectingVisitorFeedback(false);
                                },
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                type: 'danger'
                              });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete ({selectedVisitorFeedback.length})
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
                {/* Selection for Reports */}
                {feedbackFilter.type === 'reports' && (
                  <>
                    {!isSelectingReports ? (
                      <button
                        onClick={() => setIsSelectingReports(true)}
                        className="px-4 py-2 text-[#00594A] border border-[#00594A] rounded-md hover:bg-[#00594A] hover:text-white transition text-sm font-medium"
                      >
                        Select
                      </button>
                    ) : (
                      <>
                        <span className="text-sm text-gray-600">
                          {selectedReports.length > 0 ? `${selectedReports.length} selected` : ''}
                        </span>
                        <button
                          onClick={() => {
                            setIsSelectingReports(false);
                            setSelectedReports([]);
                          }}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition text-sm font-medium"
                        >
                          Cancel
                        </button>
                        {selectedReports.length > 0 && (
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: 'Delete Selected Reports',
                                message: `Are you sure you want to delete ${selectedReports.length} report(s)?`,
                                onConfirm: () => {
                                  bulkDeleteReports();
                                  setIsSelectingReports(false);
                                },
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                type: 'danger'
                              });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete ({selectedReports.length})
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    refreshFeedbackData();
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-[#007763] text-white rounded-lg hover:bg-[#00594A] transition font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh feedback data"
                >
                  <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Tab buttons for feedback categories */}
            <div className="flex gap-2 mb-6 border-b border-[#E0F2EF]">
              <button
                onClick={() => setFeedbackFilter(f => ({ ...f, type: 'feedback' }))}
                className={`px-6 py-3 font-semibold transition ${
                  (feedbackFilter.type === 'feedback' || !feedbackFilter.type)
                    ? 'text-[#00594A] border-b-2 border-[#00594A]'
                    : 'text-gray-500 hover:text-[#00594A]'
                }`}
              >
                FEEDBACK
              </button>
              <button
                onClick={() => setFeedbackFilter(f => ({ ...f, type: 'reports' }))}
                className={`px-6 py-3 font-semibold transition ${
                  feedbackFilter.type === 'reports'
                    ? 'text-[#00594A] border-b-2 border-[#00594A]'
                    : 'text-gray-500 hover:text-[#00594A]'
                }`}
              >
                REPORT AN ISSUE
              </button>
              <button
                onClick={() => setFeedbackFilter(f => ({ ...f, type: 'visitors' }))}
                className={`px-6 py-3 font-semibold transition ${
                  feedbackFilter.type === 'visitors'
                    ? 'text-[#00594A] border-b-2 border-[#00594A]'
                    : 'text-gray-500 hover:text-[#00594A]'
                }`}
              >
                VISITOR FEEDBACK
              </button>
            </div>

            {/* Feedback Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Total Feedback</p>
                <p className="text-2xl font-bold text-[#00332E]">{feedback.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Total Reports</p>
                <p className="text-2xl font-bold text-[#00332E]">{reports.length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Visitor Feedback</p>
                <p className="text-2xl font-bold text-[#00332E]">{visitorFeedback.length}</p>
              </div>
            </div>

            {/* Filter controls */}
                            <div className="flex gap-2 mb-4 flex-wrap">
                              {(feedbackFilter.type === 'feedback' || feedbackFilter.type === 'reports' || !feedbackFilter.type) && (
                                <select 
                                  className="border border-[#E0F2EF] rounded px-3 py-2 bg-white" 
                                  value={feedbackFilter.status} 
                                  onChange={e => setFeedbackFilter(f => ({ ...f, status: e.target.value }))}
                                >
                                  <option value="">All Status</option>
                                  <option value="Open">New</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Resolved">Resolved</option>
                                </select>
                              )}
                              {feedbackFilter.type === 'reports' && (
                                <select 
                                  className="border border-[#E0F2EF] rounded px-3 py-2 bg-white" 
                                  value={feedbackFilter.severity} 
                                  onChange={e => setFeedbackFilter(f => ({ ...f, severity: e.target.value }))}
                                >
                                  <option value="">All Severity</option>
                                  <option value="Low">Low</option>
                                  <option value="Medium">Medium</option>
                                  <option value="High">High</option>
                                  <option value="Critical">Critical</option>
                                </select>
                              )}
                              {feedbackFilter.type === 'visitors' && (
                                <select 
                                  className="border border-[#E0F2EF] rounded px-3 py-2 bg-white" 
                                  value={feedbackFilter.rating} 
                                  onChange={e => setFeedbackFilter(f => ({ ...f, rating: e.target.value }))}
                                >
                                  <option value="">All Ratings</option>
                                  <option value="5">5 Stars</option>
                                  <option value="4">4 Stars</option>
                                  <option value="3">3 Stars</option>
                                  <option value="2">2 Stars</option>
                                  <option value="1">1 Star</option>
                                </select>
                              )}
                              <button 
                                className="px-4 py-2 bg-[#00594A] text-white rounded hover:bg-[#007763] transition font-medium"
                                onClick={() => { 
                                  setFeedbackFilter({ building: "", status: "", urgency: "", topic: "", severity: "", rating: "", type: feedbackFilter.type || 'feedback' });
                                }}
                              >
                                Clear Filters
                              </button>
                            </div>
                            {/* Feedback Table */}
                            {(feedbackFilter.type === 'feedback' || !feedbackFilter.type) && (
                              <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-[#E0F2EF] overflow-hidden">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-[#E0F2EF] border-b border-[#E0F2EF]">
                                      {isSelectingFeedback && (
                                        <th className="p-4 text-left font-semibold text-[#00332E] w-12">
                                          {/* Checkbox for select all in selection mode */}
                                          <input
                                            type="checkbox"
                                            checked={selectedFeedback.length === feedback.length && feedback.length > 0}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedFeedback(feedback.map(f => f.id));
                                              } else {
                                                setSelectedFeedback([]);
                                              }
                                            }}
                                            className="w-4 h-4 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                                          />
                                        </th>
                                      )}
                                      <th className="p-4 text-left font-semibold text-[#00332E]">Name</th>
                                      <th className="p-4 text-left font-semibold text-[#00332E]">Email</th>
                                      <th className="p-4 text-left font-semibold text-[#00332E]">Message</th>
                                      <th className="p-4 text-left font-semibold text-[#00332E]">Date</th>
                                      <th className="p-4 text-left font-semibold text-[#00332E]">Status</th>
                                      {!isSelectingFeedback && (
                                        <th className="p-4 text-left font-semibold text-[#00332E]">Actions</th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredFeedback
                                      .filter(fb => !feedbackFilter.status || (feedbackFilter.status === 'Open' && fb.status === 'Open') || (feedbackFilter.status === 'In Progress' && fb.status === 'In Progress') || (feedbackFilter.status === 'Resolved' && fb.status === 'Resolved'))
                                      .map((fb) => {
                                        return (
                                          <tr key={fb.id} className={`border-t border-[#E0F2EF] hover:bg-[#F5FAF9] transition ${selectedFeedback.includes(fb.id) ? 'bg-blue-50' : ''}`}>
                                            {isSelectingFeedback && (
                                              <td className="p-4">
                                                <input
                                                  type="checkbox"
                                                  checked={selectedFeedback.includes(fb.id)}
                                                  onChange={(e) => {
                                                    if (e.target.checked) {
                                                      setSelectedFeedback([...selectedFeedback, fb.id]);
                                                    } else {
                                                      setSelectedFeedback(selectedFeedback.filter(id => id !== fb.id));
                                                    }
                                                  }}
                                                  className="w-4 h-4 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              </td>
                                            )}
                                            <td className="p-4">{fb.name}</td>
                                            <td className="p-4">{fb.email}</td>
                                            <td className="p-4 max-w-xs truncate">{fb.message}</td>
                                            <td className="p-4 text-sm">{fb.date}</td>
                                            <td className="p-4">
                                              <span className={`border rounded px-2 py-1 text-sm font-medium ${fb.status === 'Open' ? 'bg-red-50 border-red-200 text-red-700' : fb.status === 'In Progress' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                                {fb.status}
                                              </span>
                                            </td>
                                            {!isSelectingFeedback && (
                                              <td className="p-4">
                                                <button
                                                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                                                  onClick={() => {
                                                    setConfirmDialog({
                                                      isOpen: true,
                                                      title: 'Delete Feedback',
                                                      message: 'Are you sure you want to delete this feedback?',
                                                      onConfirm: async () => {
                                                        try {
                                                          const response = await fetch(`http://localhost:5000/api/feedback/${fb.id}`, { method: 'DELETE' });
                                                          if (response.ok) {
                                                            setFeedback(feedback.filter(f => f.id !== fb.id));
                                                            // Backend already logs to audit_log
                                                            showDeleteToast(`Feedback from "${fb.name}" has been removed.`);
                                                          } else {
                                                            showToast('error', 'Failed to delete feedback. Please try again.');
                                                          }
                                                        } catch (error) {
                                                          console.error('Error deleting feedback:', error);
                                                          showToast('error', 'Failed to delete feedback. Please check your connection and try again.');
                                                        }
                                                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                                      },
                                                      confirmText: 'Delete',
                                                      cancelText: 'Cancel',
                                                      type: 'danger'
                                                    });
                                                  }}
                                                >
                                                  Delete
                                                </button>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                                {feedback.length === 0 && (
                                  <div className="p-8 text-center text-gray-500">
                                    <p className="text-lg">No feedback received yet</p>
                                  </div>
                                )}
                          </div>
                        )}

        {/* Reports Table */}
        {feedbackFilter.type === 'reports' && (
              <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-[#E0F2EF] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#E0F2EF] border-b border-[#E0F2EF]">
                      {isSelectingReports && (
                        <th className="p-4 text-left font-semibold text-[#00332E] w-12">
                          <input
                            type="checkbox"
                            checked={selectedReports.length === reports.length && reports.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReports(reports.map(r => r.id));
                              } else {
                                setSelectedReports([]);
                              }
                            }}
                            className="w-4 h-4 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="p-4 text-left font-semibold text-[#00332E]">Name</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Type</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Description</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Severity</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Status</th>
                      {!isSelectingReports && (
                        <th className="p-4 text-left font-semibold text-[#00332E]">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports
                      .filter(rpt => {
                        const matchStatus = !feedbackFilter.status || (feedbackFilter.status === 'Open' && rpt.status === 'Open') || (feedbackFilter.status === 'In Progress' && rpt.status === 'In Progress') || (feedbackFilter.status === 'Resolved' && rpt.status === 'Resolved');
                        const matchSeverity = !feedbackFilter.severity || rpt.severity === feedbackFilter.severity;
                        return matchStatus && matchSeverity;
                      })
                      .map((rpt) => {
                        const severityColors = {
                          'Low': 'bg-blue-50 border-blue-200 text-blue-700',
                          'Medium': 'bg-yellow-50 border-yellow-200 text-yellow-700',
                          'High': 'bg-orange-50 border-orange-200 text-orange-700',
                          'Critical': 'bg-red-50 border-red-200 text-red-700'
                        };
                        const statusColors = {
                          'Open': 'bg-red-50 border-red-200 text-red-700',
                          'In Progress': 'bg-yellow-50 border-yellow-200 text-yellow-700',
                          'Resolved': 'bg-green-50 border-green-200 text-green-700'
                        };
                        return (
                          <tr key={rpt.id} className={`border-t border-[#E0F2EF] hover:bg-[#F5FAF9] transition ${selectedReports.includes(rpt.id) ? 'bg-blue-50' : ''}`}>
                            {isSelectingReports && (
                              <td className="p-4">
                                <input
                                  type="checkbox"
                                  checked={selectedReports.includes(rpt.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedReports([...selectedReports, rpt.id]);
                                    } else {
                                      setSelectedReports(selectedReports.filter(id => id !== rpt.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                            )}
                            <td className="p-4">{rpt.name}</td>
                            <td className="p-4 text-sm">{rpt.issue_type}</td>
                            <td className="p-4 max-w-xs truncate text-sm">{rpt.description}</td>
                            <td className="p-4">
                              <span className={`border rounded px-2 py-1 text-sm font-medium ${severityColors[rpt.severity] || 'bg-gray-50 border-gray-200'}`}>
                                {rpt.severity}
                              </span>
                            </td>
                            <td className="p-4">
                              <select
                                value={rpt.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    const apiStatus = newStatus === 'Open' ? 'New' : newStatus === 'In Progress' ? 'Read' : newStatus;
                                    const response = await fetch(`http://localhost:5000/api/reports/${rpt.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: apiStatus })
                                    });
                                    if (response.ok) {
                                      setReports(reports.map(r => r.id === rpt.id ? { ...r, status: newStatus } : r));
                                      // Backend already logs status update to audit_log
                                    }
                                  } catch (error) {
                                    console.error('Error updating report:', error);
                                  }
                                }}
                                className={`border rounded px-2 py-1 text-sm font-medium ${statusColors[rpt.status] || 'bg-gray-50 border-gray-200'}`}
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Resolved">Resolved</option>
                              </select>
                            </td>
                            {!isSelectingReports && (
                              <td className="p-4">
                                <button
                                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: 'Delete Report',
                                      message: 'Are you sure you want to delete this report?',
                                      onConfirm: async () => {
                                        try {
                                          const response = await fetch(`http://localhost:5000/api/reports/${rpt.id}`, {
                                            method: 'DELETE'
                                          });
                                          if (response.ok) {
                                            setReports(reports.filter(r => r.id !== rpt.id));
                                            // Backend already logs to audit_log
                                            showDeleteToast(`Report "${rpt.issue_type}" from "${rpt.name}" has been removed.`);
                                          } else {
                                            showToast('error', 'Failed to delete report. Please try again.');
                                          }
                                        } catch (error) {
                                          console.error('Error deleting report:', error);
                                          showToast('error', 'Failed to delete report. Please check your connection and try again.');
                                        }
                                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                      },
                                      confirmText: 'Delete',
                                      cancelText: 'Cancel',
                                      type: 'danger'
                                    });
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {reports.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg">No reports received yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Visitor Feedback Table */}
            {feedbackFilter.type === 'visitors' && (
              <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-[#E0F2EF] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#E0F2EF] border-b border-[#E0F2EF]">
                      {isSelectingVisitorFeedback && (
                        <th className="p-4 text-left font-semibold text-[#00332E] w-12">
                          <input
                            type="checkbox"
                            checked={selectedVisitorFeedback.length === visitorFeedback.length && visitorFeedback.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVisitorFeedback(visitorFeedback.map(v => v.id));
                              } else {
                                setSelectedVisitorFeedback([]);
                              }
                            }}
                            className="w-4 h-4 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="p-4 text-left font-semibold text-[#00332E]">Name</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Contact</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Services Visited</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Feedback</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Rating</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Date</th>
                      {!isSelectingVisitorFeedback && (
                        <th className="p-4 text-left font-semibold text-[#00332E]">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisitorFeedback
                      .filter(visitor => {
                        if (!feedbackFilter.rating) return true;
                        const filterRating = parseInt(feedbackFilter.rating);
                        const visitorRating = visitor.rating;
                        return visitorRating === filterRating;
                      })
                      .map((visitor) => {
                        const ratingColors = {
                          5: 'bg-green-50 border-green-200 text-green-700',
                          4: 'bg-blue-50 border-blue-200 text-blue-700',
                          3: 'bg-yellow-50 border-yellow-200 text-yellow-700',
                          2: 'bg-orange-50 border-orange-200 text-orange-700',
                          1: 'bg-red-50 border-red-200 text-red-700'
                        };
                        const stars = '⭐'.repeat(visitor.rating || 0);
                        return (
                          <tr key={visitor.id} className={`border-t border-[#E0F2EF] hover:bg-[#F5FAF9] transition ${selectedVisitorFeedback.includes(visitor.id) ? 'bg-blue-50' : ''}`}>
                            {isSelectingVisitorFeedback && (
                              <td className="p-4">
                                <input
                                  type="checkbox"
                                  checked={selectedVisitorFeedback.includes(visitor.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedVisitorFeedback([...selectedVisitorFeedback, visitor.id]);
                                    } else {
                                      setSelectedVisitorFeedback(selectedVisitorFeedback.filter(id => id !== visitor.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                            )}
                            <td className="p-4">{visitor.name}</td>
                            <td className="p-4 text-sm text-gray-600">{visitor.contact}</td>
                            <td className="p-4 text-sm">{visitor.services_visited || 'N/A'}</td>
                            <td className="p-4 max-w-xs truncate text-sm">{visitor.feedback}</td>
                            <td className="p-4">
                              <span className={`border rounded px-2 py-1 text-sm font-medium ${ratingColors[visitor.rating] || 'bg-gray-50 border-gray-200'}`}>
                                {stars} ({visitor.rating || 0}/5)
                              </span>
                            </td>
                            <td className="p-4 text-sm text-gray-600">{visitor.date}</td>
                            {!isSelectingVisitorFeedback && (
                              <td className="p-4">
                                <button
                                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: 'Delete Visitor Feedback',
                                      message: 'Are you sure you want to delete this visitor feedback?',
                                      onConfirm: async () => {
                                        try {
                                          const response = await fetch(`http://localhost:5000/api/visitor-feedback/${visitor.id}`, { method: 'DELETE' });
                                          if (response.ok) {
                                            setVisitorFeedback(visitorFeedback.filter(v => v.id !== visitor.id));
                                            // Backend already logs to audit_log
                                            showDeleteToast(`Visitor feedback from "${visitor.name}" has been removed.`);
                                          } else {
                                            showToast('error', 'Failed to delete visitor feedback. Please try again.');
                                          }
                                        } catch (error) {
                                          console.error('Error deleting visitor feedback:', error);
                                          showToast('error', 'Failed to delete visitor feedback. Please check your connection and try again.');
                                        }
                                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                      },
                                      confirmText: 'Delete',
                                      cancelText: 'Cancel',
                                      type: 'danger'
                                    });
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {visitorFeedback.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg">No visitor feedback received yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "Directory":
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#00332E]">Directory Management</h2>
                <p className="text-[#007763] mt-1">Manage campus departments and offices for the public directory</p>
              </div>
              <div className="flex gap-2 items-center">
                {/* Shopee/Lazada-style Select button */}
                {!isSelectingBuildings ? (
                  <button
                    onClick={() => setIsSelectingBuildings(true)}
                    className="px-4 py-2 text-[#00594A] border border-[#00594A] rounded-md hover:bg-[#00594A] hover:text-white transition text-sm font-medium"
                  >
                    Select
                  </button>
                ) : (
                  <>
                    <span className="text-sm text-gray-600">
                      {selectedBuildings.length > 0 ? `${selectedBuildings.length} selected` : ''}
                    </span>
                    <button
                      onClick={() => {
                        setIsSelectingBuildings(false);
                        setSelectedBuildings([]);
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition text-sm font-medium"
                    >
                      Cancel
                    </button>
                    {selectedBuildings.length > 0 && (
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Selected Directory Entries',
                            message: `Are you sure you want to delete ${selectedBuildings.length} directory entry/entries?`,
                            onConfirm: () => {
                              bulkDeleteBuildings();
                              setIsSelectingBuildings(false);
                            },
                            confirmText: 'Delete',
                            cancelText: 'Cancel',
                            type: 'danger'
                          });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete ({selectedBuildings.length})
                      </button>
                    )}
                  </>
                )}
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition font-medium shadow-sm"
                  onClick={(e) => exportDirectory(e)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Directory
                </button>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition font-medium shadow-sm"
                  onClick={() => handleQuickAction("Add Directory Entry")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Department
                </button>
              </div>
            </div>

            {/* Directory Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Open Departments</p>
                <p className="text-2xl font-bold text-[#00332E]">{buildings.filter(b => ['open','Open'].includes(b.status)).length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Under Maintenance</p>
                <p className="text-2xl font-bold text-[#00332E]">{buildings.filter(b => ['maintenance','Under Maintenance'].includes(b.status)).length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Temporarily Closed</p>
                <p className="text-2xl font-bold text-[#00332E]">{buildings.filter(b => ['closed','Temporarily Closed'].includes(b.status)).length}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Total Entries</p>
                <p className="text-2xl font-bold text-[#00332E]">{buildings.length}</p>
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {['All', 'Administrative', 'Academic', 'Support', 'General'].map(category => (
                  <button
                    key={category}
                    className={`px-4 py-2 rounded-md font-medium transition text-sm ${
                      (buildingFilter.category === category || (buildingFilter.category === '' && category === 'All'))
                        ? 'bg-[#00594A] text-white shadow-sm'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setBuildingFilter(f => ({ ...f, category: category === 'All' ? '' : category }))}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Selection Bar for Directory */}
            {/* Bulk selection bar removed for Directory. Selection logic now matches Announcements/Feedback. */}
            <></>

            {/* Directory Entries */}
            <div className="space-y-4">
              {filteredBuildings && filteredBuildings.length > 0 ? (
                filteredBuildings
                  .map((bldg) => (
                  <div key={bldg.id} className={`bg-white rounded-xl p-6 shadow-lg border-2 hover:shadow-xl transition ${selectedBuildings.includes(bldg.id) ? 'ring-4 ring-[#00594A] ring-opacity-50 border-[#00594A]' : 'border-[#E0F2EF]'}`}>
                  <div className="flex gap-4 mb-4">
                    {/* Checkbox - only in selection mode */}
                    {isSelectingBuildings && (
                      <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition -ml-2 -mt-2">
                        <input
                          type="checkbox"
                          checked={selectedBuildings.includes(bldg.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBuildings([...selectedBuildings, bldg.id]);
                            } else {
                              setSelectedBuildings(selectedBuildings.filter(id => id !== bldg.id));
                            }
                          }}
                          className="w-5 h-5 text-[#00594A] border-2 border-gray-400 rounded focus:ring-2 focus:ring-[#00594A] cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </label>
                    )}
                    {/* Image section - with placeholder if no image */}
                    <div className="flex-shrink-0">
                      {bldg.image ? (
                        <img 
                          src={`${API_URL}${bldg.image}`} 
                          alt={bldg.name}
                          className="w-32 h-32 object-cover rounded-lg border-2 border-[#E0F2EF] shadow-sm"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRTBGMkVGIi8+CjxwYXRoIGQ9Ik00OCA0OEg4MFY4MEg0OFY0OFoiIGZpbGw9IiMwMDc3NjMiLz4KPC9zdmc+Cg==';
                          }}
                        />
                      ) : (
                        <div className="w-32 h-32 bg-[#E0F2EF] rounded-lg border-2 border-[#E0F2EF] flex items-center justify-center">
                          <svg className="w-16 h-16 text-[#007763]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Content section */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-xl text-[#00332E]">{bldg.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          ['open','Open'].includes(bldg.status) ? 'bg-green-100 text-green-800' :
                          ['closed','Temporarily Closed'].includes(bldg.status) ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(bldg.status || 'Open').toUpperCase()}
                        </span>
                        <span className="bg-[#E0F2EF] text-[#00594A] px-3 py-1 rounded-full text-xs font-bold">
                          {bldg.category || 'General'}
                        </span>
                      </div>
                      <p className="text-[#007763] font-medium text-lg">{bldg.location || bldg.info}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      {bldg.contact && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-600">Phone:</span>
                          <span>{bldg.contact}</span>
                        </div>
                      )}
                      {bldg.email && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-600">Email:</span>
                          <span className="text-blue-600">{bldg.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {bldg.staff && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-600">Staff:</span>
                          <span>{bldg.staff}</span>
                        </div>
                      )}
                      {bldg.office_hours && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-600">Hours:</span>
                          <span>{bldg.office_hours}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {bldg.announcement && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600 font-bold">Notice:</span>
                        <p className="text-yellow-800 font-medium">{bldg.announcement}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons - hidden in selection mode */}
                  {!isSelectingBuildings && (
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition text-sm font-medium"
                        onClick={() => { setEditingItem(bldg); handleQuickAction("Edit Directory Entry"); }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
                        onClick={() => window.open(`/directory`, '_blank')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
                        onClick={() => {
                          const text = `${bldg.name}\nLocation: ${bldg.location}\nContact: ${bldg.contact}\nEmail: ${bldg.email || 'N/A'}\nHours: ${bldg.office_hours || 'N/A'}`;
                          navigator.clipboard.writeText(text).then(() => {
                            showToast('Directory entry copied to clipboard!', 'success');
                          }).catch(() => {
                            showToast('Failed to copy to clipboard', 'error');
                          });
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition text-sm font-medium ml-auto"
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Delete Directory Entry',
                            message: 'Are you sure you want to delete this directory entry?',
                            onConfirm: () => {
                              deleteBuilding(bldg.id);
                              setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                            },
                            confirmText: 'Delete',
                            cancelText: 'Cancel',
                            type: 'danger'
                          });
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))
              ) : globalSearch || buildingFilter.category ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Results Found</h3>
                  <p className="text-gray-600 mb-2">No directory entries match your search criteria</p>
                  <button
                    className="text-[#00594A] hover:underline text-sm"
                    onClick={() => {
                      setGlobalSearch('');
                      setBuildingFilter({ category: '', status: '' });
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Directory Entries</h3>
                  <p className="text-gray-600 mb-6">Start by adding departments and offices to the directory</p>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition text-sm font-medium"
                    onClick={() => handleQuickAction("Add Directory Entry")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add First Entry
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case "Buildings":
        return (
          <div className="p-6 md:p-8 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#00594A] text-white rounded-full mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[#00332E] mb-2">Buildings Management</h2>
              <p className="text-[#007763] text-lg">Building footprints are managed in Mapbox Studio</p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-5 mb-6 rounded-lg">
              <p className="text-blue-900 text-sm">
                <strong>Note:</strong> This admin panel does not edit building geometry. Use Mapbox Studio to add/edit building polygons and attributes.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-[#E0F2EF] shadow-sm">
                <div className="bg-[#00594A] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <p className="text-gray-700">Open Mapbox Studio and access your campus buildings dataset</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-[#E0F2EF] shadow-sm">
                <div className="bg-[#00594A] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <p className="text-gray-700">Edit polygons and set attributes (name, category, status, level)</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-[#E0F2EF] shadow-sm">
                <div className="bg-[#00594A] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <p className="text-gray-700">Publish the tileset and reload the map to see changes</p>
              </div>
            </div>

            <div className="text-center">
              <a 
                href="https://studio.mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00594A] text-white rounded-lg hover:bg-[#007763] transition font-semibold shadow-md"
              >
                Open Mapbox Studio
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <p className="text-sm text-gray-500 mt-4">
                See <code className="bg-gray-100 px-2 py-1 rounded text-xs">MAPBOX_BUILDINGS_ADMIN.md</code> for detailed documentation
              </p>
            </div>
          </div>
        );
      case "Audit Log":
        return (
          <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-[#00332E]">Audit Log</h2>
                <p className="text-[#007763] mt-1">Track all administrative actions and system modifications</p>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    // Export audit log to CSV
                    try {
                      const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Description'];
                      const csvRows = [headers.join(',')];
                      
                      auditLog.forEach(log => {
                        const row = [
                          `"${log.timestamp}"`,
                          `"${log.user || 'Admin'}"`,
                          `"${log.action}"`,
                          `"${log.entity}"`,
                          `"${(log.description || '').replace(/"/g, '""')}"`
                        ];
                        csvRows.push(row.join(','));
                      });
                      
                      const csvContent = csvRows.join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      const url = URL.createObjectURL(blob);
                      
                      const date = new Date().toISOString().split('T')[0];
                      link.setAttribute('href', url);
                      link.setAttribute('download', `audit-log-${date}.csv`);
                      link.style.visibility = 'hidden';
                      
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setTimeout(() => URL.revokeObjectURL(url), 100);
                      
                      showToast('success', `Successfully exported ${auditLog.length} audit entries to CSV.`);
                    } catch (error) {
                      console.error('Error exporting audit log:', error);
                      showToast('error', 'Failed to export audit log. Please try again.');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition font-medium shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Audit Log
                </button>
                <button
                  onClick={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Clear Audit Log',
                      message: 'Are you sure you want to clear all audit log entries? This action cannot be undone.',
                      onConfirm: async () => {
                        try {
                          const response = await fetch('http://localhost:5000/api/audit-log', {
                            method: 'DELETE'
                          });
                          if (response.ok) {
                            setAuditLog([]);
                            setAuditStats({ total: 0, created: 0, updated: 0, deleted: 0 });
                            showToast('success', 'Audit log cleared successfully.');
                          } else {
                            showToast('error', 'Failed to clear audit log.');
                          }
                        } catch (error) {
                          console.error('Error clearing audit log:', error);
                          showToast('error', 'Failed to clear audit log. Please try again.');
                        }
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                      },
                      confirmText: 'Clear All',
                      cancelText: 'Cancel',
                      type: 'danger'
                    });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition font-medium shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Log
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Total Entries</p>
                <p className="text-2xl font-bold text-[#00332E]">{auditStats.total || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Created</p>
                <p className="text-2xl font-bold text-[#00332E]">{auditStats.created || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Updated</p>
                <p className="text-2xl font-bold text-[#00332E]">{auditStats.updated || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-[#E0F2EF] shadow-sm">
                <p className="text-[#007763] text-sm font-semibold mb-1">Deleted</p>
                <p className="text-2xl font-bold text-[#00332E]">{auditStats.deleted || 0}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="Search audit log..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="border border-[#E0F2EF] rounded px-3 py-2 bg-white flex-1 min-w-[200px]"
              />
              <select 
                className="border border-[#E0F2EF] rounded px-3 py-2 bg-white" 
                value={auditFilter.action} 
                onChange={e => setAuditFilter(f => ({ ...f, action: e.target.value }))}
              >
                <option value="">All Actions</option>
                <option value="Created">Created</option>
                <option value="Updated">Updated</option>
                <option value="Deleted">Deleted</option>
                <option value="Exported">Exported</option>
                <option value="Navigation">Navigation</option>
              </select>
              <select 
                className="border border-[#E0F2EF] rounded px-3 py-2 bg-white" 
                value={auditFilter.entity} 
                onChange={e => setAuditFilter(f => ({ ...f, entity: e.target.value }))}
              >
                <option value="">All Entities</option>
                <option value="Announcements">Announcements</option>
                <option value="Directory">Directory</option>
                <option value="Feedback">Feedback</option>
                <option value="Issue Reports">Issue Reports</option>
                <option value="Visitor Feedback">Visitor Feedback</option>
                <option value="System">System</option>
              </select>
              <button 
                className="px-4 py-2 bg-[#00594A] text-white rounded hover:bg-[#007763] transition font-medium"
                onClick={() => { 
                  setAuditFilter({ action: '', entity: '' });
                  setAuditSearch('');
                }}
              >
                Clear Filters
              </button>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-[#E0F2EF] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#E0F2EF] border-b border-[#E0F2EF]">
                      <th className="p-4 text-left font-semibold text-[#00332E]">Timestamp</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">User</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Action</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Entity</th>
                      <th className="p-4 text-left font-semibold text-[#00332E]">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLog
                      .filter(log => {
                        // Filter by action
                        if (auditFilter.action && log.action !== auditFilter.action) return false;
                        // Filter by entity
                        if (auditFilter.entity && log.entity !== auditFilter.entity) return false;
                        // auditSearch is already applied in filteredAuditLog
                        return true;
                      })
                      .map((log, index) => {
                        const actionColors = {
                          'Created': 'bg-green-50 border-green-200 text-green-700',
                          'Updated': 'bg-blue-50 border-blue-200 text-blue-700',
                          'Deleted': 'bg-red-50 border-red-200 text-red-700',
                          'Exported': 'bg-purple-50 border-purple-200 text-purple-700',
                          'Navigation': 'bg-gray-50 border-gray-200 text-gray-700'
                        };
                        return (
                          <tr key={log.id || index} className="border-t border-[#E0F2EF] hover:bg-[#F5FAF9] transition">
                            <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : log.timestamp}
                            </td>
                            <td className="p-4 text-sm font-medium">{log.user_name || log.user || 'Admin'}</td>
                            <td className="p-4">
                              <span className={`border rounded px-2 py-1 text-sm font-medium ${actionColors[log.action] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-4 text-sm font-medium text-[#00594A]">{log.entity}</td>
                            <td className="p-4 text-sm text-gray-700">{log.description}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {auditLog.length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No Audit Entries</h3>
                    <p className="text-gray-600">Administrative actions will be logged here automatically</p>
                  </div>
                )}
                {auditLog.length > 0 && auditLog.filter(log => {
                  if (auditFilter.action && log.action !== auditFilter.action) return false;
                  if (auditFilter.entity && log.entity !== auditFilter.entity) return false;
                  if (auditSearch) {
                    const searchLower = auditSearch.toLowerCase();
                    return (
                      log.description?.toLowerCase().includes(searchLower) ||
                      log.action?.toLowerCase().includes(searchLower) ||
                      log.entity?.toLowerCase().includes(searchLower) ||
                      log.user?.toLowerCase().includes(searchLower)
                    );
                  }
                  return true;
                }).length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <p className="text-lg">No matching audit entries found</p>
                    <p className="text-sm text-gray-400 mt-2">Try adjusting your filters or search query</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    <strong>Database Connected:</strong> Audit log entries are now persisted in the PostgreSQL database. All administrative actions are automatically tracked and stored securely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Admin Panel</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href="#"
              className={`block px-3 py-2 rounded-md transition text-sm font-medium ${
                activeNav === link.name
                  ? "bg-[#00594A] text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
              onClick={(e) => { e.preventDefault(); handleNavClick(link.name); }}
            >
              {link.name}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 font-medium">Version 1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">{role}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="h-16 flex items-center px-6 justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">{activeNav}</h1>
              {error && <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium border border-red-200">Error</span>}
            </div>
            <div className="flex items-center gap-3">
              {/* Global search bar */}
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  value={globalSearch}
                  onChange={handleGlobalSearch}
                  placeholder="Search everything..."
                  className={`px-3 py-2 pr-9 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-[#00594A] focus:border-transparent transition ${
                    globalSearch ? 'border-[#00594A] bg-[#F5FAF9]' : 'border-gray-300 bg-white'
                  }`}
                  style={{ width: 240 }}
                  aria-label="Global search"
                />
                {globalSearch ? (
                  <button
                    onClick={() => setGlobalSearch('')}
                    className="absolute right-2.5 top-2.5 w-4 h-4 text-[#00594A] hover:text-[#007763]"
                    aria-label="Clear search"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <svg className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
              {/* User profile */}
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#00594A] flex items-center justify-center text-white text-sm font-medium">
                    A
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Admin</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Logout',
                      message: 'Are you sure you want to logout?',
                      confirmText: 'Logout',
                      cancelText: 'Cancel',
                      type: 'default',
                      onConfirm: async () => {
                        try {
                          // Get user info for logout
                          const adminUser = localStorage.getItem('adminUser');
                          const username = adminUser ? JSON.parse(adminUser).username : 'Admin';
                          
                          // Call logout API
                          await fetch('http://localhost:5000/api/admin/logout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username })
                          }).catch(err => console.warn('Logout API call failed:', err));
                          
                          // Clear authentication
                          setIsAuthenticated(false);
                          localStorage.removeItem('adminAuthenticated');
                          localStorage.removeItem('adminToken');
                          localStorage.removeItem('adminUser');
                          sessionStorage.clear();
                          
                          console.log('✅ Logout successful');
                          
                          // Redirect to login
                          window.location.href = '/login';
                        } catch (error) {
                          console.error('❌ Logout error:', error);
                          // Still clear local data even if API call fails
                          setIsAuthenticated(false);
                          localStorage.clear();
                          sessionStorage.clear();
                          window.location.href = '/login';
                        }
                      }
                    });
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
                  title="Logout"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        {renderContent()}

        {/* Contextual Help Modal */}
        {renderHelp()}

        {/* Simple Modal for Quick Actions (Add/Edit Announcement/Building) */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#00594A] px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">{modal}</h3>
                <button
                  onClick={() => { setModal(null); setEditingItem(null); }}
                  className="text-white hover:bg-white/10 p-2 rounded transition"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto">
              {modal === "Add Announcement" && (
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  addAnnouncement({ 
                    title: e.target.title.value, 
                    content: e.target.content.value,
                    category: e.target.category.value,
                    tags: e.target.tags.value.split(',').filter(t => t.trim()),
                    publish_date: e.target.publish.value || new Date().toISOString().split('T')[0],
                    expire_date: e.target.expire.value,
                    priority: e.target.priority.value,
                    status: 'Active'
                  }); 
                }}>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Create New Announcement</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                      <input 
                        name="title" 
                        placeholder="e.g., Clinic Maintenance Notice" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                      <select name="category" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" required>
                        <option value="">Select Category</option>
                        <option value="Maintenance">🔧 Maintenance</option>
                        <option value="Events">📅 Events</option>
                        <option value="Services">📖 Services</option>
                        <option value="Academic">📚 Academic</option>
                        <option value="Safety">🚨 Safety</option>
                        <option value="General">🔔 General</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                    <select name="priority" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm">
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Content *</label>
                    <textarea 
                      name="content" 
                      placeholder="Enter announcement details..." 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      rows="4"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Publish Date</label>
                      <input 
                        name="publish" 
                        type="date" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date (Optional)</label>
                      <input 
                        name="expire" 
                        type="date" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (comma-separated)</label>
                    <input 
                      name="tags" 
                      placeholder="e.g., maintenance, important, clinic" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button 
                      type="submit" 
                      className="flex-1 px-4 py-2.5 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition font-medium shadow-sm"
                    >
                      Create Announcement
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setModal(null)}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {modal === "Edit Announcement" && editingItem && (
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  editAnnouncement(editingItem.id, { 
                    title: e.target.title.value, 
                    content: e.target.content.value,
                    category: e.target.category.value,
                    tags: e.target.tags.value.split(',').filter(t => t.trim()),
                    publish_date: e.target.publish.value,
                    expire_date: e.target.expire.value,
                    priority: e.target.priority.value
                  }); 
                }}>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Edit Announcement</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                      <input 
                        name="title" 
                        defaultValue={editingItem.title} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                      <select name="category" defaultValue={editingItem.category || ''} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" required>
                        <option value="">Select Category</option>
                        <option value="Maintenance">🔧 Maintenance</option>
                        <option value="Events">📅 Events</option>
                        <option value="Services">📖 Services</option>
                        <option value="Academic">📚 Academic</option>
                        <option value="Safety">🚨 Safety</option>
                        <option value="General">🔔 General</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                    <select name="priority" defaultValue={editingItem.priority || 'Normal'} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm">
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Content *</label>
                    <textarea 
                      name="content" 
                      defaultValue={editingItem.content}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      rows="4"
                      required 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Publish Date</label>
                      <input 
                        name="publish" 
                        type="date" 
                        defaultValue={editingItem.publish_date ? editingItem.publish_date.split('T')[0] : ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date (Optional)</label>
                      <input 
                        name="expire" 
                        type="date" 
                        defaultValue={editingItem.expire_date ? editingItem.expire_date.split('T')[0] : ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (comma-separated)</label>
                    <input 
                      name="tags" 
                      defaultValue={Array.isArray(editingItem.tags) ? editingItem.tags.join(', ') : ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button 
                      type="submit" 
                      className="flex-1 px-4 py-2.5 bg-[#00594A] text-white rounded-md hover:bg-[#007763] transition font-medium shadow-sm"
                    >
                      Save Changes
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setModal(null); setEditingItem(null); }}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {modal === "Add Building" && (
                <div className="space-y-4">
                  <p className="text-gray-700">Buildings are not added here. We manage them via Mapbox to keep the map and directory in sync.</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="px-5 py-2 bg-[#007763] text-white rounded-lg hover:bg-[#00594A] transition text-sm font-semibold"
                      onClick={() => window.open('/MAPBOX_BUILDINGS_ADMIN.md', '_blank')}
                    >
                      Open Mapbox Integration Guide
                    </button>
                    <button
                      className="px-5 py-2 border-2 border-[#007763] text-[#007763] rounded-lg hover:bg-[#E0F2EF] transition text-sm font-semibold"
                      onClick={() => window.open('https://studio.mapbox.com/', '_blank')}
                    >
                      Open Mapbox Studio
                    </button>
                  </div>
                </div>
              )}
              {(modal === "Add Directory Entry" || modal === "Edit Directory Entry") && (
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  const action = modal === "Add Directory Entry" ? addBuilding : (data) => editBuilding(editingItem.id, data);
                  action({ 
                    name: e.target.name.value, 
                    location: e.target.location.value,
                    contact: e.target.contact.value,
                    email: e.target.email.value,
                    staff: e.target.staff.value,
                    office_hours: e.target.office_hours.value,
                    category: e.target.category.value,
                    status: e.target.status.value, 
                    announcement: e.target.announcement.value,
                    image: selectedImage,
                    existingImage: editingItem?.image
                  }); 
                  // Reset image state after submission
                  setSelectedImage(null);
                  setImagePreview(null);
                }}>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    {modal === "Add Directory Entry" ? "Add New Directory Entry" : "Edit Directory Entry"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Department/Office Name *</label>
                      <input 
                        name="name" 
                        defaultValue={editingItem?.name || ""} 
                        placeholder="e.g., Registrar Office" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Location *</label>
                      <input 
                        name="location" 
                        defaultValue={editingItem?.location || editingItem?.info || ""} 
                        placeholder="e.g., Main Building, 1st Floor" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                      <input 
                        name="contact" 
                        defaultValue={editingItem?.contact || ""} 
                        placeholder="e.g., 123-4567" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                      <input 
                        name="email" 
                        type="email" 
                        defaultValue={editingItem?.email || ""} 
                        placeholder="e.g., registrar@udm.edu.ph" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Staff in Charge</label>
                      <input 
                        name="staff" 
                        defaultValue={editingItem?.staff || ""} 
                        placeholder="e.g., Ms. Maria Santos" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Office Hours</label>
                      <input 
                        name="office_hours" 
                        defaultValue={editingItem?.office_hours || editingItem?.hours || "Mon-Fri 8:00am-5:00pm"} 
                        placeholder="e.g., Mon-Fri 8:00am-5:00pm" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                      <select 
                        name="category" 
                        defaultValue={editingItem?.category || "General"} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm"
                      >
                        <option value="Administrative">Administrative</option>
                        <option value="Academic">Academic</option>
                        <option value="Support">Support</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                      <select 
                        name="status" 
                        defaultValue={['Open','open'].includes(editingItem?.status) ? 'Open' : (['closed','Temporarily Closed'].includes(editingItem?.status) ? 'Temporarily Closed' : (['maintenance','Under Maintenance'].includes(editingItem?.status) ? 'Under Maintenance' : 'Open'))} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm"
                      >
                        <option value="Open">Open</option>
                        <option value="Temporarily Closed">Temporarily Closed</option>
                        <option value="Under Maintenance">Under Maintenance</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Announcement (Optional)</label>
                    <textarea 
                      name="announcement" 
                      defaultValue={editingItem?.announcement || ""} 
                      placeholder="Any special announcements or temporary notices..." 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#00594A] focus:border-transparent text-sm" 
                      rows="3" 
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department Image (Optional)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 bg-gray-50 hover:border-[#00594A] transition">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setSelectedImage(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setImagePreview(reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#00594A] file:text-white hover:file:bg-[#007763]"
                      />
                      <p className="text-xs text-gray-500 mt-2">Maximum file size: 5MB. Accepted formats: JPG, PNG, GIF</p>
                    </div>
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Preview:</p>
                        <div className="relative inline-block">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-w-xs max-h-48 rounded-lg border-2 border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setSelectedImage(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Show existing image if editing and no new image selected */}
                    {!imagePreview && editingItem?.image && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Current Image:</p>
                        <img 
                          src={`${API_URL}${editingItem.image}`} 
                          alt="Current" 
                          className="max-w-xs max-h-48 rounded-lg border-2 border-gray-300"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button 
                      type="submit" 
                      className="flex-1 px-4 py-2.5 bg-[#00594A] text-white rounded-md hover:bg-[#007763] font-medium transition shadow-sm"
                    >
                      {modal === "Add Directory Entry" ? "Add to Directory" : "Update Entry"}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setModal(null); setEditingItem(null); }} 
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              {modal === "Edit Building" && editingItem && (
                <div className="space-y-4">
                  <p className="text-gray-700">Editing buildings is handled in Mapbox. Open the guide to see how to update geometry and properties.</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="px-5 py-2 bg-[#007763] text-white rounded-lg hover:bg-[#00594A] transition text-sm font-semibold"
                      onClick={() => window.open('MAPBOX_BUILDINGS_ADMIN.md', '_blank')}
                    >
                      Open Mapbox Integration Guide
                    </button>
                    <button
                      className="px-5 py-2 border-2 border-[#007763] text-[#007763] rounded-lg hover:bg-[#E0F2EF] transition text-sm font-semibold"
                      onClick={() => window.open('https://studio.mapbox.com/', '_blank')}
                    >
                      Open Mapbox Studio
                    </button>
                  </div>
                </div>
              )}
              {!modal.includes("Add") && !modal.includes("Edit") && <p className="mb-6">This is a placeholder for the "{modal}" functionality.</p>}
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-4 border-t border-[#E0F2EF] bg-gray-50 flex justify-end gap-3">
                <button
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-semibold"
                  onClick={() => { setModal(null); setEditingItem(null); }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog Modal */}
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              {/* Header */}
              <div className={`px-6 py-4 rounded-t-lg ${
                confirmDialog.type === 'danger' ? 'bg-red-600' : 'bg-[#00594A]'
              }`}>
                <h3 className="text-lg font-semibold text-white">{confirmDialog.title}</h3>
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="text-gray-700 text-sm leading-relaxed">{confirmDialog.message}</p>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition font-medium text-sm"
                >
                  {confirmDialog.cancelText}
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className={`px-4 py-2 rounded-md transition font-semibold text-sm ${
                    confirmDialog.type === 'danger' 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-[#00594A] hover:bg-[#007763] text-white'
                  }`}
                  style={{ color: '#ffffff' }}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast.isVisible && (
          <div className="fixed top-6 right-6 z-[70] animate-slide-in max-w-md">
            <div className={`px-6 py-4 rounded-lg shadow-2xl border-l-[6px] ${
              toast.type === 'success' ? 'bg-white border-[#00594A]' :
              toast.type === 'error' ? 'bg-white border-red-500' :
              toast.type === 'delete' ? 'bg-white border-red-500' :
              'bg-white border-[#007763]'
            } min-w-[360px] ring-1 ring-gray-200`}>
              <div className="flex items-start justify-between gap-4">
                {/* Message */}
                <div className="flex-1">
                  <p className={`font-bold text-base mb-2 tracking-wide ${
                    toast.type === 'success' ? 'text-[#00594A]' :
                    toast.type === 'error' ? 'text-red-600' :
                    toast.type === 'delete' ? 'text-red-600' :
                    'text-[#007763]'
                  }`}>
                    {toast.type === 'success' && 'SUCCESS'}
                    {toast.type === 'error' && 'ERROR'}
                    {toast.type === 'delete' && 'SUCCESSFULLY DELETED'}
                    {toast.type === 'info' && 'INFORMATION'}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">{toast.message}</p>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setToast({ ...toast, isVisible: false })}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;

// The admin interface in this file manages announcements, feedback, and buildings using local state and fetches data from API endpoints such as /api/announcements, /api/feedback, and /api/buildings.
// If the user interface (UI) pages also fetch their content from these same API endpoints, then the admin changes (add/edit/delete) will be reflected in the user interface content automatically after a reload or refetch.
// However, if the user interface uses separate state, files, or does not consume these APIs, then changes made in the admin panel will not be visible to users.
// In summary: The admin interface is connected to the user interface content only if both use the same backend API for announcements, feedback, and buildings.
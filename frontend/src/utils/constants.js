/**
 * Application Constants
 * Central location for all constant values used across the application
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
};

// Toast/Notification Duration
export const NOTIFICATION_DURATION = {
  SHORT: 2000,
  MEDIUM: 4000,
  LONG: 6000,
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};

// Building Status
export const BUILDING_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  TEMPORARILY_CLOSED: 'Temporarily Closed',
};

// Building Categories
export const BUILDING_CATEGORIES = {
  ACADEMIC: 'Academic',
  ADMINISTRATIVE: 'Administrative',
  FACILITIES: 'Facilities',
  SERVICES: 'Services',
  GENERAL: 'General',
};

// Announcement Categories
export const ANNOUNCEMENT_CATEGORIES = {
  MAINTENANCE: 'Maintenance',
  EVENTS: 'Events',
  SERVICES: 'Services',
  ACADEMIC: 'Academic',
  SAFETY: 'Safety',
  GENERAL: 'General',
};

// Announcement Priority Levels
export const ANNOUNCEMENT_PRIORITY = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

// Announcement Status
export const ANNOUNCEMENT_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  EXPIRED: 'Expired',
  SCHEDULED: 'Scheduled',
};

// Feedback Types
export const FEEDBACK_TYPE = {
  FEEDBACK: 'feedback',
  REPORT: 'report',
  VISITOR: 'visitor',
};

// Report Types
export const REPORT_TYPE = {
  BUG: 'bug',
  CONTENT: 'content',
  OTHER: 'other',
};

// Urgency Levels
export const URGENCY_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

// Feedback Status
export const FEEDBACK_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

// Floor Configurations
export const FLOOR_CONFIGS = [
  { key: 'ground', name: 'Ground Floor', file: '/images/1st-floor-map.geojson' },
  { key: '2', name: '2nd Floor', file: '/images/2nd-floor-map.geojson' },
  { key: '3', name: '3rd Floor', file: '/images/3rd-floor-map.geojson' },
  { key: '4', name: '4th Floor', file: '/images/4th-floor-map.geojson' },
];

// Map Configuration
export const MAP_CONFIG = {
  INITIAL_CENTER: [120.981539, 14.591552], // Main entrance coordinates
  INITIAL_ZOOM: 19,
  MIN_ZOOM: 17,
  MAX_ZOOM: 22,
  PITCH: 45,
  BEARING: 253,
};

// File Upload Limits
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],
};

// Validation Rules
export const VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 6,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[0-9]{10,15}$/,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'adminToken',
  AUTH_STATUS: 'adminAuthenticated',
  USER_DATA: 'adminUser',
  LANGUAGE: 'selectedLanguage',
  THEME: 'selectedTheme',
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  FULL: 'MMMM DD, YYYY hh:mm A',
  SHORT: 'MM/DD/YYYY',
  ISO: 'YYYY-MM-DD',
};

// Audit Log Actions
export const AUDIT_ACTIONS = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  BULK_DELETE: 'Bulk Delete',
  EXPORT: 'Export',
};

// Entity Types for Audit Log
export const ENTITY_TYPES = {
  ANNOUNCEMENT: 'Announcement',
  BUILDING: 'Building',
  FEEDBACK: 'Feedback',
  REPORT: 'Report',
  VISITOR: 'Visitor Feedback',
  SYSTEM: 'System',
  USER: 'User',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Unauthorized. Please login again.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  GENERIC_ERROR: 'An unexpected error occurred.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Saved successfully!',
  DELETE_SUCCESS: 'Deleted successfully!',
  UPDATE_SUCCESS: 'Updated successfully!',
  UPLOAD_SUCCESS: 'Uploaded successfully!',
};

export default {
  API_CONFIG,
  NOTIFICATION_DURATION,
  PAGINATION,
  BUILDING_STATUS,
  BUILDING_CATEGORIES,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITY,
  ANNOUNCEMENT_STATUS,
  FEEDBACK_TYPE,
  REPORT_TYPE,
  URGENCY_LEVELS,
  FEEDBACK_STATUS,
  FLOOR_CONFIGS,
  MAP_CONFIG,
  FILE_UPLOAD,
  VALIDATION,
  STORAGE_KEYS,
  DATE_FORMATS,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};

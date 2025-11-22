/**
 * Input validation middleware using express-validator
 * Prevents SQL injection, XSS, and validates data formats
 */

const { body, param, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

/**
 * Admin login validation
 */
const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 3 }).withMessage('Password must be at least 3 characters'),
  validate
];

/**
 * Feedback submission validation
 */
const validateFeedback = [
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isIn(['bug', 'suggestion', 'complaint', 'other']).withMessage('Invalid category'),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Message must be between 10 and 1000 characters'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters')
    .matches(/^[a-zA-Z\s.-]+$/).withMessage('Name contains invalid characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  validate
];

/**
 * Report issue validation
 */
const validateReport = [
  body('type')
    .trim()
    .notEmpty().withMessage('Type is required')
    .isIn(['facility', 'safety', 'cleanliness', 'other']).withMessage('Invalid type'),
  body('location')
    .trim()
    .notEmpty().withMessage('Location is required')
    .isLength({ min: 3, max: 200 }).withMessage('Location must be between 3 and 200 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('reporterName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Reporter name must not exceed 100 characters'),
  body('reporterContact')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Reporter contact must not exceed 100 characters'),
  validate
];

/**
 * Building creation/update validation
 */
const validateBuilding = [
  body('name')
    .trim()
    .notEmpty().withMessage('Building name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Building name must be between 2 and 200 characters'),
  body('abbreviation')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Abbreviation must not exceed 20 characters')
    .matches(/^[A-Z0-9-]+$/).withMessage('Abbreviation can only contain uppercase letters, numbers, and hyphens'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Category must not exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('floors')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Floors must be between 1 and 100'),
  validate
];

/**
 * ID parameter validation
 */
const validateId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Invalid ID format'),
  validate
];

/**
 * Bulk delete validation
 */
const validateBulkDelete = [
  body('ids')
    .isArray({ min: 1 }).withMessage('IDs must be a non-empty array')
    .custom((value) => {
      if (!value.every(id => Number.isInteger(id) && id > 0)) {
        throw new Error('All IDs must be positive integers');
      }
      return true;
    }),
  validate
];

/**
 * Status update validation
 */
const validateStatusUpdate = [
  body('status')
    .trim()
    .notEmpty().withMessage('Status is required')
    .isIn(['pending', 'in-progress', 'resolved', 'closed']).withMessage('Invalid status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
  validate
];

/**
 * Sanitize HTML to prevent XSS attacks
 */
const sanitizeHTML = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

module.exports = {
  validate,
  validateLogin,
  validateFeedback,
  validateReport,
  validateBuilding,
  validateId,
  validateBulkDelete,
  validateStatusUpdate,
  sanitizeHTML
};

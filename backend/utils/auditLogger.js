/**
 * Audit Logger Utility
 * Creates audit log entries for all administrative actions
 */

const db = require('../db/db');
const Logger = require('./logger');

const logger = new Logger('AuditLogger');

/**
 * Log an audit entry
 * @param {string} action - The action performed (Created, Updated, Deleted, etc.)
 * @param {string} entity - The entity type (Announcements, Directory, Feedback, etc.)
 * @param {number|string} entityId - The ID of the affected entity
 * @param {string} description - Human-readable description of the action
 * @param {object} metadata - Additional metadata (optional)
 * @param {string} userName - Name of the user who performed the action (optional)
 */
async function logAudit(action, entity, entityId, description, metadata = {}, userName = 'Admin') {
  try {
    const query = `
      INSERT INTO audit_log (action, entity, entity_id, description, metadata, user_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      action,
      entity,
      entityId || null,
      description,
      JSON.stringify(metadata),
      userName
    ]);
    
    logger.info(`📝 Audit log created: ${action} ${entity} - ${description}`);
    return result.rows[0];
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    logger.error('⚠️ Failed to create audit log entry:', error.message);
    return null;
  }
}

/**
 * Middleware to automatically log API actions
 * Usage: router.post('/path', auditLogMiddleware('Created', 'EntityType'), handler)
 */
function auditLogMiddleware(action, entity, getDescription) {
  return async (req, res, next) => {
    // Store original functions
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Override json/send to log after successful operations
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Extract entity ID from response or params
        const entityId = data?.id || data?.data?.id || req.params.id;
        const description = typeof getDescription === 'function' 
          ? getDescription(req, data) 
          : getDescription;
        
        // Log asynchronously without blocking response
        logAudit(action, entity, entityId, description, {
          method: req.method,
          path: req.path,
          ip: req.ip
        }).catch(err => logger.error('Audit log error:', err));
      }
      return originalJson.call(this, data);
    };
    
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id;
        const description = typeof getDescription === 'function' 
          ? getDescription(req, data) 
          : getDescription;
        
        logAudit(action, entity, entityId, description, {
          method: req.method,
          path: req.path,
          ip: req.ip
        }).catch(err => logger.error('Audit log error:', err));
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
}

module.exports = {
  logAudit,
  auditLogMiddleware
};

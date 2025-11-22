const express = require('express');
const Logger = require('../utils/logger');
const logger = new Logger('audit-log');
const router = express.Router();
const pool = require('../db/db');

// GET /api/audit-log - Fetch audit log entries with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { action, entity, search, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];
    
    // Filter by action
    if (action) {
      params.push(action);
      query += ` AND action = $${params.length}`;
    }
    
    // Filter by entity
    if (entity) {
      params.push(entity);
      query += ` AND entity = $${params.length}`;
    }
    
    // Search across multiple fields
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        description ILIKE $${params.length} OR 
        action ILIKE $${params.length} OR 
        entity ILIKE $${params.length} OR 
        user_name ILIKE $${params.length}
      )`;
    }
    
    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM audit_log WHERE 1=1';
    const countParams = [];
    
    if (action) {
      countParams.push(action);
      countQuery += ` AND action = $${countParams.length}`;
    }
    if (entity) {
      countParams.push(entity);
      countQuery += ` AND entity = $${countParams.length}`;
    }
    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND (
        description ILIKE $${countParams.length} OR 
        action ILIKE $${countParams.length} OR 
        entity ILIKE $${countParams.length} OR 
        user_name ILIKE $${countParams.length}
      )`;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({ 
      data: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// POST /api/audit-log - Create new audit log entry
router.post('/', async (req, res) => {
  try {
    const { action, entity, entity_id, description, metadata, user_name } = req.body;
    
    // Validate required fields
    if (!action || !entity || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: action, entity, and description are required' 
      });
    }
    
    const query = `
      INSERT INTO audit_log (action, entity, entity_id, description, metadata, user_name)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      action, 
      entity, 
      entity_id || null,
      description, 
      JSON.stringify(metadata || {}), 
      user_name || 'Admin'
    ]);
    
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    logger.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log entry' });
  }
});

// GET /api/audit-log/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN action = 'Created' THEN 1 END) as created,
        COUNT(CASE WHEN action = 'Updated' THEN 1 END) as updated,
        COUNT(CASE WHEN action = 'Deleted' THEN 1 END) as deleted,
        COUNT(CASE WHEN action = 'Exported' THEN 1 END) as exported
      FROM audit_log
    `;
    
    const result = await pool.query(statsQuery);
    res.json({ data: result.rows[0] });
  } catch (error) {
    logger.error('Error fetching audit log stats:', error);
    res.status(500).json({ error: 'Failed to fetch audit log statistics' });
  }
});

// DELETE /api/audit-log - Clear all audit entries (admin only)
router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM audit_log');
    res.json({ message: 'Audit log cleared successfully' });
  } catch (error) {
    logger.error('Error clearing audit log:', error);
    res.status(500).json({ error: 'Failed to clear audit log' });
  }
});

// DELETE /api/audit-log/old - Clean up old entries (keep last 6 months)
router.delete('/old', async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM audit_log 
      WHERE created_at < NOW() - INTERVAL '6 months'
      RETURNING id
    `);
    
    res.json({ 
      message: 'Old audit entries cleaned up',
      deleted: result.rowCount
    });
  } catch (error) {
    logger.error('Error cleaning up old audit entries:', error);
    res.status(500).json({ error: 'Failed to clean up old entries' });
  }
});

module.exports = router;

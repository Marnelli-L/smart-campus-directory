// Backend routes for Feedback, Reports, and Visitor Feedback management
// Add this to your express server (server.js or index.js)

const express = require('express');
const db = require('../db/db');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// ==================== FEEDBACK ROUTES ====================

// Get all feedback with filters
router.get('/feedback', async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM feedback';
    let countQuery = 'SELECT COUNT(*) as total FROM feedback';
    const params = [];
    let paramCount = 1;

    // Build WHERE clause
    const conditions = [];
    if (status) {
      conditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }
    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR message ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // Get count
    const countResult = await db.query(countQuery, search ? params.slice(0, -1) : params);
    const total = countResult.rows[0].total;

    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get single feedback
router.get('/feedback/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM feedback WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Create feedback (public)
router.post('/feedback', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields: name, email, and message are required' });
    }

    const result = await db.query(
      'INSERT INTO feedback (name, email, message, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, message, 'New']
    );
    
    // Log to audit log
    await logAudit(
      'Created',
      'Feedback',
      result.rows[0].id,
      `Feedback from "${name}" received`,
      { email, hasMessage: !!message }
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ error: 'Failed to create feedback', details: error.message });
  }
});

// Update feedback status (admin only)
router.put('/feedback/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['New', 'Read', 'Resolved', 'Archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(
      'UPDATE feedback SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    // Log to audit log
    await logAudit(
      'Updated',
      'Feedback',
      result.rows[0].id,
      `Feedback from "${result.rows[0].name}" status changed to ${status}`,
      { newStatus: status }
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

// Delete feedback
router.delete('/feedback/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM feedback WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    // Log to audit log
    await logAudit(
      'Deleted',
      'Feedback',
      result.rows[0].id,
      `Feedback from "${result.rows[0].name}" removed`,
      { email: result.rows[0].email }
    );
    
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// Bulk delete feedback (admin only)
router.post('/feedback/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ids array' });
    }

    // Get feedback details before deleting for audit log
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const feedbackDetails = await db.query(
      `SELECT id, name FROM feedback WHERE id IN (${placeholders})`,
      ids
    );

    // Delete all
    const result = await db.query(
      `DELETE FROM feedback WHERE id IN (${placeholders})`,
      ids
    );

    // Log to audit log
    await logAudit(
      'Deleted',
      'Feedback',
      null,
      `Bulk deleted ${result.rowCount} feedback item(s)`,
      { count: result.rowCount, ids, names: feedbackDetails.rows.map(f => f.name) }
    );

    res.json({ message: `Successfully deleted ${result.rowCount} feedback item(s)`, count: result.rowCount });
  } catch (error) {
    console.error('Error bulk deleting feedback:', error);
    res.status(500).json({ error: 'Failed to bulk delete feedback' });
  }
});

// ==================== REPORTS ROUTES ====================

// Get all reports with filters
router.get('/reports', async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM reports';
    let countQuery = 'SELECT COUNT(*) as total FROM reports';
    const params = [];
    let paramCount = 1;

    const conditions = [];
    if (status) {
      conditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }
    if (severity) {
      conditions.push(`severity = $${paramCount}`);
      params.push(severity);
      paramCount++;
    }
    if (search) {
      conditions.push(`(name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR description ILIKE $${paramCount} OR issue_type ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    const countResult = await db.query(countQuery, search ? params.slice(0, -1) : params);
    const total = countResult.rows[0].total;

    query += ` ORDER BY 
      CASE severity 
        WHEN 'Critical' THEN 1 
        WHEN 'High' THEN 2 
        WHEN 'Medium' THEN 3 
        WHEN 'Low' THEN 4 
      END ASC,
      created_at DESC 
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get single report
router.get('/reports/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Create report (public)
router.post('/reports', async (req, res) => {
  try {
    const { name, email, issue_type, description, severity } = req.body;
    
    if (!name || !email || !issue_type || !description) {
      return res.status(400).json({ error: 'Missing required fields: name, email, issue_type, and description are required' });
    }

    const result = await db.query(
      'INSERT INTO reports (name, email, issue_type, description, severity, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, email, issue_type, description, severity || 'Medium', 'New']
    );
    
    // Log to audit log
    await logAudit(
      'Created',
      'Issue Reports',
      result.rows[0].id,
      `Issue report "${issue_type}" from "${name}" received`,
      { severity: severity || 'Medium', issue_type }
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report', details: error.message });
  }
});

// Update report (admin only)
router.put('/reports/:id', async (req, res) => {
  try {
    const { status, severity, assigned_to } = req.body;
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }
    if (severity) {
      updates.push(`severity = $${paramCount}`);
      params.push(severity);
      paramCount++;
    }
    if (assigned_to) {
      updates.push(`assigned_to = $${paramCount}`);
      params.push(assigned_to);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    const query = `UPDATE reports SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Log to audit log
    const updateDetails = [];
    if (status) updateDetails.push(`status: ${status}`);
    if (severity) updateDetails.push(`severity: ${severity}`);
    if (assigned_to) updateDetails.push(`assigned to: ${assigned_to}`);
    
    await logAudit(
      'Updated',
      'Issue Reports',
      result.rows[0].id,
      `Issue report "${result.rows[0].issue_type}" from "${result.rows[0].name}" updated (${updateDetails.join(', ')})`,
      { status, severity, assigned_to }
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Delete report
router.delete('/reports/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM reports WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Log to audit log
    await logAudit(
      'Deleted',
      'Issue Reports',
      result.rows[0].id,
      `Issue report "${result.rows[0].issue_type}" from "${result.rows[0].name}" removed`,
      { issue_type: result.rows[0].issue_type }
    );
    
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Bulk delete reports (admin only)
router.post('/reports/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ids array' });
    }

    // Get report details before deleting for audit log
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const reportDetails = await db.query(
      `SELECT id, issue_type, name FROM reports WHERE id IN (${placeholders})`,
      ids
    );

    // Delete all
    const result = await db.query(
      `DELETE FROM reports WHERE id IN (${placeholders})`,
      ids
    );

    // Log to audit log
    await logAudit(
      'Deleted',
      'Issue Reports',
      null,
      `Bulk deleted ${result.rowCount} report(s)`,
      { count: result.rowCount, ids, issues: reportDetails.rows.map(r => `${r.issue_type} from ${r.name}`) }
    );

    res.json({ message: `Successfully deleted ${result.rowCount} report(s)`, count: result.rowCount });
  } catch (error) {
    console.error('Error bulk deleting reports:', error);
    res.status(500).json({ error: 'Failed to bulk delete reports' });
  }
});

// ==================== VISITOR FEEDBACK ROUTES ====================

// Get all visitor feedback
router.get('/visitor-feedback', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM visitor_feedback';
    let countQuery = 'SELECT COUNT(*) as total FROM visitor_feedback';
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` WHERE (name ILIKE $${paramCount} OR contact ILIKE $${paramCount} OR services_visited ILIKE $${paramCount})`;
      countQuery += ` WHERE (name ILIKE $${paramCount} OR contact ILIKE $${paramCount} OR services_visited ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const countResult = await db.query(countQuery, search ? [params[0]] : []);
    const total = countResult.rows[0].total;

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching visitor feedback:', error);
    res.status(500).json({ error: 'Failed to fetch visitor feedback' });
  }
});

// Create visitor feedback (public)
router.post('/visitor-feedback', async (req, res) => {
  try {
    const { name, address, contact, time_in, time_out, feedback, services_visited, rating } = req.body;
    
    if (!name || !contact) {
      return res.status(400).json({ error: 'Missing required fields: name and contact are required' });
    }

    // Convert time strings to timestamps
    let timeInValue = null;
    let timeOutValue = null;
    
    if (time_in) {
      // If it's just a time string (HH:MM), create a timestamp with today's date
      if (typeof time_in === 'string' && time_in.includes(':')) {
        timeInValue = new Date().toISOString().split('T')[0] + 'T' + time_in + ':00';
      } else {
        timeInValue = time_in;
      }
    }
    
    if (time_out) {
      // If it's just a time string (HH:MM), create a timestamp with today's date
      if (typeof time_out === 'string' && time_out.includes(':')) {
        timeOutValue = new Date().toISOString().split('T')[0] + 'T' + time_out + ':00';
      } else {
        timeOutValue = time_out;
      }
    }

    const result = await db.query(
      `INSERT INTO visitor_feedback (name, address, contact, time_in, time_out, feedback, services_visited, rating) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, address, contact, timeInValue || null, timeOutValue || null, feedback, services_visited, rating || null]
    );
    
    // Log to audit log
    await logAudit(
      'Created',
      'Visitor Feedback',
      result.rows[0].id,
      `Visitor feedback from "${name}" received${rating ? ` with ${rating} star rating` : ''}`,
      { rating, services_visited }
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating visitor feedback:', error);
    res.status(500).json({ error: 'Failed to create visitor feedback' });
  }
});

// Update visitor feedback (admin only)
router.put('/visitor-feedback/:id', async (req, res) => {
  try {
    const { rating, feedback, status } = req.body;
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (rating !== undefined) {
      updates.push(`rating = $${paramCount}`);
      params.push(rating);
      paramCount++;
    }
    if (feedback !== undefined) {
      updates.push(`feedback = $${paramCount}`);
      params.push(feedback);
      paramCount++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    const query = `UPDATE visitor_feedback SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor feedback not found' });
    }
    
    // Log to audit log
    const updateDetails = [];
    if (rating !== undefined) updateDetails.push(`rating: ${rating} stars`);
    if (status !== undefined) updateDetails.push(`status: ${status}`);
    if (feedback !== undefined) updateDetails.push('feedback updated');
    
    await logAudit(
      'Updated',
      'Visitor Feedback',
      result.rows[0].id,
      `Visitor feedback from "${result.rows[0].name}" updated (${updateDetails.join(', ')})`,
      { rating, status }
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating visitor feedback:', error);
    res.status(500).json({ error: 'Failed to update visitor feedback' });
  }
});

// Delete visitor feedback
router.delete('/visitor-feedback/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM visitor_feedback WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor feedback not found' });
    }
    
    // Log to audit log
    await logAudit(
      'Deleted',
      'Visitor Feedback',
      result.rows[0].id,
      `Visitor feedback from "${result.rows[0].name}" removed`,
      { rating: result.rows[0].rating }
    );
    
    res.json({ message: 'Visitor feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting visitor feedback:', error);
    res.status(500).json({ error: 'Failed to delete visitor feedback' });
  }
});

// Bulk delete visitor feedback (admin only)
router.post('/visitor-feedback/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ids array' });
    }

    // Get visitor feedback details before deleting for audit log
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const visitorDetails = await db.query(
      `SELECT id, name FROM visitor_feedback WHERE id IN (${placeholders})`,
      ids
    );

    // Delete all
    const result = await db.query(
      `DELETE FROM visitor_feedback WHERE id IN (${placeholders})`,
      ids
    );

    // Log to audit log
    await logAudit(
      'Deleted',
      'Visitor Feedback',
      null,
      `Bulk deleted ${result.rowCount} visitor feedback item(s)`,
      { count: result.rowCount, ids, names: visitorDetails.rows.map(v => v.name) }
    );

    res.json({ message: `Successfully deleted ${result.rowCount} visitor feedback item(s)`, count: result.rowCount });
  } catch (error) {
    console.error('Error bulk deleting visitor feedback:', error);
    res.status(500).json({ error: 'Failed to bulk delete visitor feedback' });
  }
});

// ==================== DASHBOARD STATS ====================

// Get feedback/reports statistics
router.get('/dashboard/feedback-stats', async (req, res) => {
  try {
    const feedbackStats = await db.query(
      `SELECT status, COUNT(*) as count FROM feedback GROUP BY status`
    );
    const reportStats = await db.query(
      `SELECT status, severity, COUNT(*) as count FROM reports GROUP BY status, severity`
    );
    
    res.json({
      feedback: feedbackStats.rows,
      reports: reportStats.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;

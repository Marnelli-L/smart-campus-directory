const express = require('express');
const db = require('./db/db');
const { logAudit } = require('./utils/auditLogger');
const router = express.Router();

// Get announcements for public display
// Rules:
// - Show items intended to be visible to users
// - Primary: status = 'Active'
// - Also: status = 'Draft' but publish date is today or earlier
// - Use date-only comparison to handle timezone differences (user creates with local date, server checks UTC)
// - For published date: anything with today's date (00:00:00) should be visible even if server UTC hasn't reached that timestamp yet
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        title,
        content,
        category,
        tags,
        publish_date as date,
        expire_date,
        status,
        priority
      FROM announcements
      WHERE (
          status = 'Active'
          OR (status = 'Draft' AND publish_date::date <= CURRENT_DATE)
        )
        AND (publish_date::date <= CURRENT_DATE OR publish_date <= CURRENT_TIMESTAMP + INTERVAL '24 hours')
        AND (expire_date IS NULL OR expire_date::date >= CURRENT_DATE)
      ORDER BY priority DESC, publish_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all announcements (for admin - including inactive)
router.get('/admin/all', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        title,
        content,
        category,
        tags,
        publish_date,
        expire_date,
        status,
        priority,
        created_by,
        created_at,
        updated_at
      FROM announcements
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all announcements:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add new announcement (admin)
router.post('/', async (req, res) => {
  const { title, content, category = 'General', tags = [], publish_date, expire_date, status = 'Active', priority = 'Normal', created_by = 'Admin' } = req.body;
  
  try {
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const result = await db.query(
      `INSERT INTO announcements 
        (title, content, category, tags, publish_date, expire_date, status, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, content, category, tags, publish_date, expire_date, status, priority, created_at, updated_at`,
      [title, content, category, tags, publish_date || new Date(), expire_date, status, priority, created_by]
    );
    
    // Log to audit log
    console.log('🔍 About to log audit entry for announcement creation...');
    try {
      const auditResult = await logAudit(
        'Created',
        'Announcements',
        result.rows[0].id,
        `Announcement "${title}" created`,
        { category, priority, status }
      );
      console.log('✅ Audit log result:', auditResult);
    } catch (auditError) {
      console.error('❌ Audit log failed:', auditError);
    }
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Update announcement (admin)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, category, tags, publish_date, expire_date, status, priority } = req.body;

  try {
    const result = await db.query(
      `UPDATE announcements 
       SET title=$1, content=$2, category=$3, tags=$4, 
           publish_date=$5, expire_date=$6, status=$7, priority=$8, updated_at=CURRENT_TIMESTAMP
       WHERE id=$9
       RETURNING id, title, content, category, tags, publish_date, expire_date, status, priority, created_at, updated_at`,
      [title, content, category, tags, publish_date, expire_date, status, priority, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Log to audit log
    await logAudit(
      'Updated',
      'Announcements',
      result.rows[0].id,
      `Announcement "${title}" modified`,
      { category, priority, status }
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating announcement:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Delete announcement (admin)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get the announcement details before deleting for audit log
    const announcement = await db.query('SELECT title FROM announcements WHERE id=$1', [id]);
    const result = await db.query('DELETE FROM announcements WHERE id=$1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Log to audit log
    if (announcement.rows.length > 0) {
      await logAudit(
        'Deleted',
        'Announcements',
        id,
        `Announcement "${announcement.rows[0].title}" removed`,
        { id }
      );
    }

    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// Bulk delete announcements (admin)
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ids array' });
    }

    // Get announcement details before deleting for audit log
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const announcementDetails = await db.query(
      `SELECT id, title FROM announcements WHERE id IN (${placeholders})`,
      ids
    );

    // Delete all
    const result = await db.query(
      `DELETE FROM announcements WHERE id IN (${placeholders})`,
      ids
    );

    // Log to audit log
    await logAudit(
      'Deleted',
      'Announcements',
      null,
      `Bulk deleted ${result.rowCount} announcement(s)`,
      { count: result.rowCount, ids, titles: announcementDetails.rows.map(a => a.title) }
    );

    res.json({ success: true, message: `Successfully deleted ${result.rowCount} announcement(s)`, count: result.rowCount });
  } catch (err) {
    console.error('Error bulk deleting announcements:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

module.exports = router;

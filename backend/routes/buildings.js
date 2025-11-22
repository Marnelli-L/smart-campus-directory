const express = require('express');
const Logger = require('../utils/logger');
const logger = new Logger('buildings');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logAudit } = require('../utils/auditLogger');

logger.info('🧩 buildings.js file loaded');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/directory-images');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'directory-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Helper: map UI status codes (open, closed, maintenance) to DB canonical values
function toDbStatus(status) {
  if (!status) return 'Open';
  const v = status.toLowerCase();
  if (v === 'open') return 'Open';
  if (v === 'closed' || v === 'temporarily closed') return 'Temporarily Closed';
  if (v === 'maintenance' || v === 'under maintenance') return 'Under Maintenance';
  return 'Open';
}

// Helper: map DB canonical values back to UI lowercase codes used in legacy parts of UI
function fromDbStatus(dbStatus) {
  switch (dbStatus) {
    case 'Open': return 'open';
    case 'Temporarily Closed': return 'closed';
    case 'Under Maintenance': return 'maintenance';
    default: return (dbStatus || 'Open').toLowerCase();
  }
}

// Mock data for testing when database is not available
const mockBuildings = [
  {
    id: 1,
    name: "Registrar",
    location: "Main Building, 1st Floor",
    contact: "123-4567",
    email: "registrar@udm.edu.ph",
    staff: "Ms. Maria Santos",
    office_hours: "Mon-Fri 8:00am-5:00pm",
    category: "Administrative",
    status: "open",
    announcement: ""
  },
  {
    id: 2,
    name: "Library",
    location: "Library Building, 2nd Floor",
    contact: "234-5678",
    email: "library@udm.edu.ph",
    staff: "Mr. Juan Dela Cruz",
    office_hours: "Mon-Sat 8:00am-6:00pm",
    category: "Support",
    status: "open",
    announcement: ""
  },
  {
    id: 3,
    name: "CCS Department",
    location: "Villar Wing, 2nd Floor",
    contact: "678-9012",
    email: "ccs@udm.edu.ph",
    staff: "Dr. Liza Cruz",
    office_hours: "Mon-Fri 8:00am-5:00pm",
    category: "Academic",
    status: "open",
    announcement: ""
  }
];

// GET all buildings/departments
router.get('/', async (req, res) => {
  logger.info('📡 /api/buildings route accessed');

  try {
    // Try database first
    const db = require('../db/db');
    const result = await db.query('SELECT * FROM directories ORDER BY name');
    const mapped = result.rows.map(r => ({
      ...r,
      status: fromDbStatus(r.status),
      image: r.image || null
    }));
    logger.info(`✅ ${mapped.length} directory rows fetched from database.`);
    res.status(200).json(mapped);
  } catch (err) {
    logger.error('❌ Database query failed for directories table. No fallback will be used.');
    logger.error(err);
    res.status(500).json({ error: 'Database fetch failed', details: err.message });
  }
});

// POST new building/department
router.post('/', upload.single('image'), async (req, res) => {
  logger.info('📡 POST /api/buildings route accessed');
  logger.info('📦 req.body:', req.body);
  logger.info('📦 req.file:', req.file);
  
  try {
    // Check if req.body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No form data received. Make sure to send as multipart/form-data.' });
    }
    
    let { name, location, contact, email, staff, office_hours, category, status, announcement } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const allowedCategories = ['General','Administrative','Academic','Support'];
    if (!allowedCategories.includes(category)) category = 'General';
    // Normalize status to DB canonical value
    status = toDbStatus(status);
    
    // Handle image upload
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/directory-images/${req.file.filename}`;
      logger.info('✅ Image uploaded:', imagePath);
    }
    
    try {
      // Try database first
      const db = require('../db/db');
      const result = await db.query(
        'INSERT INTO directories (name, location, contact, email, staff, office_hours, category, status, announcement, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [name, location, contact, email || '', staff || '', office_hours || 'Mon-Fri 8:00am-5:00pm', category || 'General', status || 'Open', announcement || '', imagePath]
      );
      const inserted = { ...result.rows[0], status: fromDbStatus(result.rows[0].status) };
      logger.info('✅ Building created in database:', inserted);
      
      // Log to audit log
      logger.info('🔍 About to log audit entry for building creation...');
      try {
        const auditResult = await logAudit(
          'Created',
          'Directory',
          inserted.id,
          `Directory entry "${inserted.name}" created`,
          { name: inserted.name, category: inserted.category, status: inserted.status }
        );
        logger.info('✅ Audit log result:', auditResult);
      } catch (auditError) {
        logger.error('❌ Audit log failed:', auditError);
      }
      
      res.status(201).json(inserted);
    } catch (dbErr) {
      logger.error('❌ Database INSERT error:', dbErr);
      // Delete uploaded file if database insert fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ error: 'Database insert failed', details: dbErr.message });
    }
  } catch (err) {
    logger.error('❌ ERROR creating building:', err.stack);
    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).send('Server error: ' + err.message);
  }
});

// PUT update building/department
router.put('/:id', upload.single('image'), async (req, res) => {
  logger.info('📡 PUT /api/buildings/:id route accessed');
  logger.info('📦 req.body:', req.body);
  logger.info('📦 req.file:', req.file);
  
  try {
    const { id } = req.params;
    
    // Check if req.body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'No form data received. Make sure to send as multipart/form-data.' });
    }
    
    let { name, location, contact, email, staff, office_hours, category, status, announcement } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const allowedCategories = ['General','Administrative','Academic','Support'];
    if (!allowedCategories.includes(category)) category = 'General';
    status = toDbStatus(status);
    
    // Handle image upload
    let imagePath = req.body.image || null; // Keep existing image if no new upload
    if (req.file) {
      imagePath = `/uploads/directory-images/${req.file.filename}`;
      logger.info('✅ New image uploaded:', imagePath);
      
      // Delete old image if it exists
      try {
        const db = require('../db/db');
        const oldData = await db.query('SELECT image FROM directories WHERE id = $1', [id]);
        if (oldData.rows.length > 0 && oldData.rows[0].image) {
          const oldImagePath = path.join(__dirname, '..', oldData.rows[0].image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            logger.info('✅ Old image deleted:', oldData.rows[0].image);
          }
        }
      } catch (err) {
        logger.warn('⚠️ Could not delete old image:', err.message);
      }
    }
    
    try {
      // Try database first
      const db = require('../db/db');
      const result = await db.query(
        'UPDATE directories SET name = $1, location = $2, contact = $3, email = $4, staff = $5, office_hours = $6, category = $7, status = $8, announcement = $9, image = $10 WHERE id = $11 RETURNING *',
        [name, location, contact, email || '', staff || '', office_hours || 'Mon-Fri 8:00am-5:00pm', category || 'General', status || 'Open', announcement || '', imagePath, id]
      );
      
      if (result.rows.length === 0) {
        // Delete uploaded file if update fails
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Building not found' });
      }
      
      const updated = { ...result.rows[0], status: fromDbStatus(result.rows[0].status) };
      logger.info('✅ Building updated in database:', updated);
      
      // Log to audit log
      await logAudit(
        'Updated',
        'Directory',
        updated.id,
        `Directory entry "${updated.name}" modified`,
        { name: updated.name, category: updated.category, status: updated.status }
      );
      
      res.status(200).json(updated);
    } catch (dbErr) {
      logger.error('❌ Database UPDATE error:', dbErr);
      // Delete uploaded file if database update fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ error: 'Database update failed', details: dbErr.message });
    }
  } catch (err) {
    logger.error('❌ ERROR updating building:', err.stack);
    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).send('Server error: ' + err.message);
  }
});

// DELETE building/department
router.delete('/:id', async (req, res) => {
  logger.info('📡 DELETE /api/buildings/:id route accessed');
  
  try {
    const { id } = req.params;
    
    try {
      // Try database first
      const db = require('../db/db');
      const result = await db.query('DELETE FROM directories WHERE id = $1 RETURNING *', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Building not found' });
      }
      
      const deleted = result.rows[0];
      
      // Log to audit log
      await logAudit(
        'Deleted',
        'Directory',
        deleted.id,
        `Directory entry "${deleted.name}" removed`,
        { name: deleted.name, id: deleted.id }
      );
      
      logger.info('✅ Building deleted from database:', deleted);
      res.status(200).json({ message: 'Building deleted successfully', building: deleted });
    } catch (dbErr) {
      logger.error('❌ Database DELETE error:', dbErr);
      return res.status(500).json({ error: 'Database delete failed', details: dbErr.message });
    }
  } catch (err) {
    logger.error('❌ ERROR deleting building:', err.stack);
    res.status(500).send('Server error: ' + err.message);
  }
});

// Bulk delete buildings/directories (admin only)
router.post('/bulk-delete', async (req, res) => {
  logger.info('📡 POST /api/buildings/bulk-delete route accessed');
  
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty ids array' });
    }

    const db = require('../db/db');
    
    // Get building details before deleting for audit log
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const buildingDetails = await db.query(
      `SELECT id, name FROM directories WHERE id IN (${placeholders})`,
      ids
    );

    // Delete all
    const result = await db.query(
      `DELETE FROM directories WHERE id IN (${placeholders})`,
      ids
    );

    // Log to audit log
    await logAudit(
      'Deleted',
      'Directory',
      null,
      `Bulk deleted ${result.rowCount} directory entry/entries`,
      { count: result.rowCount, ids, names: buildingDetails.rows.map(b => b.name) }
    );

    logger.info(`✅ Bulk deleted ${result.rowCount} buildings`);
    res.json({ message: `Successfully deleted ${result.rowCount} directory entry/entries`, count: result.rowCount });
  } catch (error) {
    logger.error('❌ Error bulk deleting buildings:', error);
    res.status(500).json({ error: 'Failed to bulk delete directory entries', details: error.message });
  }
});

module.exports = router;

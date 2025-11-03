-- ============================================
-- AUDIT LOG TABLE SCHEMA
-- ============================================
-- Purpose: Track all administrative actions and modifications
-- in the Smart Campus Directory admin panel
-- 
-- Features:
-- - Comprehensive activity tracking
-- - Entity-level metadata
-- - User attribution
-- - Timestamp precision
-- - Indexed for fast queries
-- ============================================

-- Create the audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  
  -- Action tracking
  action VARCHAR(50) NOT NULL,
  -- Common actions: 'Created', 'Updated', 'Deleted', 'Exported', 'Navigation', 'Login', 'Logout'
  
  -- Entity information
  entity VARCHAR(100) NOT NULL,
  -- Examples: 'Announcements', 'Directory', 'Feedback', 'Issue Reports', 'Visitor Feedback', 'System'
  
  entity_id INTEGER,
  -- Optional: ID of the affected entity (announcement_id, building_id, etc.)
  
  -- Details
  description TEXT NOT NULL,
  -- Human-readable description of what happened
  
  -- Metadata (stored as JSONB for flexibility)
  metadata JSONB DEFAULT '{}',
  -- Store additional context: { count: 5, category: 'Maintenance', status: 'Active' }
  
  -- User tracking
  user_name VARCHAR(100) DEFAULT 'Admin',
  -- Username or role of the person who performed the action
  
  user_id INTEGER,
  -- Optional: Link to users table if you implement authentication
  
  -- IP and session tracking (optional for enhanced security)
  ip_address VARCHAR(45),
  -- IPv4 or IPv6 address
  
  session_id VARCHAR(255),
  -- Browser session identifier
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- When the action occurred
  
  -- Indexes for performance
  CONSTRAINT audit_log_action_check CHECK (action IN (
    'Created', 'Updated', 'Deleted', 'Exported', 
    'Navigation', 'Login', 'Logout', 'Restored', 'Archived'
  ))
);

-- ============================================
-- INDEXES FOR QUERY PERFORMANCE
-- ============================================

-- Index on timestamp for date-range queries
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Index on action for filtering by action type
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Index on entity for filtering by entity type
CREATE INDEX idx_audit_log_entity ON audit_log(entity);

-- Index on user_name for filtering by user
CREATE INDEX idx_audit_log_user_name ON audit_log(user_name);

-- Composite index for common query patterns
CREATE INDEX idx_audit_log_entity_action ON audit_log(entity, action, created_at DESC);

-- GIN index for JSONB metadata queries (if you need to search within metadata)
CREATE INDEX idx_audit_log_metadata ON audit_log USING GIN (metadata);

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Get recent audit entries (last 100)
-- SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100;

-- Get all actions by a specific user
-- SELECT * FROM audit_log WHERE user_name = 'Admin' ORDER BY created_at DESC;

-- Get all deletions
-- SELECT * FROM audit_log WHERE action = 'Deleted' ORDER BY created_at DESC;

-- Get all actions on announcements
-- SELECT * FROM audit_log WHERE entity = 'Announcements' ORDER BY created_at DESC;

-- Get actions within a date range
-- SELECT * FROM audit_log 
-- WHERE created_at BETWEEN '2025-01-01' AND '2025-12-31'
-- ORDER BY created_at DESC;

-- Get actions with specific metadata
-- SELECT * FROM audit_log 
-- WHERE metadata @> '{"category": "Maintenance"}'::jsonb
-- ORDER BY created_at DESC;

-- Statistics: Count actions by type
-- SELECT action, COUNT(*) as count 
-- FROM audit_log 
-- GROUP BY action 
-- ORDER BY count DESC;

-- Statistics: Count actions by entity
-- SELECT entity, COUNT(*) as count 
-- FROM audit_log 
-- GROUP BY entity 
-- ORDER BY count DESC;

-- Statistics: Daily activity
-- SELECT 
--   DATE(created_at) as date,
--   COUNT(*) as total_actions,
--   COUNT(CASE WHEN action = 'Created' THEN 1 END) as created,
--   COUNT(CASE WHEN action = 'Updated' THEN 1 END) as updated,
--   COUNT(CASE WHEN action = 'Deleted' THEN 1 END) as deleted
-- FROM audit_log
-- GROUP BY DATE(created_at)
-- ORDER BY date DESC;

-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- Clean up old audit entries (keep last 6 months)
-- DELETE FROM audit_log 
-- WHERE created_at < NOW() - INTERVAL '6 months';

-- Archive old entries to a separate table (recommended for production)
-- CREATE TABLE audit_log_archive (LIKE audit_log INCLUDING ALL);
-- INSERT INTO audit_log_archive 
-- SELECT * FROM audit_log 
-- WHERE created_at < NOW() - INTERVAL '1 year';
-- DELETE FROM audit_log 
-- WHERE created_at < NOW() - INTERVAL '1 year';

-- ============================================
-- OPTIONAL: TRIGGER FOR AUTO-AUDITING
-- ============================================
-- You can create triggers to automatically log changes to other tables

-- Example: Auto-audit announcements table
-- CREATE OR REPLACE FUNCTION audit_announcements()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF (TG_OP = 'DELETE') THEN
--     INSERT INTO audit_log (action, entity, entity_id, description, metadata)
--     VALUES ('Deleted', 'Announcements', OLD.id, 
--             'Announcement "' || OLD.title || '" deleted',
--             jsonb_build_object('title', OLD.title, 'category', OLD.category));
--     RETURN OLD;
--   ELSIF (TG_OP = 'UPDATE') THEN
--     INSERT INTO audit_log (action, entity, entity_id, description, metadata)
--     VALUES ('Updated', 'Announcements', NEW.id,
--             'Announcement "' || NEW.title || '" updated',
--             jsonb_build_object('title', NEW.title, 'category', NEW.category));
--     RETURN NEW;
--   ELSIF (TG_OP = 'INSERT') THEN
--     INSERT INTO audit_log (action, entity, entity_id, description, metadata)
--     VALUES ('Created', 'Announcements', NEW.id,
--             'Announcement "' || NEW.title || '" created',
--             jsonb_build_object('title', NEW.title, 'category', NEW.category));
--     RETURN NEW;
--   END IF;
--   RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER announcements_audit_trigger
-- AFTER INSERT OR UPDATE OR DELETE ON announcements
-- FOR EACH ROW EXECUTE FUNCTION audit_announcements();

-- ============================================
-- INTEGRATION WITH BACKEND
-- ============================================
-- 
-- To integrate with your Node.js backend, create API endpoints:
--
-- 1. GET /api/audit-log
--    - Fetch audit log entries with filtering and pagination
--    - Example: GET /api/audit-log?action=Deleted&entity=Announcements&limit=50
--
-- 2. POST /api/audit-log
--    - Create new audit log entry
--    - Body: { action, entity, entity_id, description, metadata, user_name }
--
-- 3. DELETE /api/audit-log
--    - Admin-only: Clear old audit entries
--
-- Example Node.js route:
-- 
-- router.get('/api/audit-log', async (req, res) => {
--   try {
--     const { action, entity, limit = 100, offset = 0 } = req.query;
--     let query = 'SELECT * FROM audit_log WHERE 1=1';
--     const params = [];
--     
--     if (action) {
--       params.push(action);
--       query += ` AND action = $${params.length}`;
--     }
--     if (entity) {
--       params.push(entity);
--       query += ` AND entity = $${params.length}`;
--     }
--     
--     query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
--     params.push(limit, offset);
--     
--     const result = await pool.query(query, params);
--     res.json({ data: result.rows });
--   } catch (error) {
--     console.error('Error fetching audit log:', error);
--     res.status(500).json({ error: 'Failed to fetch audit log' });
--   }
-- });
--
-- router.post('/api/audit-log', async (req, res) => {
--   try {
--     const { action, entity, entity_id, description, metadata, user_name } = req.body;
--     const query = `
--       INSERT INTO audit_log (action, entity, entity_id, description, metadata, user_name)
--       VALUES ($1, $2, $3, $4, $5, $6)
--       RETURNING *
--     `;
--     const result = await pool.query(query, [
--       action, entity, entity_id, description, 
--       JSON.stringify(metadata || {}), user_name || 'Admin'
--     ]);
--     res.json({ data: result.rows[0] });
--   } catch (error) {
--     console.error('Error creating audit log:', error);
--     res.status(500).json({ error: 'Failed to create audit log' });
--   }
-- });

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. This schema is designed to work with PostgreSQL
-- 2. The metadata JSONB column allows flexible storage of action-specific data
-- 3. Indexes are optimized for common query patterns (filtering, sorting)
-- 4. Consider implementing retention policies for large deployments
-- 5. For compliance, you may want to make audit_log entries immutable
--    (no UPDATE/DELETE allowed except by system admin)
-- 6. Consider encrypting sensitive metadata if storing PII
-- 7. Regular backups of audit_log table are recommended for compliance
--
-- ============================================

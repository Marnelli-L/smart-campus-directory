-- ============================================
-- SMART CAMPUS DIRECTORY - DATABASE INITIALIZATION
-- ============================================
-- Run this file on your Render PostgreSQL database
-- to create all required tables and initial data
-- ============================================

-- 1. DIRECTORIES TABLE
DROP TABLE IF EXISTS directories CASCADE;

CREATE TABLE directories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(255),
    website VARCHAR(255),
    staff VARCHAR(255),
    office_hours VARCHAR(255) DEFAULT 'Mon-Fri 8:00am-5:00pm',
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    announcement TEXT DEFAULT '',
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE directories
    ADD CONSTRAINT chk_directories_category CHECK (category IN ('General','Administrative','Academic','Support')),
    ADD CONSTRAINT chk_directories_status CHECK (status IN ('Open','Temporarily Closed','Under Maintenance'));

CREATE INDEX idx_directories_category ON directories(category);
CREATE INDEX idx_directories_status ON directories(status);
CREATE INDEX idx_directories_name ON directories(name);

CREATE OR REPLACE FUNCTION update_directories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_directories_updated_at ON directories;
CREATE TRIGGER trigger_directories_updated_at
    BEFORE UPDATE ON directories
    FOR EACH ROW
    EXECUTE FUNCTION update_directories_updated_at();

INSERT INTO directories (name, location, contact, email, category, status, staff)
VALUES
('Registrar Office','Main Building, 1st Floor','123-4567','registrar@udm.edu.ph','Administrative','Open','Ms. Maria Santos'),
('Library','Library Building, 2nd Floor','234-5678','library@udm.edu.ph','Support','Open','Mr. Juan Dela Cruz');

-- 2. BUILDINGS TABLE
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(255),
    website VARCHAR(255),
    staff VARCHAR(255),
    office_hours VARCHAR(255) DEFAULT 'Mon-Fri 8:00am-5:00pm',
    category VARCHAR(100) DEFAULT 'General',
    status VARCHAR(50) DEFAULT 'open',
    announcement TEXT DEFAULT '',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_buildings_category ON buildings(category);
CREATE INDEX IF NOT EXISTS idx_buildings_status ON buildings(status);
CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(type);

CREATE OR REPLACE FUNCTION update_buildings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_buildings_updated_at ON buildings;
CREATE TRIGGER trigger_buildings_updated_at
    BEFORE UPDATE ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION update_buildings_updated_at();

INSERT INTO buildings (name, location, contact, email, website, staff, office_hours, category, status, latitude, longitude, type, description) VALUES
('Registrar', 'Main Building, 1st Floor', '123-4567', 'registrar@udm.edu.ph', 'https://udm.edu.ph/registrar', 'Ms. Maria Santos', 'Mon-Fri 8:00am-5:00pm', 'Administrative', 'open', 14.5995, 120.9842, 'Academic', 'Student registration and academic records'),
('Library', 'Library Building, 2nd Floor', '234-5678', 'library@udm.edu.ph', 'https://udm.edu.ph/library', 'Mr. Juan Dela Cruz', 'Mon-Sat 8:00am-6:00pm', 'Support', 'open', 14.6002, 120.9845, 'Facility', 'Campus library and study area'),
('CCS Department', 'Villar Wing, 2nd Floor', '678-9012', 'ccs@udm.edu.ph', 'https://udm.edu.ph/ccs', 'Dr. Liza Cruz', 'Mon-Fri 8:00am-5:00pm', 'Academic', 'open', 14.5993, 120.9844, 'Academic', 'College of Computer Studies');

-- 3. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'General',
  icon VARCHAR(100) NOT NULL DEFAULT 'bell',
  tags TEXT[],
  publish_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  status VARCHAR(20) DEFAULT 'Active',
  priority VARCHAR(20) DEFAULT 'Normal'
);

CREATE INDEX IF NOT EXISTS idx_announcements_publish_date ON announcements(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);

INSERT INTO announcements (title, content, category, icon, tags, publish_date, expire_date, status, priority, created_by) 
VALUES 
  (
    'Welcome to Smart Campus',
    'Welcome to the UDM Smart Campus Directory System. Find buildings, services, and navigate our campus easily.',
    'General',
    'bell',
    ARRAY['welcome', 'info'],
    NOW(),
    NOW() + INTERVAL '365 days',
    'Active',
    'Normal',
    'System'
  );

-- 4. FEEDBACK AND REPORTS TABLES
DROP TABLE IF EXISTS feedback CASCADE;

CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE feedback
    ADD CONSTRAINT chk_feedback_status CHECK (status IN ('New','Read','Resolved','Archived'));

CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_feedback_email ON feedback(email);

DROP TABLE IF EXISTS reports CASCADE;

CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'Medium',
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE reports
    ADD CONSTRAINT chk_report_severity CHECK (severity IN ('Low','Medium','High','Critical')),
    ADD CONSTRAINT chk_report_status CHECK (status IN ('New','In Progress','Resolved','Closed','Pending'));

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_severity ON reports(severity);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_assigned_to ON reports(assigned_to);

DROP TABLE IF EXISTS visitor_feedback CASCADE;

CREATE TABLE visitor_feedback (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    contact VARCHAR(100),
    time_in TIMESTAMP,
    time_out TIMESTAMP,
    feedback TEXT,
    services_visited VARCHAR(255),
    rating VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visitor_feedback_created_at ON visitor_feedback(created_at DESC);
CREATE INDEX idx_visitor_feedback_contact ON visitor_feedback(contact);

-- Triggers for feedback tables
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_feedback_updated_at ON feedback;
CREATE TRIGGER trigger_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_updated_at();

CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reports_updated_at ON reports;
CREATE TRIGGER trigger_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

CREATE OR REPLACE FUNCTION update_visitor_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_visitor_feedback_updated_at ON visitor_feedback;
CREATE TRIGGER trigger_visitor_feedback_updated_at
    BEFORE UPDATE ON visitor_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_visitor_feedback_updated_at();

-- 5. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id INTEGER,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  user_name VARCHAR(100) DEFAULT 'Admin',
  user_id INTEGER,
  ip_address VARCHAR(45),
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_log_action_check CHECK (action IN (
    'Created', 'Updated', 'Deleted', 'Exported', 
    'Navigation', 'Login', 'Logout', 'Restored', 'Archived'
  ))
);

CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity);
CREATE INDEX idx_audit_log_user_name ON audit_log(user_name);
CREATE INDEX idx_audit_log_entity_action ON audit_log(entity, action, created_at DESC);
CREATE INDEX idx_audit_log_metadata ON audit_log USING GIN (metadata);

-- ============================================
-- INITIALIZATION COMPLETE
-- ============================================
-- All tables created successfully!
-- You can now start using the Smart Campus Directory system.
-- ============================================

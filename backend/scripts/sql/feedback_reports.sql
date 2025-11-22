-- Create feedback and reports tables for admin management

-- Feedback Table
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

-- Constraint for feedback status
ALTER TABLE feedback
    ADD CONSTRAINT chk_feedback_status CHECK (status IN ('New','Read','Resolved','Archived'));

-- Report Issues Table
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

-- Constraints for reports
ALTER TABLE reports
    ADD CONSTRAINT chk_report_severity CHECK (severity IN ('Low','Medium','High','Critical')),
    ADD CONSTRAINT chk_report_status CHECK (status IN ('New','In Progress','Resolved','Closed','Pending'));

-- Visitor Feedback Table
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

-- Indexes for quick filtering
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_feedback_email ON feedback(email);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_severity ON reports(severity);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_assigned_to ON reports(assigned_to);

CREATE INDEX idx_visitor_feedback_created_at ON visitor_feedback(created_at DESC);
CREATE INDEX idx_visitor_feedback_contact ON visitor_feedback(contact);

-- Triggers to auto-update updated_at
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

-- Optional: Sample data for testing
INSERT INTO feedback (name, email, message, status)
VALUES
('John Doe', 'john@example.com', 'Great navigation system!', 'Read'),
('Jane Smith', 'jane@example.com', 'Need better map display', 'New');

INSERT INTO reports (name, email, issue_type, description, severity, status)
VALUES
('Admin', 'admin@udm.edu.ph', 'Bug', 'Map not loading on mobile', 'High', 'In Progress'),
('User', 'user@udm.edu.ph', 'Feature Request', 'Add offline mode', 'Medium', 'New');

INSERT INTO visitor_feedback (name, address, contact, time_in, feedback, rating)
VALUES
('Maria Garcia', '123 Main St', '555-1234', NOW(), 'Very helpful staff', 'Excellent');

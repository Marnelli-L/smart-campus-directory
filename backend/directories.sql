-- Recreate directories table with allowed option sets matching Admin UI
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

-- Enforce allowed values using CHECK constraints (case sensitive to match stored values)
ALTER TABLE directories
    ADD CONSTRAINT chk_directories_category CHECK (category IN ('General','Administrative','Academic','Support')),
    ADD CONSTRAINT chk_directories_status CHECK (status IN ('Open','Temporarily Closed','Under Maintenance'));

-- Indexes for quick filtering
CREATE INDEX idx_directories_category ON directories(category);
CREATE INDEX idx_directories_status ON directories(status);
CREATE INDEX idx_directories_name ON directories(name);

-- Trigger to auto-update updated_at
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

-- Sample seed rows (optional)
INSERT INTO directories (name, location, contact, email, category, status, staff)
VALUES
('Registrar Office','Main Building, 1st Floor','123-4567','registrar@udm.edu.ph','Administrative','Open','Ms. Maria Santos'),
('Library','Library Building, 2nd Floor','234-5678','library@udm.edu.ph','Support','Open','Mr. Juan Dela Cruz');


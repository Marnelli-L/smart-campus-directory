-- Buildings/Departments table for smart campus directory system
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

-- Sample buildings/departments data
INSERT INTO buildings (name, location, contact, email, website, staff, office_hours, category, status, announcement, latitude, longitude, type, description) VALUES
('Registrar', 'Main Building, 1st Floor', '123-4567', 'registrar@udm.edu.ph', 'https://udm.edu.ph/registrar', 'Ms. Maria Santos', 'Mon-Fri 8:00am-5:00pm', 'Administrative', 'open', '', 14.5995, 120.9842, 'Academic', 'Student registration and academic records'),
('Library', 'Library Building, 2nd Floor', '234-5678', 'library@udm.edu.ph', 'https://udm.edu.ph/library', 'Mr. Juan Dela Cruz', 'Mon-Sat 8:00am-6:00pm', 'Support', 'open', '', 14.6002, 120.9845, 'Facility', 'Campus library and study area'),
('Guidance Office', 'Annex, Room 101', '345-6789', 'guidance@udm.edu.ph', '', 'Ms. Ana Reyes', 'Mon-Fri 8:00am-5:00pm', 'Support', 'open', '', 14.5990, 120.9840, 'Academic', 'Student guidance and counseling services'),
('IT Department', 'Main Building, 3rd Floor', '456-7890', 'it@udm.edu.ph', '', 'Engr. Carlo Mendoza', 'Mon-Fri 8:00am-5:00pm', 'Administrative', 'open', '', 14.5995, 120.9842, 'Academic', 'Information technology support and services'),
('Computer Laboratory', 'Amba Wing, 2nd Floor', '567-8901', '', '', 'Mr. Mark Lim', 'Mon-Sat 8:00am-6:00pm', 'Support', 'open', '', 14.5997, 120.9843, 'Facility', 'Computer labs for student use'),
('CCS Department', 'Villar Wing, 2nd Floor', '678-9012', 'ccs@udm.edu.ph', 'https://udm.edu.ph/ccs', 'Dr. Liza Cruz', 'Mon-Fri 8:00am-5:00pm', 'Academic', 'open', '', 14.5993, 120.9844, 'Academic', 'College of Computer Studies'),
('CCJ Department', 'Villar Wing, 3rd Floor', '789-0123', 'ccj@udm.edu.ph', '', 'Atty. Jose Ramos', 'Mon-Fri 8:00am-5:00pm', 'Academic', 'open', '', 14.5993, 120.9844, 'Academic', 'College of Criminal Justice'),
('CAS Department', 'Villar Wing, 4th Floor', '890-1234', 'cas@udm.edu.ph', '', 'Dr. Maria Lopez', 'Mon-Fri 8:00am-5:00pm', 'Academic', 'open', '', 14.5993, 120.9844, 'Academic', 'College of Arts and Sciences'),
('CBA Department', 'Villar Wing, 6th Floor', '012-3456', 'cba@udm.edu.ph', '', 'Dr. Ramon Santos', 'Mon-Fri 8:00am-5:00pm', 'Academic', 'open', '', 14.5993, 120.9844, 'Academic', 'College of Business Administration'),
('Guidance and Counseling Center', 'Annex, Room 102', '234-5679', 'guidancecenter@udm.edu.ph', '', 'Ms. Ana Reyes', 'Mon-Fri 8:00am-5:00pm', 'Support', 'open', '', 14.5990, 120.9840, 'Academic', 'Student guidance and counseling center'),
('Gymnasium', 'Sports Complex', '111-2222', 'gym@udm.edu.ph', '', 'Coach Roberto Garcia', 'Mon-Sat 6:00am-8:00pm', 'Support', 'open', '', 14.5988, 120.9838, 'Recreational', 'Indoor sports and recreational facilities');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buildings_category ON buildings(category);
CREATE INDEX IF NOT EXISTS idx_buildings_status ON buildings(status);
CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(type);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_buildings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_buildings_updated_at
    BEFORE UPDATE ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION update_buildings_updated_at();

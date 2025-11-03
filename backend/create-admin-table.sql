-- Create admins table for authentication
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (username: admin, password: admin)
-- NOTE: In production, passwords should be hashed!
INSERT INTO admins (username, password, email)
VALUES ('admin', 'admin', 'admin@udm.edu.ph')
ON CONFLICT (username) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

SELECT 'Admins table created successfully!' as message;
SELECT * FROM admins;

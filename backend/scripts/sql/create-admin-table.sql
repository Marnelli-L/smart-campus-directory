-- Create admins table for authentication
-- NOTE: This SQL file is for reference only.
-- Use create-admin.js to create the table with a properly hashed password.
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- Stores bcrypt hashed passwords
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- DO NOT insert plain text passwords!
-- Run: node create-admin.js to create admin user with hashed password
-- Default credentials: admin / admin (securely hashed)

SELECT 'Admins table created successfully!' as message;
SELECT * FROM admins;

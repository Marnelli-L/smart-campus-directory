const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// IMPORTANT: Never commit database credentials to version control
// Use environment variables instead
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
  console.error('Please set DATABASE_URL in your .env file or environment variables.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdminTable() {
  console.log('🔄 Creating admins table...');
  
  try {
    // Create the table structure first
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
    `;
    
    await pool.query(createTableSQL);
    console.log('✅ Admins table structure created');
    
    // Hash the default password
    const defaultPassword = 'admin';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    // Insert default admin user with hashed password
    const insertSQL = `
      INSERT INTO admins (username, password, email)
      VALUES ($1, $2, $3)
      ON CONFLICT (username) DO UPDATE
      SET password = EXCLUDED.password,
          email = EXCLUDED.email,
          updated_at = CURRENT_TIMESTAMP;
    `;
    
    await pool.query(insertSQL, ['admin', hashedPassword, 'admin@udm.edu.ph']);
    
    console.log('✅ Admins table created successfully!');
    console.log('');
    console.log('📝 Default admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('🔐 Password is securely hashed with bcrypt');
    
  } catch (error) {
    console.error('❌ Error creating admins table:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminTable();

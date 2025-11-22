const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Use your Render DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://smart_campus_db_dc3v_user:sc422wAULkxfjymRa2Ix2zoG4A14qgcN@dpg-d44fa8k9c44c73bkvjk0-a.oregon-postgres.render.com/smart_campus_db_dc3v';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  console.log('🔄 Connecting to Render database...');
  
  try {
    // Read the SQL file
    const sqlFile = fs.readFileSync(path.join(__dirname, 'init-database.sql'), 'utf8');
    
    console.log('📄 Running initialization SQL...');
    
    // Execute the SQL
    await pool.query(sqlFile);
    
    console.log('✅ Database initialized successfully!');
    console.log('');
    console.log('Tables created:');
    console.log('  ✓ directories');
    console.log('  ✓ buildings');
    console.log('  ✓ announcements');
    console.log('  ✓ feedback');
    console.log('  ✓ reports');
    console.log('  ✓ visitor_feedback');
    console.log('  ✓ audit_log');
    console.log('');
    console.log('🎉 Your database is ready! Try logging in now.');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

initializeDatabase();

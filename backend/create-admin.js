const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://smart_campus_db_dc3v_user:sc422wAULkxfjymRa2Ix2zoG4A14qgcN@dpg-d44fa8k9c44c73bkvjk0-a.oregon-postgres.render.com/smart_campus_db_dc3v';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdminTable() {
  console.log('🔄 Creating admins table...');
  
  try {
    const sqlFile = fs.readFileSync(path.join(__dirname, 'create-admin-table.sql'), 'utf8');
    await pool.query(sqlFile);
    
    console.log('✅ Admins table created successfully!');
    console.log('');
    console.log('📝 Default admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admins table:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminTable();

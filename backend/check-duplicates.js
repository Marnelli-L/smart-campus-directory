const { Pool } = require('pg');
require('dotenv').config();

// Use Render DATABASE_URL (hardcoded for this diagnostic script)
const DATABASE_URL = 'postgresql://smart_campus_db_dc3v_user:sc422wAULkxfjymRa2Ix2zoG4A14qgcN@dpg-d44fa8k9c44c73bkvjk0-a.oregon-postgres.render.com/smart_campus_db_dc3v';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate directory entries...');
  
  try {
    const result = await pool.query(`
      SELECT id, name, image, location, created_at 
      FROM directories 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    
    console.log('\n📊 Recent directory entries:');
    console.log('─'.repeat(100));
    result.rows.forEach(row => {
      console.log(`ID: ${row.id} | Name: ${row.name} | Image: ${row.image || 'NO IMAGE'} | Created: ${row.created_at}`);
    });
    console.log('─'.repeat(100));
    console.log(`\nTotal entries: ${result.rows.length}`);
    
    // Check for duplicates by name
    const duplicates = {};
    result.rows.forEach(row => {
      const name = row.name.toLowerCase().trim();
      if (!duplicates[name]) {
        duplicates[name] = [];
      }
      duplicates[name].push(row);
    });
    
    console.log('\n🔍 Duplicate analysis:');
    Object.keys(duplicates).forEach(name => {
      if (duplicates[name].length > 1) {
        console.log(`\n⚠️  "${name}" has ${duplicates[name].length} entries:`);
        duplicates[name].forEach(entry => {
          console.log(`   - ID ${entry.id}: ${entry.image ? '✅ HAS IMAGE' : '❌ NO IMAGE'} (created ${entry.created_at})`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDuplicates();

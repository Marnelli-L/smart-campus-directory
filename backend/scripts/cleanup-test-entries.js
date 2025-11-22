const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://smart_campus_db_dc3v_user:sc422wAULkxfjymRa2Ix2zoG4A14qgcN@dpg-d44fa8k9c44c73bkvjk0-a.oregon-postgres.render.com/smart_campus_db_dc3v';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanupTestEntries() {
  console.log('🧹 Cleaning up test entries from database...');
  
  try {
    // List current entries
    const before = await pool.query('SELECT id, name, image FROM directories ORDER BY id');
    console.log('\n📋 Current entries:');
    before.rows.forEach(r => {
      console.log(`   ID ${r.id}: ${r.name} ${r.image ? '(has image)' : '(no image)'}`);
    });
    
    // Delete entries without images (test entries)
    const deleteResult = await pool.query(`
      DELETE FROM directories 
      WHERE image IS NULL 
      RETURNING id, name
    `);
    
    if (deleteResult.rows.length > 0) {
      console.log(`\n✅ Deleted ${deleteResult.rows.length} test entries:`);
      deleteResult.rows.forEach(r => {
        console.log(`   - ID ${r.id}: ${r.name}`);
      });
    } else {
      console.log('\n✅ No test entries to delete.');
    }
    
    // Show remaining entries
    const after = await pool.query('SELECT id, name, image FROM directories ORDER BY id');
    console.log(`\n📋 Remaining entries (${after.rows.length}):`);
    after.rows.forEach(r => {
      console.log(`   ID ${r.id}: ${r.name} ${r.image ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanupTestEntries();

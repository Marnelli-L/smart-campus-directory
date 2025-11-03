const db = require('./db/db');

async function addImageColumn() {
  try {
    console.log('🔧 Adding image column to directories table...');
    
    // Check if column already exists
    const checkResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'directories' AND column_name = 'image'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Image column already exists!');
      return;
    }
    
    // Add the column
    await db.query('ALTER TABLE directories ADD COLUMN image VARCHAR(500)');
    console.log('✅ Successfully added image column to directories table!');
    
    // Verify it was added
    const verifyResult = await db.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'directories' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Updated directories table columns:');
    verifyResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit(0);
  }
}

addImageColumn();

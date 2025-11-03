const db = require('./db/db');

async function checkImageColumn() {
  try {
    console.log('🔍 Checking if image column exists in directories table...');
    
    const result = await db.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'directories' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Current directories table columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''})`);
    });
    
    const hasImageColumn = result.rows.some(col => col.column_name === 'image');
    
    if (!hasImageColumn) {
      console.log('\n⚠️  IMAGE COLUMN IS MISSING!');
      console.log('\nTo fix this, run one of these commands:');
      console.log('  1. Add column only (keeps data):');
      console.log('     psql -U your_username -d your_database -c "ALTER TABLE directories ADD COLUMN image VARCHAR(500);"');
      console.log('\n  2. Or run: node add-image-column-migration.js');
    } else {
      console.log('\n✅ Image column exists!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkImageColumn();

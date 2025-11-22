/**
 * Database Migration Script
 * Removes unused columns: contact, announcement from buildings
 * Removes unused columns: title, tags from announcements
 * 
 * Run this ONCE on your production database
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration...\n');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Check if columns exist before dropping
    console.log('📋 Checking existing columns...');
    
    const buildingsColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'buildings' 
      AND column_name IN ('contact', 'announcement')
    `);
    
    const announcementsColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'announcements' 
      AND column_name IN ('title', 'tags')
    `);
    
    console.log(`Buildings columns to remove: ${buildingsColumns.rows.map(r => r.column_name).join(', ') || 'none'}`);
    console.log(`Announcements columns to remove: ${announcementsColumns.rows.map(r => r.column_name).join(', ') || 'none'}\n`);
    
    // 2. Remove columns from buildings table
    if (buildingsColumns.rows.length > 0) {
      console.log('🔧 Removing columns from buildings table...');
      
      for (const row of buildingsColumns.rows) {
        await client.query(`ALTER TABLE buildings DROP COLUMN IF EXISTS ${row.column_name}`);
        console.log(`  ✅ Removed '${row.column_name}' from buildings`);
      }
    } else {
      console.log('✓ Buildings table already up to date');
    }
    
    // 3. Remove columns from announcements table
    if (announcementsColumns.rows.length > 0) {
      console.log('\n🔧 Removing columns from announcements table...');
      
      for (const row of announcementsColumns.rows) {
        await client.query(`ALTER TABLE announcements DROP COLUMN IF EXISTS ${row.column_name}`);
        console.log(`  ✅ Removed '${row.column_name}' from announcements`);
      }
    } else {
      console.log('✓ Announcements table already up to date');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // 4. Verify final structure
    console.log('\n📊 Final table structures:');
    
    const buildingsFinal = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'buildings' 
      ORDER BY ordinal_position
    `);
    
    const announcementsFinal = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'announcements' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nBuildings table:');
    buildingsFinal.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    
    console.log('\nAnnouncements table:');
    announcementsFinal.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n🎉 Database is now up to date!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });

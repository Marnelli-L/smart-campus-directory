const db = require('./db/db');

async function checkAnnouncements() {
  try {
    const result = await db.query(`
      SELECT 
        id, 
        title, 
        status,
        publish_date,
        expire_date,
        CURRENT_TIMESTAMP as now,
        (publish_date <= CURRENT_TIMESTAMP) as is_published,
        (expire_date IS NULL OR expire_date > CURRENT_TIMESTAMP) as not_expired
      FROM announcements 
      ORDER BY id
    `);
    
    console.log('\n=== ALL ANNOUNCEMENTS IN DATABASE ===');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log(`\nTotal: ${result.rows.length} announcements`);
    
    // Also check what the public API would return
    const publicResult = await db.query(`
      SELECT 
        id,
        title,
        content,
        category,
        tags,
        publish_date as date,
        expire_date,
        status,
        priority
      FROM announcements
      WHERE status = 'Active' 
        AND publish_date <= CURRENT_TIMESTAMP
        AND (expire_date IS NULL OR expire_date > CURRENT_TIMESTAMP)
      ORDER BY priority DESC, publish_date DESC
    `);
    
    console.log('\n=== ANNOUNCEMENTS RETURNED BY PUBLIC API ===');
    console.log(JSON.stringify(publicResult.rows, null, 2));
    console.log(`\nFiltered results: ${publicResult.rows.length} announcements`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkAnnouncements();

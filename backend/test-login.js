const db = require('./db/db');

async function testLogin() {
  try {
    // Check admins table structure
    console.log('1. Checking admins table structure...');
    const columns = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admins' ORDER BY ordinal_position"
    );
    console.log('Columns:', columns.rows);
    
    // Check admin data
    console.log('\n2. Checking admin records...');
    const admins = await db.query('SELECT * FROM admins');
    console.log('Admins:', admins.rows);
    
    // Test login query
    console.log('\n3. Testing login query...');
    const result = await db.query(
      'SELECT id, username, role FROM admins WHERE username = $1 AND password = $2 LIMIT 1',
      ['admin', 'admin123']
    );
    console.log('Login query result:', result.rows);
    
    if (result.rows.length > 0) {
      console.log('✅ Login query successful!');
    } else {
      console.log('❌ Login query returned no results');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testLogin();

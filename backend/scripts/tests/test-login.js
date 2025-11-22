const db = require('./db/db');
const bcrypt = require('bcrypt');

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
    const admins = await db.query('SELECT id, username, email, created_at FROM admins');
    console.log('Admins:', admins.rows);
    
    // Test login query with bcrypt
    console.log('\n3. Testing login with bcrypt...');
    const testUsername = 'admin';
    const testPassword = 'admin';
    
    const result = await db.query(
      'SELECT id, username, password FROM admins WHERE username = $1 LIMIT 1',
      [testUsername]
    );
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      const isPasswordValid = await bcrypt.compare(testPassword, admin.password);
      
      if (isPasswordValid) {
        console.log('✅ Login successful!');
        console.log('   User ID:', admin.id);
        console.log('   Username:', admin.username);
      } else {
        console.log('❌ Invalid password');
      }
    } else {
      console.log('❌ User not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testLogin();

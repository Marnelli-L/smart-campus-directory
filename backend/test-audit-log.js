// Test script to verify audit logging works
const { logAudit } = require('./utils/auditLogger');

async function testAuditLog() {
  console.log('🧪 Testing audit log functionality...\n');
  
  try {
    // Test 1: Create a test entry
    console.log('Test 1: Creating test audit entry...');
    const result1 = await logAudit(
      'Created',
      'Test Directory',
      999,
      'Test directory entry "Test Building" created',
      { name: 'Test Building', category: 'General', status: 'Open' }
    );
    console.log('✅ Test 1 passed:', result1);
    console.log('');
    
    // Test 2: Create announcement audit entry
    console.log('Test 2: Creating test announcement entry...');
    const result2 = await logAudit(
      'Created',
      'Test Announcements',
      888,
      'Test announcement "Test Announcement" created',
      { category: 'General', priority: 'Normal', status: 'Active' }
    );
    console.log('✅ Test 2 passed:', result2);
    console.log('');
    
    // Test 3: Query recent audit logs
    console.log('Test 3: Querying recent audit logs...');
    const db = require('./db/db');
    const logs = await db.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5');
    console.log('✅ Test 3 - Recent audit logs:');
    logs.rows.forEach((log, i) => {
      console.log(`  ${i + 1}. [${log.action}] ${log.entity} - ${log.description}`);
    });
    console.log('');
    
    console.log('🎉 All tests passed! Audit logging is working correctly.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAuditLog();

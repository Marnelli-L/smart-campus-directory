
console.log('admin route loaded')
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { logAudit } = require('../utils/auditLogger');

// Admin login route
router.post('/login', async (req, res) => {
  console.log('Login attempt:', req.body.username); // Log username only (not password)
  const { username, password } = req.body;
  
  // Validate input
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }
  
  try {
    // Query for admin user (in production, use hashed passwords)
    const result = await db.query(
      'SELECT id, username FROM admins WHERE username = $1 AND password = $2 LIMIT 1',
      [username, password]
    );
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      
      // Generate a simple session token (in production, use JWT or proper session management)
      const sessionToken = `session_${admin.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Log successful login to audit log
      await logAudit(
        'Login',
        'System',
        admin.id,
        `Admin "${admin.username}" logged in successfully`,
        { username: admin.username, role: 'administrator' }
      );
      
      console.log('✅ Login successful for user:', admin.username);
      
      return res.json({ 
        success: true,
        token: sessionToken,
        user: {
          id: admin.id,
          username: admin.username,
          role: 'administrator'
        }
      });
    }
    
    // Log failed login attempt
    console.warn('⚠️ Failed login attempt for username:', username);
    await logAudit(
      'Failed Login',
      'System',
      null,
      `Failed login attempt for username "${username}"`,
      { username, ip: req.ip }
    );
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid username or password' 
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Verify session token (for future use)
router.post('/verify', async (req, res) => {
  const { token } = req.body;
  
  if (!token || !token.startsWith('session_')) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  
  // In production, verify token against database or Redis
  // For now, just check if token format is valid
  res.json({ success: true, message: 'Token valid' });
});

// Logout route
router.post('/logout', async (req, res) => {
  const { username } = req.body;
  
  try {
    // Log logout to audit log
    await logAudit(
      'Logout',
      'System',
      null,
      `Admin "${username || 'Unknown'}" logged out`,
      { username: username || 'Unknown' }
    );
    
    console.log('✅ Logout successful for user:', username || 'Unknown');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('❌ Logout error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Health check
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'Admin route is working' });
});

module.exports = router;
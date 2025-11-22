const express = require('express');
const Logger = require('../utils/logger');
const logger = new Logger('admin');
const router = express.Router();
const db = require('../db/db');
const { logAudit } = require('../utils/auditLogger');
const bcrypt = require('bcrypt');
const { validateLogin } = require('../middleware/validation');

logger.info('admin route loaded');

// Admin login route with validation
router.post('/login', validateLogin, async (req, res) => {
  logger.info('Login attempt:', req.body.username);
  
  const { username, password } = req.body;
  
  try {
    // Check if running on localhost - allow bypass for testing
    const isLocalhost = req.hostname === 'localhost' || 
                        req.hostname === '127.0.0.1' ||
                        req.get('host')?.includes('localhost');
    
    // In localhost, allow test credentials without database check
    if (isLocalhost && username === 'admin' && password === 'admin') {
      logger.info('✅ Localhost test login successful');
      
      return res.json({ 
        success: true,
        token: `test_session_${Date.now()}`,
        user: {
          id: 1,
          username: 'admin',
          role: 'administrator'
        }
      });
    }
    
    // For production, check database with bcrypt
    const result = await db.query(
      'SELECT id, username, password FROM admins WHERE username = $1 LIMIT 1',
      [username]
    );
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      
      // Compare password with bcrypt hash
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      
      if (!isPasswordValid) {
        // Log failed login attempt
        logger.warn('⚠️ Invalid password for username:', username);
        await logAudit(
          'Failed Login',
          'System',
          null,
          `Failed login attempt for username "${username}" - Invalid password`,
          { username, ip: req.ip }
        );
        
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid username or password' 
        });
      }
      
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
      
      logger.info('✅ Login successful for user:', admin.username);
      
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
    logger.warn('⚠️ Failed login attempt for username:', username);
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
    logger.error('❌ Login error:', err);
    
    // If database error on localhost, provide helpful message
    const isLocalhost = req.hostname === 'localhost' || 
                        req.hostname === '127.0.0.1' ||
                        req.get('host')?.includes('localhost');
    
    if (isLocalhost) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database connection error. Use admin/admin for localhost testing.',
        error: err.message
      });
    }
    
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
    
    logger.info('✅ Logout successful for user:', username || 'Unknown');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    logger.error('❌ Logout error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Health check
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'Admin route is working' });
});

module.exports = router;

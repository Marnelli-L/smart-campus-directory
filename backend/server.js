const express = require('express');
const Logger = require('../utils/logger');
const logger = new Logger('Server');
const cors = require('cors');
const announcementsRouter = require('./announcements');
const buildingsRouter = require('./routes/buildings');
const feedbackRouter = require('./routes/feedback');
const floorsRouter = require('./routes/floors');
const auditLogRouter = require('./routes/audit-log');
const adminRouter = require('./routes/admin');
const path = require('path');

const app = express();

// Configure CORS for development and production
const allowedOrigins = [
  'http://localhost:5176',
  'http://localhost:5178', 
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5177',
  /\.vercel\.app$/,  // Allow all Vercel preview/production deployments
  /\.vercel-preview\.app$/  // Allow Vercel preview deployments
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches regex patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('Blocked origin:', origin);
      callback(null, false);
    }
  },
  credentials: true
}));

app.use(express.json());

// Mount routes
app.use('/api/announcements', announcementsRouter);
app.use('/api/buildings', buildingsRouter);
app.use('/api', feedbackRouter);
app.use('/api/floors', floorsRouter);
app.use('/api/audit-log', auditLogRouter);
app.use('/api/admin', adminRouter);

// Serve uploaded floor geojsons statically
app.use('/floor-maps', express.static(path.resolve(__dirname, 'floor-maps')));

// Serve uploaded directory images statically
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  logger.success(`🧩 Unified server starting`);
  logger.info(`Server running on port ${PORT}`);

  // Schema probe
  try {
    const db = require('./db/db');
    const tables = ['directories', 'buildings'];
    for (const t of tables) {
      const colRes = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [t]);
      if (colRes.rows.length) {
        logger.debug(`📄 Table '${t}' columns:`, colRes.rows.map(r => r.column_name).join(', '));
        const countRes = await db.query(`SELECT COUNT(*) FROM ${t}`);
        logger.debug(`   → Row count: ${countRes.rows[0].count}`);
      } else {
        logger.warn(`⚠️ Table '${t}' not found.`);
      }
    }
  } catch (e) {
    logger.error('❌ Schema probe failed:', e.message);
  }
});

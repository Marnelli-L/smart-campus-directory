const { Pool } = require('pg');
require('dotenv').config();

// SECURITY: Always use DATABASE_URL from environment
// Never hardcode database credentials in production
const DATABASE_URL = process.env.DATABASE_URL;

// Critical errors during startup should use console.error directly
if (!DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL environment variable is not set!');
  console.error('Please set DATABASE_URL in your .env file or environment.');
  console.error('Example: DATABASE_URL=postgresql://user:password@host:5432/database');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : {
    rejectUnauthorized: false  // Required for hosted PostgreSQL (Render, Heroku, etc.)
  }
});

module.exports = pool;

// Test the connection immediately when server starts
const Logger = require('../utils/logger');
const logger = new Logger('Database');

const test = async () => {
  logger.info('🔄 Testing PostgreSQL connection...');
  try {
    const res = await pool.query('SELECT NOW()');
    logger.success('🟢 PostgreSQL connected. Time:', res.rows[0].now);
  } catch (err) {
    logger.error('🔴 PostgreSQL connection failed:', err.message);
    logger.error('🔴 Full error:', err);
  }
};

test();

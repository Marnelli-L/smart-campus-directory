const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL from environment (Render) or fallback to local config
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false  // Required for Render PostgreSQL
        }
      }
    : {
        user: 'postgres',
        host: 'localhost',
        database: 'smartcampus',
        password: 'Access@26',
        port: 5432,
      }
);

module.exports = pool;

// Test the connection immediately when server starts
const test = async () => {
  console.log('🔄 Testing PostgreSQL connection...');
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('🟢 PostgreSQL connected. Time:', res.rows[0].now);
  } catch (err) {
    console.error('🔴 PostgreSQL connection failed:', err.message);
    console.error('🔴 Full error:', err);
  }
};

test();

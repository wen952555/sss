// backend/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

// Create a connection pool using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Immediately test the database connection on startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connection successful. Pool is ready.');
        connection.release();
    } catch (error) {
        console.error('🔴 FATAL: Could not connect to the database.');
        console.error('Please check the following:');
        console.error('  1. Your database server is running.');
        console.error('  2. The .env file in the `backend` directory has the correct DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.');
        console.error('  3. The database specified in DB_NAME exists.');
        console.error('  4. The user has the correct permissions.');
        console.error('Full error:', error.message);
        // Exit the process if the database connection fails, as the app is unusable.
        process.exit(1);
    }
})();

module.exports = pool;
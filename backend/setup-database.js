// backend/setup-database.js
// This script reads the schema.sql file and executes it to set up the database tables.

require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');

async function setupDatabase() {
  console.log('Starting database setup...');

  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };

  if (!dbConfig.host || !dbConfig.user || !dbConfig.database) {
    console.error('🔴 Error: Database configuration is missing in your .env file.');
    console.error('Please ensure DB_HOST, DB_USER, and DB_NAME are set.');
    return;
  }

  let connection;

  try {
    // Connect to the MySQL server
    console.log(`Connecting to database "${dbConfig.database}" on host "${dbConfig.host}"...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Successfully connected to the database.');

    // Read the schema.sql file
    console.log('Reading schema.sql file...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf-8');

    // Split the schema into individual statements
    const statements = schemaSQL.split(';').filter(statement => statement.trim() !== '');

    // Execute each statement one by one
    for (const statement of statements) {
      console.log(`Executing statement: "${statement.substring(0, 50)}..."`);
      await connection.query(statement);
    }

    console.log('✅ All tables created successfully!');
    console.log('Database setup is complete. You can now start the main server with "npm start".');

  } catch (error) {
    console.error('🔴 An error occurred during database setup:');
    console.error(error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Hint: This is likely an issue with your database username or password in the .env file.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
        console.error(`Hint: The database "${dbConfig.database}" does not seem to exist. Please create it first.`);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed.');
    }
  }
}

setupDatabase();
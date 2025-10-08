// backend/db.js
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const SQLITE_DB_FILE = process.env.SQLITE_DB_FILE || './sss_game.db';

let db;

// This async function sets up the database connection.
async function setupDatabaseConnection() {
    if (DB_TYPE !== 'sqlite') {
        console.error('🔴 FATAL: This application is currently configured to run only with SQLite.');
        console.error('Please set DB_TYPE=sqlite in your backend/.env file.');
        process.exit(1);
    }

    try {
        // Open the SQLite database file
        db = await open({
            filename: SQLITE_DB_FILE,
            driver: sqlite3.Database
        });
        console.log(`✅ SQLite database connection successful. Using file: ${SQLITE_DB_FILE}`);

        // SQLite doesn't have a connection "pool" in the same way, so we just return a
        // simplified object that mimics the methods used by the application.
        // This makes the rest of the application code work with minimal changes.
        const db_wrapper = {
            query: (sql, params) => {
                // The sqlite library uses `all` for SELECT and `run` for INSERT/UPDATE/DELETE.
                // We'll try to guess based on the SQL statement.
                const command = sql.trim().toUpperCase().split(' ')[0];
                if (['SELECT', 'PRAGMA'].includes(command)) {
                    // The mysql2 driver returns [rows, fields], so we wrap the result in an array.
                    return db.all(sql, params).then(rows => [rows]);
                } else {
                    // For INSERT, UPDATE, DELETE, we return the result of db.run().
                    // The result object contains info like `lastID` (aliased to insertId).
                    return db.run(sql, params).then(result => ({ insertId: result.lastID }));
                }
            },
            // The application uses transactions. We will create a simplified transaction object.
            getConnection: async () => {
                console.log("DB DEBUG: getConnection called");
                return {
                    beginTransaction: async () => {
                        console.log("DB DEBUG: BEGIN TRANSACTION");
                        await db.exec('BEGIN TRANSACTION');
                    },
                    query: (sql, params) => {
                        // All queries within this "connection" will be part of the transaction.
                         const command = sql.trim().toUpperCase().split(' ')[0];
                         if (['SELECT'].includes(command)) {
                             return db.all(sql, params).then(rows => [rows]);
                         } else {
                            return db.run(sql, params).then(result => ({ insertId: result.lastID }));
                         }
                    },
                    commit: async () => {
                        console.log("DB DEBUG: COMMIT");
                        await db.exec('COMMIT');
                    },
                    rollback: async () => {
                        console.log("DB DEBUG: ROLLBACK");
                        await db.exec('ROLLBACK');
                    },
                    // release() is a no-op for SQLite as there's no pool to return to.
                    release: () => {
                        console.log("DB DEBUG: Releasing connection (no-op for SQLite)");
                    }
                };
            },
            // Expose the raw db object for the setup script.
            getRawDb: () => db
        };

        return db_wrapper;

    } catch (error) {
        console.error('🔴 FATAL: Could not connect to the SQLite database.');
        console.error(`An error occurred while trying to open the database file: ${SQLITE_DB_FILE}`);
        console.error('Full error:', error.message);
        process.exit(1);
    }
}

// We export the promise that resolves to the database wrapper.
// This ensures that any module importing this file will wait for the DB to be ready.
module.exports = setupDatabaseConnection();
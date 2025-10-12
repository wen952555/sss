// backend/db.js
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const USER_DB_FILE = process.env.USER_DB_FILE || './users.db';
const GAME_DB_FILE = process.env.SQLITE_DB_FILE || './sss_game.db';

let userDb;
let gameDb;

async function setupDatabaseConnection(dbFile) {
    if (DB_TYPE !== 'sqlite') {
        console.error('🔴 FATAL: This application is currently configured to run only with SQLite.');
        process.exit(1);
    }

    try {
        const db = await open({
            filename: dbFile,
            driver: sqlite3.Database
        });
        console.log(`✅ SQLite database connection successful. Using file: ${dbFile}`);

        const db_wrapper = {
            query: (sql, params) => {
                const command = sql.trim().toUpperCase().split(' ')[0];
                if (['SELECT', 'PRAGMA'].includes(command)) {
                    return db.all(sql, params).then(rows => [rows]);
                } else {
                    return db.run(sql, params).then(result => ({ insertId: result.lastID }));
                }
            },
            get: (sql, params) => db.get(sql, params),
            run: (sql, params) => db.run(sql, params),
            getConnection: async () => {
                return {
                    beginTransaction: async () => await db.exec('BEGIN TRANSACTION'),
                    query: (sql, params) => {
                         const command = sql.trim().toUpperCase().split(' ')[0];
                         if (['SELECT'].includes(command)) {
                             return db.all(sql, params).then(rows => [rows]);
                         } else {
                            return db.run(sql, params).then(result => ({ insertId: result.lastID }));
                         }
                    },
                    commit: async () => await db.exec('COMMIT'),
                    rollback: async () => await db.exec('ROLLBACK'),
                    release: () => {}
                };
            },
            getRawDb: () => db
        };

        return db_wrapper;

    } catch (error) {
        console.error(`🔴 FATAL: Could not connect to the SQLite database at ${dbFile}.`);
        console.error('Full error:', error.message);
        process.exit(1);
    }
}

async function initializeDatabases() {
    userDb = await setupDatabaseConnection(USER_DB_FILE);
    gameDb = await setupDatabaseConnection(GAME_DB_FILE);
    return { userDb, gameDb };
}

module.exports = initializeDatabases();
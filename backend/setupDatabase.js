const dbPromise = require('./db');

async function setupDatabase() {
    const { userDb } = await dbPromise;
    const db = userDb.getRawDb();

    try {
        console.log('Starting user database setup check...');

        // Create users table if it doesn't exist
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                display_id TEXT NOT NULL UNIQUE,
                points INTEGER NOT NULL DEFAULT 1000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Add reset_token and reset_expires columns if they don't exist
        const columns = await db.all("PRAGMA table_info(users)");
        const columnNames = columns.map(c => c.name);

        if (!columnNames.includes('reset_token')) {
            await db.exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
            console.log('Added reset_token column to users table.');
        }

        if (!columnNames.includes('reset_expires')) {
            await db.exec("ALTER TABLE users ADD COLUMN reset_expires INTEGER");
            console.log('Added reset_expires column to users table.');
        }

        console.log('✅ User database setup check complete.');
    } catch (error) {
        console.error('🔴 An error occurred during user database setup:', error.message);
        process.exit(1);
    }
}

module.exports = setupDatabase;

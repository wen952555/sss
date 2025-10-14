require('dotenv').config();
const dbPromise = require('./db');
const setupDatabase = require('./setupDatabase');

async function generateUniqueDisplayId(userDb) {
    let displayId;
    let isUnique = false;
    while (!isUnique) {
        displayId = Math.random().toString(36).substring(2, 10);
        const existingUser = await userDb.get('SELECT id FROM users WHERE display_id = ?', [displayId]);
        if (!existingUser) {
            isUnique = true;
        }
    }
    return displayId;
}

async function migrate() {
    try {
        const { userDb } = await dbPromise;
        await setupDatabase(userDb);
        const [usersToUpdate] = await userDb.query('SELECT id FROM users WHERE display_id IS NULL');

        for (const user of usersToUpdate) {
            const displayId = await generateUniqueDisplayId(userDb);
            await userDb.run('UPDATE users SET display_id = ? WHERE id = ?', [displayId, user.id]);
            console.log(`Updated user ${user.id} with display_id ${displayId}`);
        }

        console.log('Migration complete.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
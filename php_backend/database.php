<?php
// php_backend/database.php

function getDbConnection() {
    $db_file = __DIR__ . '/users.db';
    try {
        $pdo = new PDO('sqlite:' . $db_file);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
        exit();
    }
}

function setupDatabase() {
    $pdo = getDbConnection();
    try {
        // Initial table creation
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                display_id TEXT NOT NULL UNIQUE,
                points INTEGER NOT NULL DEFAULT 1000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");

        // --- Add new columns for password reset ---
        // Check if reset_token column exists
        $stmt = $pdo->query("PRAGMA table_info(users)");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 1);

        if (!in_array('reset_token', $columns)) {
            $pdo->exec("ALTER TABLE users ADD COLUMN reset_token TEXT");
            echo "Added 'reset_token' column to users table.\n";
        }
        if (!in_array('reset_expires', $columns)) {
            $pdo->exec("ALTER TABLE users ADD COLUMN reset_expires INTEGER");
            echo "Added 'reset_expires' column to users table.\n";
        }

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database setup failed: ' . $e->getMessage()]);
        exit();
    }
}

if (php_sapi_name() === 'cli' && realpath($argv[0]) === realpath(__FILE__)) {
    setupDatabase();
    echo "Database setup check complete.\n";
}
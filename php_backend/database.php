<?php
// php_backend/database.php

// This function establishes a connection to the SQLite database
// and returns the PDO object.
function getDbConnection() {
    $db_file = __DIR__ . '/users.db';
    try {
        // Use PDO for database interactions to prevent SQL injection
        $pdo = new PDO('sqlite:' . $db_file);
        // Set error mode to exceptions for better error handling
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        // In a real application, log this error instead of echoing
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
        exit();
    }
}

// This function creates the 'users' table if it doesn't already exist.
function setupDatabase() {
    $pdo = getDbConnection();
    try {
        // Use TEXT for phone numbers to preserve leading zeros if they ever exist
        // Use TEXT for display_id as it's a string
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
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database setup failed: ' . $e->getMessage()]);
        exit();
    }
}

// --- Main Execution ---
// When this file is included, we ensure the database is set up.
// We can also add a command-line interface to set it up manually.
if (php_sapi_name() === 'cli' && realpath($argv[0]) === realpath(__FILE__)) {
    setupDatabase();
    echo "Database setup complete.\n";
}
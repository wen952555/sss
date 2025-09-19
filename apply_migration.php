<?php
// This script applies the database migrations from migration.sql.
// It can be run from the command line: php apply_migration.php

// Set timezone to avoid warnings
date_default_timezone_set('UTC');

require_once __DIR__ . '/backend/api/db_connect.php';

echo "Starting database migration...\n";

// --- Read the migration.sql file ---
$sql_file = __DIR__ . '/migration.sql';
if (!file_exists($sql_file)) {
    die("Error: migration.sql not found in the project root directory.\n");
}
$sql_commands = file_get_contents($sql_file);

// --- Get the database connection ---
$conn = db_connect();

echo "Successfully connected to the database.\n";

// --- Split the SQL commands by semicolon ---
$statements = explode(';', $sql_commands);

$error_count = 0;

// --- Execute each statement ---
foreach ($statements as $statement) {
    $statement = trim($statement);
    if (!empty($statement)) {
        // Add back the semicolon for the query
        $query = $statement . ';';
        if ($conn->query($query)) {
            echo "SUCCESS: " . substr($statement, 0, 70) . "...\n";
        } else {
            // Check for "Duplicate column name" error (errno 1060), which is acceptable
            if ($conn->errno == 1060) {
                echo "INFO: Column already exists, skipping. (Details: " . $conn->error . ")\n";
            }
            // Check for "Table already exists" error (errno 1050), also acceptable
            elseif ($conn->errno == 1050) {
                echo "INFO: Table already exists, skipping. (Details: " . $conn->error . ")\n";
            }
            else {
                echo "ERROR: " . $conn->error . "\n";
                echo "Failed statement: " . $statement . "\n";
                $error_count++;
            }
        }
    }
}

$conn->close();

echo "----------------------------------------\n";
if ($error_count == 0) {
    echo "Migration process finished successfully!\n";
} else {
    echo "Migration process finished with " . $error_count . " error(s).\n";
}
?>

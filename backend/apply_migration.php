<?php
require_once __DIR__ . '/api/db_connect.php';

$conn = db_connect();
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$sql = file_get_contents(__DIR__ . '/migration.sql');

if ($conn->multi_query($sql)) {
    echo "Migration applied successfully.\n";
} else {
    echo "Error applying migration: " . $conn->error . "\n";
}

$conn->close();
?>
<?php
require __DIR__ . '/db.php';

$pdo->exec("ALTER TABLE users DROP COLUMN points");

echo "Successfully removed 'points' column from 'users' table.";

<?php
// backend/api/config.php

// --- Database Configuration ---
$DB_HOST = 'localhost';
$DB_USER = 'YOUR_DB_USER';  // Please enter your actual database username
$DB_PASS = 'YOUR_DB_PASS';  // Please enter your actual database password
$DB_NAME = 'YOUR_DB_NAME';  // Please enter your actual database name

// --- Shared Secret for Cloudflare Worker ---
// IMPORTANT: This MUST match the 'WORKER_SECRET' environment variable set in your Cloudflare Worker settings.
$WORKER_SECRET = 'your-super-secret-random-string-goes-here';

// --- OpenAI API Key for Chat Feature ---
// IMPORTANT: To enable the live AI correction chat, replace this with your actual OpenAI API key.
$OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_GOES_HERE';

// --- Database Connection ---
$pdo = null;
try {
    $dsn = "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (\PDOException $e) {
    // The calling script is responsible for catching this exception
    // and handling the error appropriately.
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}
?>
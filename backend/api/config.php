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

// --- Google Gemini API Key for Chat Feature ---
// The key is read from a separate, non-executable file for better security.
$key_file = __DIR__ . '/gemini_api_key.txt';
$GEMINI_API_KEY = file_exists($key_file) ? trim(file_get_contents($key_file)) : '';

// --- Telegram Bot Configuration ---
// IMPORTANT: To enable the Telegram admin webhook, set your bot token and your numeric Telegram user ID.
$TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
$TELEGRAM_ADMIN_ID = 'YOUR_TELEGRAM_ADMIN_ID'; // This must be a numeric ID

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
    // Gracefully handle connection failure without halting the script.
    // The $pdo object will remain null, and other scripts should handle this.
    // For debugging, you can log this error to a private file.
    error_log("Database connection failed: " . $e->getMessage());
}
?>
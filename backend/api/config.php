<?php
// backend/config.php

// --- 数据库配置 ---
$DB_HOST = 'localhost';
$DB_USER = 'YOUR_DB_USER';  // 请填写实际数据库用户名
$DB_PASS = 'YOUR_DB_PASS';  // 请填写实际数据库密码
$DB_NAME = 'YOUR_DB_NAME';  // 请填写实际数据库名

// --- Telegram Bot 配置 ---
$TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN'; // 请替换为你的 Telegram Bot Token
$ADMIN_USER_IDS = [123456789]; // 可选: 管理员TG chat_id数组, 用于tg_webhook.php

// --- Database Connection ---
// This follows the recommended setup from tg_webhook.php's documentation.
// It establishes a PDO connection or throws an exception on failure.
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
    // and handling the error appropriately (e.g., JSON response, log, etc.).
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}

// --- END OF FILE backend/config.php ---
?>

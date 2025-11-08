<?php
// db.php

// 增加错误报告，便于调试
error_reporting(E_ALL);
ini_set('display_errors', 1);

function getDBConnection() {
    static $pdo = null;

    if ($pdo === null) {
        $envPath = __DIR__ . '/.env';
        
        if (!file_exists($envPath) || !is_readable($envPath)) {
            // 提供清晰的错误信息
            die("Error: .env file not found or is not readable at {$envPath}\n");
        }
        
        $config = parse_ini_file($envPath);
        
        if ($config === false) {
            die("Error: Failed to parse .env file. Please check its format.\n");
        }

        // 检查必要的配置是否存在
        $required_keys = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
        foreach ($required_keys as $key) {
            if (!isset($config[$key])) {
                die("Error: Missing required key '{$key}' in .env file.\n");
            }
        }

        $dsn = "mysql:host={$config['DB_HOST']};dbname={$config['DB_NAME']};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, $config['DB_USER'], $config['DB_PASS'], $options);
        } catch (PDOException $e) {
            // 在命令行中显示更详细的错误
            die("Database Connection Failed: " . $e->getMessage() . "\n");
        }
    }

    return $pdo;
}

function getTelegramConfig() {
    static $config = null;
    if ($config === null) {
        $envPath = __DIR__ . '/.env';
        if (!file_exists($envPath) || !is_readable($envPath)) {
            die("Error: .env file for Telegram not found or is not readable at {$envPath}\n");
        }
        $config = parse_ini_file($envPath);
        if ($config === false) {
             die("Error: Failed to parse .env file for Telegram. Please check its format.\n");
        }
    }
    
    // 检查必要的 Telegram 配置
    $required_keys = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ADMIN_CHAT_ID'];
    foreach ($required_keys as $key) {
        if (!isset($config[$key])) {
            die("Error: Missing required key '{$key}' in .env file.\n");
        }
    }
    
    return [
        'token' => $config['TELEGRAM_BOT_TOKEN'],
        'admin_chat_id' => $config['TELEGRAM_ADMIN_CHAT_ID']
    ];
}

?>
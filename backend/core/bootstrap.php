<?php
// --- 错误报告 ---
error_reporting(E_ALL);
ini_set('display_errors', 1);

// --- 加载 .env 文件 ---
// 注意：这是一个简单的原生PHP实现，不处理复杂情况（如注释、引号等）
$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

// --- 数据库连接 ---
require_once __DIR__ . '/../config/database.php';
$GLOBALS['pdo'] = connect_db();

// --- 全局函数 ---
require_once __DIR__ . '/functions.php';

// --- 设置响应头 ---
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); // 在Cloudflare Worker代理模式下，这个可以设为*
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}
?>
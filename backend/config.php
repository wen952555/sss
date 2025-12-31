<?php
// 允许从任何源访问（在生产环境中应限制为前端域名）
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 加载环境变量
$env = parse_ini_file(__DIR__ . '/../.env');

define('DB_HOST', $env['DB_HOST']);
define('DB_NAME', $env['DB_NAME']);
define('DB_USER', $env['DB_USER']);
define('DB_PASS', $env['DB_PASS']);

define('TELEGRAM_BOT_TOKEN', $env['TELEGRAM_BOT_TOKEN']);
define('TELEGRAM_BOT_ID', $env['TELEGRAM_BOT_ID']);
define('ADMIN_TELEGRAM_IDS', explode(',', $env['ADMIN_TELEGRAM_IDS']));

define('FRONTEND_URL', $env['FRONTEND_URL']);
define('BACKEND_URL', $env['BACKEND_URL']);

define('JWT_SECRET', $env['JWT_SECRET']);
define('JWT_EXPIRE_DAYS', $env['JWT_EXPIRE_DAYS']);

// 设置时区
date_default_timezone_set('Asia/Shanghai');

// 错误报告设置
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
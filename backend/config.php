<?php
// backend/config.php

// 1. 加载环境变量 - 采用更灵活的路径查找策略
$env = null;
$env_loaded = false;
// 定义可能的 .env 文件路径
$possible_env_paths = [
    __DIR__ . '/.env',        // 生产环境 (backend/.env)
    dirname(__DIR__) . '/.env' // 开发环境 (项目根目录/.env)
];

foreach ($possible_env_paths as $path) {
    if (file_exists($path)) {
        $env = parse_ini_file($path);
        if ($env) {
            $env_loaded = true;
            break;
        }
    }
}

// 如果任何地方都找不到 .env 文件，则终止执行
if (!$env_loaded) {
    // 在非 CLI 环境下发送 HTTP 错误
    if (php_sapi_name() !== 'cli') {
        http_response_code(500);
    }
    die('FATAL ERROR: Environment configuration file (.env) not found or is invalid.');
}

// 2. 设置 CORS 跨域头 (仅在 Web 请求中)
// 检查是否在 CLI 环境下运行，CLI 环境下不发送 header
if (php_sapi_name() !== 'cli') {
    // 从环境变量中获取前端地址，如果未设置则不允许任何源
    $allowed_origin = $env['FRONTEND_URL'] ?? 'https://xxx.9525.ip-ddns.com';
    
    header("Access-Control-Allow-Origin: " . $allowed_origin);
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Allow-Credentials: true");

    // 统一处理预检 OPTIONS 请求
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// 3. 定义全局常量
define('DB_HOST', $env['DB_HOST'] ?? 'localhost');
define('DB_NAME', $env['DB_NAME'] ?? 'thirteen_water');
define('DB_USER', $env['DB_USER'] ?? '');
define('DB_PASS', $env['DB_PASS'] ?? '');

define('TELEGRAM_BOT_TOKEN', $env['TELEGRAM_BOT_TOKEN'] ?? '');
define('TELEGRAM_BOT_ID', $env['TELEGRAM_BOT_ID'] ?? '');
define('ADMIN_TELEGRAM_IDS', isset($env['ADMIN_TELEGRAM_IDS']) ? explode(',', $env['ADMIN_TELEGRAM_IDS']) : []);

define('FRONTEND_URL', $env['FRONTEND_URL'] ?? 'https://xxx.9525.ip-ddns.com');
define('BACKEND_URL', $env['BACKEND_URL'] ?? 'https://wen76674.serv00.net');

define('JWT_SECRET', $env['JWT_SECRET'] ?? 'your_default_jwt_secret_change_in_production');
define('JWT_EXPIRE_DAYS', (int)($env['JWT_EXPIRE_DAYS'] ?? 7));

// 4. 设置环境默认值
date_default_timezone_set('Asia/Shanghai');

// 根据环境设置错误报告（建议在 .env 中增加一个 APP_ENV=production/development 变量）
$app_env = $env['APP_ENV'] ?? 'production';
if ($app_env === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}
?>
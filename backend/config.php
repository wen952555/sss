<?php
// 允许从任何源访问（在生产环境中应限制为前端域名）
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 加载环境变量 - 修正路径查找逻辑
$envLoaded = false;
$possibleEnvPaths = [
    __DIR__ . '/.env',               // 当前目录
    __DIR__ . '/../.env',           // 上级目录
    '/usr/home/wen76674/.env',      // serv00用户目录
];

foreach ($possibleEnvPaths as $envPath) {
    if (file_exists($envPath)) {
        $env = parse_ini_file($envPath);
        if ($env !== false) {
            $envLoaded = true;
            break;
        }
    }
}

if (!$envLoaded) {
    // 如果没有.env文件，尝试使用默认值（仅用于测试）
    $env = [
        'DB_HOST' => 'localhost',
        'DB_NAME' => 'wen76674_thirteenwater',
        'DB_USER' => 'wen76674',
        'DB_PASS' => '',
        'TELEGRAM_BOT_TOKEN' => '',
        'TELEGRAM_BOT_ID' => '',
        'ADMIN_TELEGRAM_IDS' => '',
        'FRONTEND_URL' => 'https://xxx.9525.ip-ddns.com',
        'BACKEND_URL' => 'https://wen76674.serv00.net',
        'JWT_SECRET' => 'your_default_jwt_secret_change_this',
        'JWT_EXPIRE_DAYS' => '7'
    ];
}

// 定义常量
define('DB_HOST', $env['DB_HOST'] ?? 'localhost');
define('DB_NAME', $env['DB_NAME'] ?? 'wen76674_thirteenwater');
define('DB_USER', $env['DB_USER'] ?? 'wen76674');
define('DB_PASS', $env['DB_PASS'] ?? '');

define('TELEGRAM_BOT_TOKEN', $env['TELEGRAM_BOT_TOKEN'] ?? '');
define('TELEGRAM_BOT_ID', $env['TELEGRAM_BOT_ID'] ?? '');
define('ADMIN_TELEGRAM_IDS', isset($env['ADMIN_TELEGRAM_IDS']) ? explode(',', $env['ADMIN_TELEGRAM_IDS']) : []);

define('FRONTEND_URL', $env['FRONTEND_URL'] ?? 'https://xxx.9525.ip-ddns.com');
define('BACKEND_URL', $env['BACKEND_URL'] ?? 'https://wen76674.serv00.net');

define('JWT_SECRET', $env['JWT_SECRET'] ?? 'your_default_jwt_secret_change_this');
define('JWT_EXPIRE_DAYS', $env['JWT_EXPIRE_DAYS'] ?? '7');

// 设置时区
date_default_timezone_set('Asia/Shanghai');

// 错误报告设置
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 处理预检请求（仅在Web请求中）
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
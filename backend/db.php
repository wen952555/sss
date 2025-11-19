<?php
// backend/db.php

// 1. 允许跨域 (API 通用头)
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// --- [修复点] 增加 isset 判断，防止命令行运行报错 ---
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 2. 加载 .env 环境配置
function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        
        // 使用 limit=2 确保值里面有等号也不会被切断
        list($name, $value) = explode('=', $line, 2);
        
        $name = trim($name);
        $value = trim($value);
        
        // [新增] 自动去除值两端的引号 (" 或 ')
        $value = trim($value, "\"'");
        
        putenv($name . '=' . $value);
    }
}

loadEnv(__DIR__ . '/.env');

try {
    $host = getenv('DB_HOST');
    $db   = getenv('DB_DATABASE');
    $user = getenv('DB_USERNAME');
    $pass = getenv('DB_PASSWORD');
    
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // 如果是在命令行运行，直接打印错误
    if (php_sapi_name() === 'cli') {
        die("数据库连接失败: " . $e->getMessage() . "\n");
    }
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

// 验证 Token 的辅助函数 (保持不变)
function authenticate($pdo) {
    // 命令行模式下跳过验证（或者报错）
    if (php_sapi_name() === 'cli') return null;

    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $stmt = $pdo->prepare("SELECT * FROM users WHERE api_token = ?");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) return $user;
    }
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}
?>
<?php
date_default_timezone_set('Asia/Shanghai');
// 必须在最顶部开启 Session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 加载 .env
function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (empty($line) || strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}
loadEnv(__DIR__ . '/.env');

// 数据库连接 (单例模式)
try {
    $pdo = new PDO(
        "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
        $_ENV['DB_USER'],
        $_ENV['DB_PASS'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode(['code' => 500, 'msg' => '数据库连接失败']);
    exit;
}

function jsonResp($code, $msg, $data = []) {
    header('Content-Type: application/json');
    echo json_encode(['code' => $code, 'msg' => $msg, 'data' => $data]);
    exit;
}
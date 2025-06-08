<?php
// 设置CORS头
header("Access-Control-Allow-Origin: https://xxx.9525.ip-ddns.com");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header('Content-Type: application/json');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';

// 获取请求路径
$requestUri = $_SERVER['REQUEST_URI'];
$apiPath = str_replace('/api/', '', parse_url($requestUri, PHP_URL_PATH));

// 路由处理
try {
    if (strpos($apiPath, 'game') === 0) {
        require __DIR__ . '/api/game.php';
    } elseif (strpos($apiPath, 'user') === 0) {
        require __DIR__ . '/api/user.php';
    } elseif (strpos($apiPath, 'points') === 0) {
        require __DIR__ . '/api/points.php';
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>

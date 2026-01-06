<?php
// 允许跨域头，配合 Worker 转发
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once 'db.php';

// 获取模块和动作
$module = $_GET['module'] ?? '';
$action = $_GET['action'] ?? '';

// 如果没有传 module 参数，尝试解析路径（可选）
if (!$module && isset($_SERVER['PATH_INFO'])) {
    $parts = explode('/', trim($_SERVER['PATH_INFO'], '/'));
    // 这种模式支持 /api.php/auth/login 这种风格
}

if ($module == 'auth') {
    include 'auth.php';
} elseif ($module == 'game') {
    include 'game.php';
} elseif ($module == 'transfer') {
    include 'transfer.php';
} else {
    echo json_encode(['msg' => 'Ready', 'time' => date('Y-m-d H:i:s')]);
}
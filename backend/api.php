<?php
// 允许跨域请求头
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once 'db.php';

$module = $_GET['module'] ?? 'game';
$action = $_GET['action'] ?? '';

// 简单的路由分发
if ($module == 'auth') include 'auth.php';
elseif ($module == 'game') include 'game.php';
elseif ($module == 'transfer') include 'transfer.php';
else {
    echo json_encode(['msg' => 'Invalid Module']);
}

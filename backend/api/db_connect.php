<?php
// --- START OF FILE api/db_connect.php (PRODUCTION VERSION) ---

// 在生产环境中，通常建议关闭错误细节的直接输出
// ini_set('display_errors', 0);
// error_reporting(0);

// Include the configuration file
require_once __DIR__ . '/../config.php';

// 创建连接
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// 检查连接
if ($conn->connect_error) {
    http_response_code(503); // Service Unavailable
    // 在生产环境中，返回一个通用的错误信息
    die(json_encode(['success' => false, 'message' => '服务器暂时无法连接到数据库，请稍后重试。']));
}

$conn->set_charset("utf8mb4");

// --- END OF FILE api/db_connect.php (PRODUCTION VERSION) ---
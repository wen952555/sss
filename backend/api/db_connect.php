<?php
// --- START OF FILE api/db_connect.php ---

$DB_HOST = 'localhost';     // 您的数据库主机
$DB_USER = 'YOUR_DB_USER';  // 您的数据库用户名
$DB_PASS = 'YOUR_DB_PASS';  // 您的数据库密码
$DB_NAME = 'YOUR_DB_NAME';  // 您的数据库名

// 创建连接
$conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);

// 检查连接
if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => '数据库连接失败: ' . $conn->connect_error]));
}

// 设置字符集
$conn->set_charset("utf8mb4");

// --- END OF FILE api/db_connect.php ---
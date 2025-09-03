<?php
// --- FIXED VERSION: api/db_connect.php ---
// 提供 db_connect() 函数，兼容所有调用方式

require_once __DIR__ . '/config.php';

/**
 * 创建并返回一个 MySQLi 连接对象
 * @return mysqli
 * @throws Exception
 */
function db_connect() {
    global $DB_HOST, $DB_USER, $DB_PASS, $DB_NAME;
    $conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
    if ($conn->connect_error) {
        error_log('DB CONNECT ERROR: ' . $conn->connect_error);
        http_response_code(503);
        die(json_encode(['success' => false, 'message' => '服务器暂时无法连接到数据库，请稍后重试。']));
    }
    $conn->set_charset("utf8mb4");
    return $conn;
}

// 兼容老代码：如果没有 $conn 变量，则自动创建全局 $conn
if (!isset($conn)) {
    $conn = db_connect();
}
?>

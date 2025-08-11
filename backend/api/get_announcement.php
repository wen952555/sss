<?php
// --- START OF FILE api/get_announcement.php (ULTIMATE DEBUG MODE) ---

// 1. 强制开启错误显示，这是我们获取信息的关键！
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 2. 检查 db_connect.php 是否存在且可读
$db_connect_path = __DIR__ . '/db_connect.php';
if (!file_exists($db_connect_path)) {
    http_response_code(500);
    die("FATAL ERROR: db_connect.php file not found at: " . $db_connect_path);
}
if (!is_readable($db_connect_path)) {
    http_response_code(500);
    die("FATAL ERROR: db_connect.php file exists but is not readable. Check file permissions.");
}

// 3. 尝试包含文件，并用 try-catch 捕获可能的错误
try {
    require_once $db_connect_path;
} catch (Throwable $e) {
    http_response_code(500);
    die("FATAL ERROR during require_once: " . $e->getMessage());
}

// 4. 检查 $conn 变量是否存在且是 mysqli 对象
if (!isset($conn) || !($conn instanceof mysqli)) {
    http_response_code(500);
    die("FATAL ERROR: db_connect.php was included, but failed to create a valid \$conn database connection object.");
}

// 5. 如果以上都通过了，才执行真正的逻辑
header("Content-Type: application/json");

$result = $conn->query("SELECT content FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1");

// 检查查询是否失败
if ($result === false) {
    // 查询失败，返回数据库的错误信息
    echo json_encode(['success' => false, 'message' => 'SQL Query Failed: ' . $conn->error]);
} else {
    if ($result->num_rows > 0) {
        $announcement = $result->fetch_assoc();
        echo json_encode(['success' => true, 'text' => $announcement['content']]);
    } else {
        echo json_encode(['success' => false, 'text' => '']);
    }
}

$conn->close();

// --- END OF FILE api/get_announcement.php (ULTIMATE DEBUG MODE) ---
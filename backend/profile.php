<?php
// 引入 CORS 头部支持、数据库连接和错误处理
require_once 'V2_cors_and_db.php';

// --- 核心逻辑开始 ---

// 验证会话
if (!isset($_SESSION['user_id'])) {
    send_json_response(['success' => false, 'message' => '未授权的访问'], 401);
    exit;
}

// 只处理 GET 请求
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_json_response(['success' => false, 'message' => '无效的请求方法'], 405);
    exit;
}

// ⭐ 新增：使用 try...catch 块包裹数据库操作，捕获潜在的致命错误
try {
    $user_id = $_SESSION['user_id'];

    // 1. 查询用户信息 (包括新加的积分字段)
    $stmt_user = $pdo->prepare("SELECT username, short_id, points FROM users WHERE id = ?");
    $stmt_user->execute([$user_id]);
    $user = $stmt_user->fetch(PDO::FETCH_ASSOC);

    // 如果找不到用户，提前返回
    if (!$user) {
        send_json_response(['success' => false, 'message' => '未找到用户信息'], 404);
        exit;
    }

    // 2. 查询用户的预约历史
    $stmt_reservations = $pdo->prepare("
        SELECT r.id, rs.type, rs.start_time, rs.end_time, r.reservation_date
        FROM reservations r
        JOIN reservation_slots rs ON r.slot_id = rs.id
        WHERE r.user_id = ? AND r.status = 'active'
        ORDER BY r.reservation_date DESC
    ");
    $stmt_reservations->execute([$user_id]);
    $reservations = $stmt_reservations->fetchAll(PDO::FETCH_ASSOC);

    // 3. 成功时，组合并发送响应
    send_json_response([
        'success' => true,
        'user' => $user, // 包含 username, short_id, points
        'reservations' => $reservations
    ]);

} catch (PDOException $e) {
    // ⭐ 关键：如果上述 try 块中的任何数据库操作失败，捕获异常
    // 返回一个详细的错误 JSON，而不是让脚本崩溃
    send_json_response([
        'success' => false,
        'message' => '服务器内部数据库错误',
        'error_details' => $e->getMessage() // 在响应中包含具体的 PDO 错误信息
    ], 500); // 使用 500 Internal Server Error 状态码
}

?>

<?php
// 引入 CORS 头部支持、数据库连接和错误处理
require_once 'V2_cors_and_db.php';

// 验证会话
if (!isset($_SESSION['user_id'])) {
    send_json_response(['success' => false, 'message' => '未授权的访问'], 401);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user_id = $_SESSION['user_id'];

    // 查询用户信息，包括新加的积分字段
    $stmt = $pdo->prepare("SELECT username, short_id, points FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // 查询用户的预约历史
        $stmt_reservations = $pdo->prepare("
            SELECT r.id, rs.type, rs.start_time, rs.end_time, r.reservation_date
            FROM reservations r
            JOIN reservation_slots rs ON r.slot_id = rs.id
            WHERE r.user_id = ? AND r.status = 'active'
            ORDER BY r.reservation_date DESC
        ");
        $stmt_reservations->execute([$user_id]);
        $reservations = $stmt_reservations->fetchAll(PDO::FETCH_ASSOC);

        $response = [
            'success' => true,
            'user' => $user, // 包含 username, short_id, points
            'reservations' => $reservations
        ];
        send_json_response($response);
    } else {
        send_json_response(['success' => false, 'message' => '未找到用户信息'], 404);
    }
}
?>
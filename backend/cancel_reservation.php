<?php
session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/utils.php';

header('Content-Type: application/json');

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    sendJSON(['status' => 'error', 'message' => '用户未登录或认证失败'], 401);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$session_type = $data['session_type'] ?? '';

if (!in_array($session_type, ['today', 'tomorrow'])) {
    sendJSON(['status' => 'error', 'message' => '无效的场次标识'], 400);
    exit;
}

$reservation_date = ($session_type === 'tomorrow') ? date('Y-m-d', strtotime('+1 day')) : date('Y-m-d');

try {
    $stmt = $pdo->prepare("DELETE FROM reservations WHERE user_id = ? AND reservation_date = ? AND session_type = ?");
    $stmt->execute([$user_id, $reservation_date, $session_type]);

    if ($stmt->rowCount() > 0) {
        sendJSON(['status' => 'success', 'message' => '您已成功取消 [' . $session_type . '] 场次的预约。']);
    } else {
        sendJSON(['status' => 'error', 'message' => '未找到您在该场次的预约记录，或已经取消。'], 404);
    }
} catch (Exception $e) {
    error_log("Cancel Reservation Error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => '服务器内部错误，取消预约失败'], 500);
}
?>
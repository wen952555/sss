<?php
session_start();
require __DIR__ . '/db.php';
require __DIR__ . '/utils.php';
require __DIR__ . '/lib/SmartSorter.php';

header('Content-Type: application/json');

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    sendJSON(['status' => 'error', 'message' => '用户未登录或认证失败'], 401);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$session_type = $data['session_type'] ?? 'today'; // Default to 'today'
$hand = $data['hand'] ?? null;

if (!in_array($session_type, ['today', 'tomorrow'])) {
    sendJSON(['status' => 'error', 'message' => '无效的预约场次'], 400);
    exit;
}

if (empty($hand) || !is_array($hand)) {
    sendJSON(['status' => 'error', 'message' => '提交的牌型数据无效'], 400);
    exit;
}

// --- Backend Validation using SmartSorter ---
try {
    $sorter = new SmartSorter($hand);
    $result = $sorter->getHandResult();
    if (strpos($result['description'], '错误') !== false) {
        sendJSON(['status' => 'error', 'message' => '您提交的牌型不符合规则: ' . $result['description']], 400);
        exit;
    }
    $hand_description = $result['description'];
    $hand_rank = $result['rank'];
} catch (Exception $e) {
    sendJSON(['status' => 'error', 'message' => '验证牌型时出错: ' . $e->getMessage()], 500);
    exit;
}
// --- End Validation ---

$reservation_date = ($session_type === 'tomorrow') ? date('Y-m-d', strtotime('+1 day')) : date('Y-m-d');

$pdo->beginTransaction();

try {
    // Check for existing reservation for the selected session
    $stmt = $pdo->prepare("SELECT id FROM reservations WHERE user_id = ? AND reservation_date = ? AND session_type = ?");
    $stmt->execute([$user_id, $reservation_date, $session_type]);
    if ($stmt->fetch()) {
        $pdo->rollBack();
        sendJSON(['status' => 'error', 'message' => '您已经预约过这个场次了'], 409);
        exit;
    }

    // Create the reservation with hand details
    $stmt = $pdo->prepare(
        "INSERT INTO reservations (user_id, reservation_date, session_type, hand_description, hand_rank) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([$user_id, $reservation_date, $session_type, $hand_description, $hand_rank]);
    $reservation_id = $pdo->lastInsertId();

    // Commit transaction
    $pdo->commit();

    sendJSON([
        'status' => 'success',
        'message' => '预约成功！您以 [' . $hand_description . '] 预约了 [' . $session_type . '] 场次。',
        'reservation_id' => $reservation_id
    ], 201);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Reservation Error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => '服务器内部错误，预约失败'], 500);
}
?>
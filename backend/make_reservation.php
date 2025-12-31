<?php
session_start();
// 强制设置时区为亚洲/上海，确保预约日期一致
date_default_timezone_set('Asia/Shanghai');

// 修正路径：由于此文件就在 backend 目录下，直接引用同级目录的 db.php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/lib/SmartSorter.php';

header('Content-Type: application/json');

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    sendJSON(['status' => 'error', 'message' => '用户未登录或认证失败'], 401);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$session_type = $data['session_type'] ?? 'today';
$hand = $data['hand'] ?? null;

if (!in_array($session_type, ['today', 'tomorrow'])) {
    sendJSON(['status' => 'error', 'message' => '无效的预约场次'], 400);
    exit;
}

if (empty($hand) || !is_array($hand)) {
    sendJSON(['status' => 'error', 'message' => '提交的牌型数据无效'], 400);
    exit;
}

// 验证牌型
try {
    $sorter = new SmartSorter($hand);
    $result = $sorter->getHandResult();
    if (strpos($result['description'], '错误') !== false) {
        sendJSON(['status' => 'error', 'message' => '牌型不合规: ' . $result['description']], 400);
        exit;
    }
    $hand_description = $result['description'];
    $hand_rank = $result['rank'];
} catch (Exception $e) {
    sendJSON(['status' => 'error', 'message' => '牌型验证失败'], 500);
    exit;
}

// 计算预约日期
$reservation_date = ($session_type === 'tomorrow') ? date('Y-m-d', strtotime('+1 day')) : date('Y-m-d');

$pdo->beginTransaction();

try {
    // 检查是否重复预约
    $stmt = $pdo->prepare("SELECT id FROM reservations WHERE user_id = ? AND reservation_date = ? AND session_type = ?");
    $stmt->execute([$user_id, $reservation_date, $session_type]);
    if ($stmt->fetch()) {
        $pdo->rollBack();
        sendJSON(['status' => 'error', 'message' => '您已经预约过这个场次了'], 409);
        exit;
    }

    // 写入数据库 - 确保字段名为 hand_description
    $stmt = $pdo->prepare(
        "INSERT INTO reservations (user_id, reservation_date, session_type, hand_description, hand_rank) VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([$user_id, $reservation_date, $session_type, $hand_description, $hand_rank]);
    $reservation_id = $pdo->lastInsertId();

    $pdo->commit();

    sendJSON([
        'status' => 'success',
        'message' => '预约成功！已记录您的 [' . $hand_description . ']',
        'reservation_id' => $reservation_id
    ], 201);

} catch (Exception $e) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    error_log("Reservation Error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => '服务器错误，预约未成功'], 500);
}
?>
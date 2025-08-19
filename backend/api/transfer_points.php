<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['fromId'], $input['toId'], $input['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的请求，需要提供 fromId, toId 和 amount。']);
    exit;
}

$fromId = intval($input['fromId']);
$toId = intval($input['toId']);
$amount = intval($input['amount']);

if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '赠送的积分必须是正数。']);
    exit;
}

if ($fromId === $toId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '不能给自己赠送积分。']);
    exit;
}

$conn->begin_transaction();
try {
    // 检查赠送方积分
    $stmt = $conn->prepare("SELECT points FROM users WHERE id = ?");
    $stmt->bind_param("i", $fromId);
    $stmt->execute();
    $resultFrom = $stmt->get_result();
    if ($resultFrom->num_rows !== 1) throw new Exception('赠送方不存在');
    $fromPoints = $resultFrom->fetch_assoc()['points'];
    $stmt->close();

    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->bind_param("i", $toId);
    $stmt->execute();
    $resultTo = $stmt->get_result();
    if ($resultTo->num_rows !== 1) throw new Exception('接收方不存在');
    $stmt->close();

    if ($fromPoints < $amount) throw new Exception('您的积分不足。');

    // 扣除积分
    $stmt = $conn->prepare("UPDATE users SET points = points - ? WHERE id = ?");
    $stmt->bind_param("ii", $amount, $fromId);
    $stmt->execute();
    $stmt->close();

    // 增加积分
    $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
    $stmt->bind_param("ii", $amount, $toId);
    $stmt->execute();
    $stmt->close();

    // 查询赠送方最新信息
    $stmt = $conn->prepare("SELECT id, phone, points FROM users WHERE id = ?");
    $stmt->bind_param("i", $fromId);
    $stmt->execute();
    $updatedUser = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $conn->commit();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => '积分赠送成功！',
        'updatedUser' => $updatedUser
    ]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
?>
<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$input = json_decode(file_get_contents('php://input'), true);
$roomId = (int)($input['roomId'] ?? 0);
$scores = $input['scores'] ?? [];

if (!$roomId || empty($scores)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing parameters for saving scores.']);
    exit;
}

$conn->begin_transaction();
try {
    foreach ($scores as $userId => $score) {
        $userId = (int)$userId;
        $score = (int)$score;
        $stmt = $conn->prepare("UPDATE room_players SET score = ? WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("iii", $score, $roomId, $userId);
        $stmt->execute();
        $stmt->close();
        if ($userId > 0) {
            $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
            $stmt->bind_param("ii", $score, $userId);
            $stmt->execute();
            $stmt->close();
        }
    }
    $conn->commit();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to save scores: ' . $e->getMessage()]);
}
$conn->close();
?>

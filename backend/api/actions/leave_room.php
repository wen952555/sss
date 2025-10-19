<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

try {
    $conn = db_connect();
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = (int)($input['userId'] ?? 0);
    $roomId = (int)($input['roomId'] ?? 0);
    if ($userId && $roomId) {
        $stmt = $conn->prepare("DELETE FROM room_players WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();
    }
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>

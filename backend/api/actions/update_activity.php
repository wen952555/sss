<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

try {
    $conn = db_connect();
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = (int)($input['userId'] ?? 0);
    if ($userId > 0) {
        $stmt = $conn->prepare("UPDATE users SET last_active = NOW() WHERE id = ?");
        $stmt->bind_param("i", $userId);
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

<?php
require_once __DIR__ . '/../db_connect.php';

header('Content-Type: application/json');

$post_data = json_decode(file_get_contents("php://input"), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input.']);
    exit;
}

$userId = $post_data['userId'] ?? null;
$roomId = $post_data['roomId'] ?? null;
$index = $post_data['index'] ?? 0;

if (!$userId || !$roomId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters (userId, roomId).']);
    exit;
}

$conn = null;
try {
    $conn = db_connect();

    // Get the player's latest hand and arrangements from the player_hands table
    $stmt = $conn->prepare("SELECT arrangements FROM player_hands WHERE user_id = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$result || empty($result['arrangements'])) {
        throw new Exception("Could not find pre-computed arrangements for the player.");
    }

    $arrangements = json_decode($result['arrangements'], true);

    if (count($arrangements) === 0) {
        throw new Exception("No valid arrangements found.");
    }

    $arrangement = $arrangements[$index % count($arrangements)];

    echo json_encode(['success' => true, 'hand' => $arrangement]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>

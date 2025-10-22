<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/sort_hand.php';

header('Content-Type: application/json');

$post_data = json_decode(file_get_contents("php://input"), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input.']);
    exit;
}

$userId = $post_data['userId'] ?? null;
$roomId = $post_data['roomId'] ?? null;

if (!$userId || !$roomId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters (userId, roomId).']);
    exit;
}

$conn = null;
try {
    $conn = db_connect();

    // Get the player's initial hand from the room_players table
    $stmt = $conn->prepare("SELECT initial_hand FROM room_players WHERE user_id = ? AND room_id = ?");
    $stmt->bind_param("ii", $userId, $roomId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$result || empty($result['initial_hand'])) {
        throw new Exception("Could not find the player's hand for the current room.");
    }

    $hand = json_decode($result['initial_hand'], true);

    if (count($hand) !== 13) {
        throw new Exception("Invalid hand size. Expected 13 cards.");
    }

    // Use the new utility to find the best arrangement
    $best_arrangement = find_best_arrangement($hand);

    if (!$best_arrangement) {
        throw new Exception("Could not determine a valid hand arrangement.");
    }

    // The hand is already arranged into front, middle, back by the utility
    echo json_encode(['success' => true, 'hand' => $best_arrangement]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>

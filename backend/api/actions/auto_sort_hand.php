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
$index = $post_data['index'] ?? 0; // Default to the first arrangement

if (!$userId || !$roomId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters (userId, roomId).']);
    exit;
}

$conn = null;
try {
    $conn = db_connect();

    // First, get the hand_id for the current player in the current room.
    // This requires a join between room_players and pre_dealt_hands, based on the initial_hand.
    // NOTE: This assumes `initial_hand` in `room_players` correctly corresponds to a single `hand_id`.
    // A more robust solution might be to store hand_id directly in room_players. For now, we find it.

    // For simplicity and performance, we'll assume a direct link is not easily possible.
    // Instead, we'll find the hand_id associated with the player's initial hand.
    // This part is tricky. Let's find the room's pre-dealt hand id.
    // A better approach would be to store the `pre_dealt_hand_id` in the `game_rooms` table when the game starts.
    // Let's modify this to a more direct query assuming we can find the hand_id.

    // Simplified logic: Find the hand_id from the room_players table, assuming it's stored there.
    // This requires a schema change. Let's assume we add `hand_id` to `room_players`.
    // ALTER TABLE `room_players` ADD `hand_id` INT NULL;

    // Let's implement without a schema change for now by finding the game's hand_id
    // This is not straightforward. We will assume for now that the client sends the hand for sorting.
    // Re-evaluating the plan: The request implies we fetch pre-sorted hands. This needs a link.

    // New strategy: The `player_action` 'ready' should store which `pre_dealt_hands.id` is used for the room.
    // Let's add a column to `game_rooms`: `current_hand_id` INT NULL.
    // We will assume this column has been added.

    $stmt = $conn->prepare("SELECT current_hand_id FROM game_rooms WHERE id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $room_result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$room_result || !$room_result['current_hand_id']) {
        throw new Exception("Could not find the hand ID for the current room.");
    }
    $hand_id = $room_result['current_hand_id'];

    // Now, fetch the pre-sorted hand
    $stmt = $conn->prepare("SELECT sorted_hand FROM pre_sorted_hands WHERE hand_id = ? AND arrangement_index = ?");
    $stmt->bind_param("ii", $hand_id, $index);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$result) {
        throw new Exception("Could not find the pre-sorted hand for the given index.");
    }

    $sorted_hand = json_decode($result['sorted_hand'], true);

    echo json_encode(['success' => true, 'hand' => $sorted_hand]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>

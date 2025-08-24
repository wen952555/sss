<?php
// Simplified player_action.php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';
require_once 'utils.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['userId'] ?? 0);
$roomId = (int)($input['roomId'] ?? 0);
$action = $input['action'] ?? '';

if (!$userId || !$roomId || !$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing parameters.']);
    exit;
}

$conn->begin_transaction();
try {
    if ($action === 'ready') {
        // Set player to ready
        $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1 WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();

        // Get room info
        $stmt = $conn->prepare("SELECT game_type, players_count FROM game_rooms WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $room = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$room) throw new Exception("Room not found.");

        // Check current number of players in this room
        $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
        $stmt->close();

        // If this room is not full, fill it with AI
        if ($currentPlayers < $room['players_count']) {
            fillWithAI($conn, $roomId, $room['game_type'], $room['players_count']);
        }

        // Check if room is now full and all are ready
        $stmt = $conn->prepare("SELECT COUNT(*) as ready_players FROM room_players WHERE room_id = ? AND is_ready = 1");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $readyPlayers = $stmt->get_result()->fetch_assoc()['ready_players'];
        $stmt->close();

        if ($readyPlayers == $room['players_count']) {
            dealCards($conn, $roomId, $room['game_type'], $room['players_count']);
        }

    } elseif ($action === 'unready') {
        // Set player to not ready
        $stmt = $conn->prepare("UPDATE room_players SET is_ready = 0 WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();
    } elseif ($action === 'submit_hand') {
        $hand = $input['hand'] ?? null;
        if (!$hand) throw new Exception("Hand data is missing.");
        $handJson = json_encode($hand);

        $stmt = $conn->prepare("UPDATE room_players SET submitted_hand = ?, is_ready = 1 WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("sii", $handJson, $roomId, $userId);
        $stmt->execute();
        $stmt->close();

        // After submission, you might want to check if all players have submitted
        // and then transition the game state to 'finished'. This logic can be added here.
    }

    $conn->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
?>

<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$data = json_decode(file_get_contents('php://input'), true);

$userId = $data['userId'] ?? null;
$roomId = $data['roomId'] ?? null;
$action = $data['action'] ?? null;

if (!$userId || !$roomId || !$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters (userId, roomId, action).']);
    exit;
}

$conn = db_connect();
if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}

$response = ['success' => false, 'message' => 'Invalid action.'];

$conn->begin_transaction();

try {
    switch ($action) {
        case 'ready':
            $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1 WHERE user_id = ? AND room_id = ?");
            $stmt->bind_param("ii", $userId, $roomId);
            $stmt->execute();
            $stmt->close();

            // Check if all players are ready
            $stmt = $conn->prepare("SELECT COUNT(*) as total_players, SUM(is_ready) as ready_players FROM room_players WHERE room_id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            $response = ['success' => true, 'message' => 'Player is ready.'];

            if ($result['ready_players'] >= 4 && $result['ready_players'] == $result['total_players']) {
                $stmt = $conn->prepare("SELECT player_count FROM game_rooms WHERE id = ?");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $room = $stmt->get_result()->fetch_assoc();
                $playerCount = $room['player_count'];
                $stmt->close();

                dealCards($conn, $roomId, $playerCount);

                $stmt = $conn->prepare("SELECT initial_hand FROM room_players WHERE room_id = ? AND user_id = ?");
                $stmt->bind_param("ii", $roomId, $userId);
                $stmt->execute();
                $handResult = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                $response['cardsDealt'] = true;
                $response['hand'] = json_decode($handResult['initial_hand'], true);
            }
            break;

        case 'unready':
            $stmt = $conn->prepare("UPDATE room_players SET is_ready = 0 WHERE user_id = ? AND room_id = ?");
            $stmt->bind_param("ii", $userId, $roomId);
            $stmt->execute();
            $stmt->close();
            $response = ['success' => true, 'message' => 'Player is no longer ready.'];
            break;

        case 'submit_hand':
            $hand = $data['hand'] ?? null;
            if (!$hand) {
                throw new Exception("Hand data is missing.");
            }
            submitPlayerHand($conn, $userId, $roomId, $hand);
            $response = ['success' => true, 'message' => 'Hand submitted successfully.'];
            break;

        default:
            http_response_code(400);
            $response = ['success' => false, 'message' => 'Unknown action provided.'];
            break;
    }
    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    $response = ['success' => false, 'message' => $e->getMessage()];
}

$conn->close();

echo json_encode($response);
?>

<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['userId'] ?? 0);
$roomId = (int)($input['roomId'] ?? 0);
$sub_action = $input['action'] ?? '';

if (!$userId || !$roomId || !$sub_action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing parameters for player action.']);
    exit;
}

$conn->begin_transaction();
try {
    $response = ['success' => true];

    // Get room details first to decide on the logic path
    $stmt = $conn->prepare("SELECT game_type, game_mode, players_count FROM game_rooms WHERE id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $room = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$room) {
        throw new Exception("Room not found.");
    }

    if ($sub_action === 'ready') {
        $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1 WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();

        // Check if all players are ready
        $stmt = $conn->prepare("SELECT COUNT(*) as ready_players FROM room_players WHERE room_id = ? AND is_ready = 1 FOR UPDATE");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $readyPlayers = $stmt->get_result()->fetch_assoc()['ready_players'];
        $stmt->close();

        $playersNeeded = (int)$room['players_count'];

        if ($readyPlayers === $playersNeeded) {
            if ($playersNeeded === 4) {
                dealCardsFor4Players($conn, $roomId);
            } elseif ($playersNeeded === 8) {
                dealCardsFor8Players($conn, $roomId);
            }
        }
    }
    // --- Placeholder for Double-Points Game Logic ---
    elseif ($room['game_type'] === 'thirteen-5') {
         // TODO: Implement separate logic for double-points games
         if ($sub_action === 'ready') {
            // ... (logic for double-points games) ...
         }
    }

    // --- Common logic for submitting hands (can also be separated if needed) ---
    if ($sub_action === 'submit_hand') {
        $hand = $input['hand'] ?? null;
        if (!$hand) throw new Exception("Hand data is missing.");
        $handJson = json_encode($hand);
        $stmt = $conn->prepare("UPDATE room_players SET submitted_hand = ?, is_ready = 1 WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("sii", $handJson, $roomId, $userId);
        $stmt->execute();
        $stmt->close();
        $stmt = $conn->prepare("SELECT COUNT(*) as submitted_players FROM room_players WHERE room_id = ? AND submitted_hand IS NOT NULL");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $submittedPlayers = $stmt->get_result()->fetch_assoc()['submitted_players'];
        $stmt->close();
        $stmt = $conn->prepare("SELECT game_type, players_count FROM game_rooms WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $roomDetails = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $playersNeeded = $roomDetails['players_count'];
        $gameType = $roomDetails['game_type'];

        if ($submittedPlayers == $playersNeeded) {
            $stmt = $conn->prepare("UPDATE game_rooms SET status = 'finished' WHERE id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $stmt->close();
        }
    }
    $conn->commit();
    echo json_encode($response);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
?>

<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

// --- Helper Functions (copied from old match.php) ---
function dealCards($conn, $roomId, $gameType, $playerCount) {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }
    shuffle($deck);
    $cards_per_player = $gameType === 'eight' ? 8 : 13;
    $all_hands = [];
    for ($i = 0; $i < $playerCount; $i++) {
        $hand = array_slice($deck, $i * $cards_per_player, $cards_per_player);
        if ($gameType === 'eight') {
            $all_hands[$i] = ['top' => [], 'middle' => $hand, 'bottom' => []];
        } else {
            usort($hand, function ($a, $b) use ($ranks) {
                return array_search($b['rank'], $ranks) - array_search($a['rank'], $ranks);
            });
            $all_hands[$i] = [
                'top' => array_slice($hand, 10, 3),
                'middle' => array_slice($hand, 5, 5),
                'bottom' => array_slice($hand, 0, 5),
            ];
        }
    }

    // Deal hands to players
    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerIdsResult = $stmt->get_result();
    $i = 0;
    while ($row = $playerIdsResult->fetch_assoc()) {
        $handJson = json_encode($all_hands[$i++]);
        $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand=? WHERE room_id=? AND user_id=?");
        $updateStmt->bind_param("sii", $handJson, $roomId, $row['user_id']);
        $updateStmt->execute();
        $updateStmt->close();
    }
    $stmt->close();

    // Update room status
    $stmt = $conn->prepare("UPDATE game_rooms SET status='playing' WHERE id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $stmt->close();
}

function fillWithAI($conn, $roomId, $gameType, $playersNeeded) {
    $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
    $stmt->close();

    $aiToCreate = $playersNeeded - $currentPlayers;
    if ($aiToCreate <= 0) return;

    for ($i = 1; $i <= $aiToCreate; $i++) {
        $aiPhone = "ai_player_" . $i;
        $aiId = null;

        $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
        $stmt->bind_param("s", $aiPhone);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $aiId = $row['id'];
        }
        $stmt->close();

        if (!$aiId) {
            $insertStmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, '', 1000)");
            $insertStmt->bind_param("s", $aiPhone);
            $insertStmt->execute();
            $aiId = $insertStmt->insert_id;
            $insertStmt->close();
        }

        if ($aiId) {
            $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 1, 1)");
            $stmt->bind_param("ii", $roomId, $aiId);
            $stmt->execute();
            $stmt->close();
        }
    }
}

// --- Main Logic ---
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
        $stmt = $conn->prepare("SELECT game_type, game_mode, players_count FROM game_rooms WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $room = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$room) throw new Exception("Room not found.");

        // Check for other idle human players
        $stmt = $conn->prepare("SELECT COUNT(DISTINCT rp.user_id) as waiting_players FROM room_players rp JOIN game_rooms r ON rp.room_id = r.id WHERE r.status = 'matching' AND r.game_type = ? AND r.game_mode = ? AND rp.user_id > 0 AND rp.room_id != ?");
        $stmt->bind_param("ssi", $room['game_type'], $room['game_mode'], $roomId);
        $stmt->execute();
        $waitingPlayers = $stmt->get_result()->fetch_assoc()['waiting_players'];
        $stmt->close();

        if ($waitingPlayers == 0) {
            // No one else is waiting, fill with AI
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

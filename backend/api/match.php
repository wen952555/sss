<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

// --- Helper Functions ---
function dealCards($gameType, $playerCount) {
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
    return $all_hands;
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
        $aiId = -$i;
        $aiPhone = "ai_player_" . abs($aiId);

        // Check if AI user exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->bind_param("i", $aiId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows == 0) {
            $stmt->close();
            // Create AI user
            $insertStmt = $conn->prepare("INSERT INTO users (id, phone, password, points) VALUES (?, ?, '', 1000)");
            $insertStmt->bind_param("is", $aiId, $aiPhone);
            $insertStmt->execute();
            $insertStmt->close();
        } else {
            $stmt->close();
        }

        // Add AI to room
        $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed, initial_hand) VALUES (?, ?, 1, 1, '[]')");
        $stmt->bind_param("ii", $roomId, $aiId);
        $stmt->execute();
        $stmt->close();
    }
}

// --- Main Logic ---
$gameType = $_GET['gameType'] ?? 'thirteen';
$gameMode = $_GET['gameMode'] ?? 'normal';
$userId = (int)($_GET['userId'] ?? 0);
if (!$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '缺少用户ID。']);
    exit;
}
$playersNeeded = $gameType === 'thirteen' ? 4 : 2;

$conn->begin_transaction();
try {
    // Find a non-full matching room
    $stmt = $conn->prepare("SELECT r.id FROM game_rooms r LEFT JOIN room_players rp ON r.id=rp.room_id WHERE r.status='matching' AND r.game_type=? AND r.game_mode=? AND rp.user_id > 0 GROUP BY r.id HAVING COUNT(rp.id) < ? LIMIT 1");
    $stmt->bind_param("ssi", $gameType, $gameMode, $playersNeeded);
    $stmt->execute();
    $room = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($room) {
        $roomId = $room['id'];
    } else {
        // Create new room
        $roomCode = uniqid('room_');
        $stmt = $conn->prepare("INSERT INTO game_rooms (room_code, game_type, game_mode, status, players_count) VALUES (?, ?, ?, 'matching', ?)");
        $stmt->bind_param("sssi", $roomCode, $gameType, $gameMode, $playersNeeded);
        $stmt->execute();
        $roomId = $stmt->insert_id;
        $stmt->close();
    }

    // Join room (ignore if already in)
    $stmt = $conn->prepare("SELECT COUNT(*) FROM room_players WHERE room_id=? AND user_id=?");
    $stmt->bind_param("ii", $roomId, $userId);
    $stmt->execute();
    $isInRoom = $stmt->get_result()->fetch_row()[0] > 0;
    $stmt->close();
    if (!$isInRoom) {
        $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, initial_hand) VALUES (?, ?, '[]')");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();
    }

    // AI Fill Logic
    if ($gameMode === 'normal' || $gameMode === 'double') {
        fillWithAI($conn, $roomId, $gameType, $playersNeeded);
    }

    // Check room player count
    $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
    $stmt->close();

    // If full, deal cards and start game
    if ($currentPlayers == $playersNeeded) {
        $hands = dealCards($gameType, $playersNeeded);
        $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $playerIdsResult = $stmt->get_result();
        $i = 0;
        while ($row = $playerIdsResult->fetch_assoc()) {
            $handJson = json_encode($hands[$i++]);
            $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand=? WHERE room_id=? AND user_id=?");
            $updateStmt->bind_param("sii", $handJson, $roomId, $row['user_id']);
            $updateStmt->execute();
            $updateStmt->close();
        }
        $stmt->close();

        $stmt = $conn->prepare("UPDATE game_rooms SET status='playing' WHERE id=?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $stmt->close();
    }

    $conn->commit();

    http_response_code(200);
    echo json_encode(['success' => true, 'roomId' => $roomId]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '匹配时发生错误: ' . $e->getMessage()]);
}
$conn->close();
?>
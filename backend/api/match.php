<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';
require_once 'utils.php'; // Contains dealCards() and fillWithAI()

$gameType = $_GET['gameType'] ?? 'thirteen';
$gameMode = $_GET['gameMode'] ?? 'normal';
$userId = (int)($_GET['userId'] ?? 0);

if (!$userId) { // Guest player logic
    $playersNeeded = $gameType === 'thirteen' ? 4 : 2;
    $conn->begin_transaction();
    try {
        // 1. Create a new room for the guest
        $roomCode = uniqid('guest_room_');
        $stmt = $conn->prepare("INSERT INTO game_rooms (room_code, game_type, game_mode, status, players_count) VALUES (?, ?, ?, 'playing', ?)");
        $stmt->bind_param("sssi", $roomCode, $gameType, $gameMode, $playersNeeded);
        $stmt->execute();
        $roomId = $stmt->insert_id;
        $stmt->close();

        // 2. Create a temporary guest user record
        $guestPhone = "guest_" . uniqid();
        $stmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, '', 0)");
        $stmt->bind_param("s", $guestPhone);
        $stmt->execute();
        $guestUserId = $stmt->insert_id;
        $stmt->close();

        // 3. Add guest to the room
        $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 1, 0)");
        $stmt->bind_param("ii", $roomId, $guestUserId);
        $stmt->execute();
        $stmt->close();

        // 4. Fill the rest of the room with AI
        fillWithAI($conn, $roomId, $gameType, $playersNeeded);

        // 5. Deal cards
        dealCards($conn, $roomId, $gameType, $playersNeeded);

        $conn->commit();
        // Return a special response for the guest
        http_response_code(200);
        echo json_encode(['success' => true, 'roomId' => $roomId, 'guestUserId' => $guestUserId]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Guest match failed: ' . $e->getMessage()]);
    }

} else { // Logged-in player logic
    $playersNeeded = $gameType === 'thirteen' ? 4 : 2;
    $conn->begin_transaction();
    try {
        $roomId = null;
        // Find a non-full matching room with other human players
        $stmt = $conn->prepare("SELECT r.id FROM game_rooms r LEFT JOIN room_players rp ON r.id = rp.room_id WHERE r.status = 'matching' AND r.game_type = ? AND r.game_mode = ? GROUP BY r.id HAVING COUNT(rp.id) < ? LIMIT 1");
        $stmt->bind_param("ssi", $gameType, $gameMode, $playersNeeded);
        $stmt->execute();
        $room = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($room) {
            $roomId = $room['id'];
        } else {
            $roomCode = uniqid('room_');
            $stmt = $conn->prepare("INSERT INTO game_rooms (room_code, game_type, game_mode, status, players_count) VALUES (?, ?, ?, 'matching', ?)");
            $stmt->bind_param("sssi", $roomCode, $gameType, $gameMode, $playersNeeded);
            $stmt->execute();
            $roomId = $stmt->insert_id;
            $stmt->close();
        }

        // Add player to the room
        $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 0, 0) ON DUPLICATE KEY UPDATE room_id = ?");
        $stmt->bind_param("iii", $roomId, $userId, $roomId);
        $stmt->execute();
        $stmt->close();

        $conn->commit();
        http_response_code(200);
        echo json_encode(['success' => true, 'roomId' => $roomId]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '匹配时发生错误: ' . $e->getMessage()]);
    }
}
$conn->close();
?>
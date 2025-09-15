<?php
// backend/api/actions/match.php

require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$gameType = $_GET['gameType'] ?? null;
$gameMode = $_GET['gameMode'] ?? null;
$userId = $_GET['userId'] ?? null;
$playerCount = (int)($_GET['playerCount'] ?? 4);

if (!$gameType || !$gameMode || !$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '错误：缺少必要的参数。']);
    exit;
}

$conn = db_connect();

// Use a transaction to ensure atomicity
$conn->begin_transaction();

try {
    // 1. Check if the user is already in an active room for this game type
    $stmt = $conn->prepare("SELECT r.id FROM game_rooms r JOIN room_players rp ON r.id = rp.room_id WHERE rp.user_id = ? AND r.game_type = ? AND r.status IN ('waiting', 'arranging', 'playing')");
    $stmt->bind_param("is", $userId, $gameType);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($existingRoom = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'roomId' => $existingRoom['id']]);
        $stmt->close();
        $conn->commit();
        exit;
    }
    $stmt->close();

    // 2. Find an available room
    $stmt = $conn->prepare("SELECT r.id, COUNT(rp.user_id) as player_count FROM game_rooms r LEFT JOIN room_players rp ON r.id = rp.room_id WHERE r.game_type = ? AND r.game_mode = ? AND r.status = 'waiting' AND r.player_count = ? GROUP BY r.id HAVING player_count < ? ORDER BY r.created_at ASC LIMIT 1");
    $stmt->bind_param("ssii", $gameType, $gameMode, $playerCount, $playerCount);
    $stmt->execute();
    $result = $stmt->get_result();
    $room = $result->fetch_assoc();
    $stmt->close();

    $roomId = null;

    if ($room) {
        // 3. Join existing room
        $roomId = $room['id'];
        $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id) VALUES (?, ?)");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();
    } else {
        // 4. Create new room
        $stmt = $conn->prepare("INSERT INTO game_rooms (game_type, game_mode, status, player_count) VALUES (?, ?, 'waiting', ?)");
        $stmt->bind_param("ssi", $gameType, $gameMode, $playerCount);
        $stmt->execute();
        $roomId = $stmt->insert_id;
        $stmt->close();

        $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id) VALUES (?, ?)");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();
    }

    // 5. Check if room is full
    $stmt = $conn->prepare("SELECT COUNT(*) as player_count FROM room_players WHERE room_id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $currentPlayers = (int)$result['player_count'];
    $stmt->close();

    if ($currentPlayers === $playerCount) {
        // 6. Deal cards
        if ($gameType === 'thirteen' || $gameType === 'thirteen-5') {
            if ($playerCount <= 4) {
                dealCardsFor4Players($conn, $roomId);
            } else {
                dealCardsFor8Players($conn, $roomId);
            }
        }
        // Add logic for other game types if necessary
    }

    $conn->commit();
    echo json_encode(['success' => true, 'roomId' => $roomId]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '数据库操作失败: ' . $e->getMessage()]);
}

$conn->close();
?>

<?php
// backend/api/actions/match.php

require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$gameType = $_GET['gameType'] ?? null;
$userId = $_GET['userId'] ?? null;
$playerCount = (int)($_GET['playerCount'] ?? 4);
$matchAction = $_GET['matchAction'] ?? 'join'; // 'join' or 'create'

if (!$gameType || !$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '错误：缺少必要的参数。']);
    exit;
}

try {
    $conn = db_connect();
    $conn->begin_transaction();

    // 1. Check if the user is already in ANY active room, regardless of game type.
    $stmt = $conn->prepare("SELECT r.id FROM game_rooms r JOIN room_players rp ON r.id = rp.room_id WHERE rp.user_id = ? AND r.status IN ('waiting', 'arranging', 'playing', 'submitted')");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($existingRoom = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'roomId' => $existingRoom['id']]);
        $stmt->close();
        $conn->commit();
        exit;
    }
    $stmt->close();

    $roomId = null;

    if ($matchAction === 'create') {
        // Always create a new room
        $stmt = $conn->prepare("INSERT INTO game_rooms (game_type, status, player_count) VALUES (?, 'waiting', ?)");
        $stmt->bind_param("si", $gameType, $playerCount);
        $stmt->execute();
        $roomId = $stmt->insert_id;
        $stmt->close();

        $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready) VALUES (?, ?, 0)");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();
    } else { // 'join' or default 'match' action
        // Find an available room
        $stmt = $conn->prepare("SELECT r.id, r.player_count FROM game_rooms r LEFT JOIN room_players rp ON r.id = rp.room_id WHERE r.game_type = ? AND r.status IN ('waiting', 'finished') GROUP BY r.id, r.player_count HAVING COUNT(rp.user_id) < r.player_count ORDER BY r.created_at ASC LIMIT 1");
        $stmt->bind_param("s", $gameType);
        $stmt->execute();
        $result = $stmt->get_result();
        $room = $result->fetch_assoc();
        $stmt->close();

        if ($room) {
            $roomId = $room['id'];
            $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE room_id=room_id");
            $stmt->bind_param("ii", $roomId, $userId);
            $stmt->execute();
            $stmt->close();

            // If the room was finished, reset its status to waiting
            $stmt = $conn->prepare("UPDATE game_rooms SET status = 'waiting' WHERE id = ? AND status = 'finished'");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $stmt->close();
        } else {
            // No waiting rooms found, return error for 'join' action
            echo json_encode(['success' => false, 'message' => '没有找到可加入的房间，您可以自己创建一个。']);
            $conn->commit();
            exit;
        }
    }

    $conn->commit();
    echo json_encode(['success' => true, 'roomId' => $roomId]);

} catch (Exception $e) {
    if (isset($conn) && $conn->ping()) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '数据库操作失败: ' . $e->getMessage()]);
} finally {
    if (isset($conn) && $conn->ping()) {
        $conn->close();
    }
}
?>

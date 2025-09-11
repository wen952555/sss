<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$gameType = $_GET['gameType'] ?? 'thirteen';
$gameMode = $_GET['gameMode'] ?? 'normal';
$userId = (int)($_GET['userId'] ?? 0);
$playerCount = (int)($_GET['playerCount'] ?? 0);

if (!$userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => '用户未登录，无法匹配。']);
    exit;
}

$playersNeeded = $playerCount > 0 ? $playerCount : 4;

// Defensive override: Recalculate playersNeeded on the server from the gameMode string
if (strpos($gameMode, '-') !== false) {
    $parts = explode('-', $gameMode);
    $num_from_mode = (int)$parts[0];
    if ($num_from_mode > 0) {
        $playersNeeded = $num_from_mode;
    }
}

$conn->begin_transaction();
try {
    $roomId = null;
    $stmt = $conn->prepare("SELECT r.id FROM game_rooms r LEFT JOIN room_players rp ON r.id = rp.room_id WHERE r.status = 'matching' AND r.game_type = ? AND r.game_mode = ? AND r.players_count = ? GROUP BY r.id HAVING COUNT(rp.id) < ? LIMIT 1");
    $stmt->bind_param("ssii", $gameType, $gameMode, $playersNeeded, $playersNeeded);
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
$conn->close();
?>

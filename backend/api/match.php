<?php
// Simplified match.php - Always creates a new room
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

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
    // Always create a new room
    $roomCode = uniqid('room_');
    $stmt = $conn->prepare("INSERT INTO game_rooms (room_code, game_type, game_mode, status, players_count) VALUES (?, ?, ?, 'matching', ?)");
    $stmt->bind_param("sssi", $roomCode, $gameType, $gameMode, $playersNeeded);
    $stmt->execute();
    $roomId = $stmt->insert_id;
    $stmt->close();

    // Add the player to the new room
    $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 0, 0)");
    $stmt->bind_param("ii", $roomId, $userId);
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
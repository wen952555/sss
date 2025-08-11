<?php
// --- START OF FILE api/game_status.php ---

header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

$roomId = (int)($_GET['roomId'] ?? 0);
$userId = (int)($_GET['userId'] ?? 0); // 获取当前玩家ID，以便返回他的手牌

if (!$roomId || !$userId) { /* ... 错误处理 ... */ exit; }

// 获取房间基本信息
$stmt = $conn->prepare("SELECT status FROM game_rooms WHERE id = ?");
$stmt->bind_param("i", $roomId);
$stmt->execute();
$room = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$room) { /* ... 房间不存在错误处理 ... */ exit; }

// 获取房间内所有玩家信息
$stmt = $conn->prepare("SELECT u.id, u.phone, rp.is_ready FROM room_players rp JOIN users u ON rp.user_id = u.id WHERE rp.room_id = ?");
$stmt->bind_param("i", $roomId);
$stmt->execute();
$playersResult = $stmt->get_result();
$players = [];
while($row = $playersResult->fetch_assoc()) {
    $players[] = $row;
}
$stmt->close();

$response = [
    'success' => true,
    'gameStatus' => $room['status'],
    'players' => $players
];

// 如果游戏在进行中，返回当前玩家手牌
if ($room['status'] === 'playing') {
    $stmt = $conn->prepare("SELECT initial_hand FROM room_players WHERE room_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $roomId, $userId);
    $stmt->execute();
    $handResult = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($handResult) {
        $response['hand'] = json_decode($handResult['initial_hand'], true);
    }
}

// 如果游戏已结束，返回结果
if ($room['status'] === 'finished') {
    // 查询并组装结果
    $stmt = $conn->prepare("SELECT u.phone as name, rp.submitted_hand, rp.score FROM room_players rp JOIN users u ON rp.user_id = u.id WHERE rp.room_id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $resultPlayersResult = $stmt->get_result();
    $resultPlayers = [];
    while($row = $resultPlayersResult->fetch_assoc()) {
        $row['hand'] = json_decode($row['submitted_hand'], true);
        unset($row['submitted_hand']);
        $resultPlayers[] = $row;
    }
    $stmt->close();
    $response['result'] = ['players' => $resultPlayers];
}

echo json_encode($response);
$conn->close();

// --- END OF FILE api/game_status.php ---
<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';
require_once '../utils/poker_evaluator.php';

$now = time();
$timeoutSec = 90;

$stmt = $conn->query("SELECT rp.room_id, rp.user_id, rp.initial_hand
    FROM room_players rp
    JOIN game_rooms gr ON rp.room_id = gr.id
    WHERE gr.status = 'playing' AND rp.is_ready = 0
    AND UNIX_TIMESTAMP(gr.updated_at) + $timeoutSec < $now");

while($row = $stmt->fetch_assoc()) {
    $roomId = $row['room_id'];
    $userId = $row['user_id'];
    $handArr = json_decode($row['initial_hand'], true);
    if (!$handArr) continue;

    // 智能理牌，这里需要和前端一致的算法
    $arrangedHand = findBestArrangement($handArr, 'thirteen'); // 或根据游戏类型传参

    // 自动提交
    $payload = [
        'userId' => $userId,
        'roomId' => $roomId,
        'hand' => $arrangedHand,
        'isAutoManaged' => 1
    ];
    $ch = curl_init("http://localhost/api/player_ready.php");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_exec($ch);
    curl_close($ch);
}

echo json_encode(['success' => true]);
$conn->close();
?>
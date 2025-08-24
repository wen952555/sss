<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

// 查询所有处于matching或playing状态的房间的真实人类玩家
// Excludes AI (is_auto_managed = 1) and temporary guests (phone LIKE 'guest_%')
$result = $conn->query("
    SELECT COUNT(DISTINCT rp.user_id) AS online_count
    FROM room_players rp
    JOIN game_rooms gr ON rp.room_id = gr.id
    JOIN users u ON rp.user_id = u.id
    WHERE gr.status IN ('matching', 'playing')
      AND rp.is_auto_managed = 0
      AND u.phone NOT LIKE 'guest_%'
");

if ($result && $row = $result->fetch_assoc()) {
    echo json_encode(['success' => true, 'onlineCount' => intval($row['online_count'])]);
} else {
    echo json_encode(['success' => false, 'onlineCount' => 0]);
}
$conn->close();
?>
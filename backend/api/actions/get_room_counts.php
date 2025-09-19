<?php
require_once __DIR__ . '/../db_connect.php';

$conn = db_connect();

$sql = "
    SELECT r.game_mode, COUNT(rp.user_id) as player_count, r.player_count as max_players
    FROM game_rooms r
    JOIN room_players rp ON r.id = rp.room_id
    WHERE r.status = 'waiting'
    GROUP BY r.id, r.game_mode, r.player_count
";

$result = $conn->query($sql);

$roomCounts = [];
while ($row = $result->fetch_assoc()) {
    $gameMode = $row['game_mode'];
    if (!isset($roomCounts[$gameMode])) {
        $roomCounts[$gameMode] = ['players' => 0, 'max_players' => 0, 'rooms' => 0];
    }
    $roomCounts[$gameMode]['players'] += (int)$row['player_count'];
    $roomCounts[$gameMode]['max_players'] += (int)$row['max_players'];
    $roomCounts[$gameMode]['rooms']++;
}

echo json_encode(['success' => true, 'roomCounts' => $roomCounts]);

$conn->close();
?>

<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

// DEBUG: Return the list of players being counted
$result = $conn->query("
    SELECT DISTINCT rp.user_id, u.phone, rp.is_auto_managed, gr.status
    FROM room_players rp
    JOIN game_rooms gr ON rp.room_id = gr.id
    JOIN users u ON rp.user_id = u.id
");

$players = [];
while($row = $result->fetch_assoc()) {
    $players[] = $row;
}

// The original filtering logic, now done in PHP for debugging
$filtered_players = array_filter($players, function($p) {
    return in_array($p['status'], ['matching', 'playing'])
           && $p['is_auto_managed'] == 0
           && strpos($p['phone'], 'guest_') !== 0;
});

echo json_encode([
    'success' => true,
    'onlineCount' => count($filtered_players),
    'debug_all_players_in_rooms' => $players,
    'debug_filtered_players' => array_values($filtered_players)
]);
$conn->close();
?>
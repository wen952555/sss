<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

$onlineCount = 0;
$query = "
    SELECT COUNT(DISTINCT id) as onlineCount
    FROM users
    WHERE last_active > NOW() - INTERVAL 5 MINUTE
      AND phone NOT LIKE 'guest_%'
      AND phone NOT LIKE 'ai_player_%'
";
$result = $conn->query($query);
if ($result) {
    $row = $result->fetch_assoc();
    $onlineCount = (int)$row['onlineCount'];
    $result->free();

    if ($onlineCount === 0) {
        // If no one is online, clean up all rooms.
        $conn->query("DELETE FROM room_players");
        $conn->query("DELETE FROM game_rooms");
    }
}
echo json_encode(['success' => true, 'onlineCount' => $onlineCount]);
$conn->close();
?>

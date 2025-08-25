<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

// This query defines an "online user" as someone who is not a guest or an AI,
// and has made a request to the server (specifically, game_status.php)
// within the last 5 minutes.

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
}

echo json_encode([
    'success' => true,
    'onlineCount' => $onlineCount
]);

$conn->close();
?>
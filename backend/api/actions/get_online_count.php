<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';

// The overall online count for display in the lobby
$totalOnlineQuery = "
    SELECT COUNT(DISTINCT id) as onlineCount
    FROM users
    WHERE last_active > NOW() - INTERVAL 5 MINUTE
      AND phone NOT LIKE 'guest_%'
      AND phone NOT LIKE 'ai_player_%'
";
$totalResult = $conn->query($totalOnlineQuery);
$onlineCount = 0;
if ($totalResult) {
    $row = $totalResult->fetch_assoc();
    $onlineCount = (int)$row['onlineCount'];
    $totalResult->free();
}

// Detailed counts per game mode for the selection screen
$gameModeCountsQuery = "
    SELECT
        gr.game_type,
        gr.game_mode,
        gr.player_count,
        COUNT(rp.user_id) as current_players
    FROM game_rooms gr
    JOIN room_players rp ON gr.id = rp.room_id
    JOIN users u ON rp.user_id = u.id
    WHERE gr.status IN ('waiting', 'matching')
      AND u.last_active > NOW() - INTERVAL 2 MINUTE
    GROUP BY gr.game_type, gr.game_mode, gr.player_count
";

$gameModeResult = $conn->query($gameModeCountsQuery);
$gameModeCounts = [];
if ($gameModeResult) {
    while ($row = $gameModeResult->fetch_assoc()) {
        $key = "{$row['game_type']}-{$row['player_count']}-{$row['game_mode']}";
        // Here we handle the logic of not showing a full room.
        // If current_players equals the max player_count, we don't add it,
        // so the frontend will show the default of 0.
        if ((int)$row['current_players'] < (int)$row['player_count']) {
            $gameModeCounts[$key] = (int)$row['current_players'];
        }
    }
    $gameModeResult->free();
}

echo json_encode([
    'success' => true,
    'onlineCount' => $onlineCount,
    'gameModeCounts' => $gameModeCounts
]);

$conn->close();
?>

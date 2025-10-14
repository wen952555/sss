<?php
// backend/api/actions/get_room_counts.php

require_once __DIR__ . '/../db_connect.php';

function get_room_counts() {
    $conn = db_connect();
    if (!$conn) {
        return ['success' => false, 'message' => 'Database connection failed'];
    }

    $counts = [];
    $player_counts = [4, 5, 6, 7, 8];

    foreach ($player_counts as $count) {
        $stmt = $conn->prepare("SELECT COUNT(*) as room_count FROM game_rooms WHERE player_count = ? AND status = 'waiting'");
        $stmt->bind_param("i", $count);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $counts[$count] = $result['room_count'] ?? 0;
        $stmt->close();
    }

    $conn->close();
    return ['success' => true, 'counts' => $counts];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json');
    echo json_encode(get_room_counts());
}
?>
<?php
// backend/api/actions/get_room_counts.php

require_once __DIR__ . '/../db_connect.php';

function get_room_counts() {
    try {
        $conn = db_connect();
        $counts = [];
        $game_types = ['thirteen', 'thirteen-5', 'thirteen-10'];

        foreach ($game_types as $game_type) {
            $stmt = $conn->prepare("SELECT COUNT(rp.id) as player_count FROM room_players rp JOIN game_rooms gr ON rp.room_id = gr.id WHERE gr.game_type = ? AND gr.status = 'waiting'");
            $stmt->bind_param("s", $game_type);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            $counts[$game_type] = $result['player_count'] ?? 0;
            $stmt->close();
        }

        return ['success' => true, 'counts' => $counts];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Database error: ' . $e->getMessage()];
    } finally {
        if (isset($conn)) {
            $conn->close();
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json');
    echo json_encode(get_room_counts());
}
?>
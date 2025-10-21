<?php
// backend/poll.php

require_once 'database.php';

header('Content-Type: application/json');

$gameId = $_GET['game_id'] ?? null;
$lastUpdate = $_GET['last_update'] ?? 0;

if (!$gameId) {
    echo json_encode(['error' => 'Game ID is required.']);
    exit;
}

set_time_limit(60);

$db = getDbConnection();

while (true) {
    $stmt = $db->prepare('SELECT * FROM player_scores WHERE game_id = ? AND id > ?');
    $stmt->bindValue(1, $gameId, SQLITE3_INTEGER);
    $stmt->bindValue(2, $lastUpdate, SQLITE3_INTEGER);
    $result = $stmt->execute();

    $changes = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $changes[] = $row;
    }

    if (!empty($changes)) {
        echo json_encode(['last_update' => $changes[count($changes) - 1]['id'], 'data' => $changes]);
        exit;
    }

    sleep(2);
}

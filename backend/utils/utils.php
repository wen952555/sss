<?php
// --- Helper Functions ---
function dealCards($conn, $roomId, $gameType, $playerCount, $playerIds = null) {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];

    // Base deck
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }

    // Additional cards based on player count for thirteen card game
    if ($gameType === 'thirteen') {
        if ($playerCount >= 5) { // Add spades
            foreach ($ranks as $rank) { $deck[] = ['rank' => $rank, 'suit' => 'spades']; }
        }
        if ($playerCount >= 6) { // Add hearts
            foreach ($ranks as $rank) { $deck[] = ['rank' => $rank, 'suit' => 'hearts']; }
        }
        if ($playerCount >= 7) { // Add clubs
            foreach ($ranks as $rank) { $deck[] = ['rank' => $rank, 'suit' => 'clubs']; }
        }
        if ($playerCount >= 8) { // Add diamonds (completing the second deck)
            foreach ($ranks as $rank) { $deck[] = ['rank' => $rank, 'suit' => 'diamonds']; }
        }
    }
    shuffle($deck);
    $cards_per_player = $gameType === 'eight' ? 8 : 13;
    $all_hands = [];
    for ($i = 0; $i < $playerCount; $i++) {
        $hand = array_slice($deck, $i * $cards_per_player, $cards_per_player);
        if ($gameType === 'eight') {
            $all_hands[$i] = ['top' => [], 'middle' => $hand, 'bottom' => []];
        } else {
            usort($hand, function ($a, $b) use ($ranks) {
                return array_search($b['rank'], $ranks) - array_search($a['rank'], $ranks);
            });
            $all_hands[$i] = [
                'top' => array_slice($hand, 10, 3),
                'middle' => array_slice($hand, 5, 5),
                'bottom' => array_slice($hand, 0, 5),
            ];
        }
    }

    // If specific player IDs are not provided, fetch them all from the room
    if ($playerIds === null) {
        $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $playerIdsResult = $stmt->get_result();
        $playerIds = [];
        while ($row = $playerIdsResult->fetch_assoc()) {
            $playerIds[] = $row['user_id'];
        }
        $stmt->close();
    }

    // Deal hands to players
    foreach ($playerIds as $i => $userId) {
        $handJson = json_encode($all_hands[$i]);
        $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand=? WHERE room_id=? AND user_id=?");
        $updateStmt->bind_param("sii", $handJson, $roomId, $userId);
        $updateStmt->execute();
        $updateStmt->close();
    }

    // Update room status
    $stmt = $conn->prepare("UPDATE game_rooms SET status='playing' WHERE id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $stmt->close();
}

function fillWithAI($conn, $roomId, $gameType, $playersNeeded) {
    $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
    $stmt->close();

    $aiToCreate = $playersNeeded - $currentPlayers;
    if ($aiToCreate <= 0) return;

    for ($i = 1; $i <= $aiToCreate; $i++) {
        $aiPhone = "ai_player_" . $i;
        $aiId = null;

        $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
        $stmt->bind_param("s", $aiPhone);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            $aiId = $row['id'];
        }
        $stmt->close();

        if (!$aiId) {
            $insertStmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, '', 1000)");
            $insertStmt->bind_param("s", $aiPhone);
            $insertStmt->execute();
            $aiId = $insertStmt->insert_id;
            $insertStmt->close();
        }

        if ($aiId) {
            $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 1, 1)");
            $stmt->bind_param("ii", $roomId, $aiId);
            $stmt->execute();
            $stmt->close();
        }
    }
}
?>

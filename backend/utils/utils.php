<?php
// This file no longer needs the scorer for dealing cards.
// It will be required by the API endpoint when scoring is needed.

/**
 * Deals 13 cards to each player in the room.
 * The hand is a simple flat array of 13 card objects.
 * The frontend is responsible for any initial arrangement.
 */
function dealCards($conn, $roomId, $playerCount) {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }
    shuffle($deck);

    $cards_per_player = 13;

    // First, get all player IDs in the room to ensure we deal correctly.
    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerIdsResult = $stmt->get_result();

    $player_ids = [];
    while ($row = $playerIdsResult->fetch_assoc()) {
        $player_ids[] = $row['user_id'];
    }
    $stmt->close();

    // Now, deal a hand to each player
    for ($i = 0; $i < count($player_ids); $i++) {
        // Slice the deck to get a 13-card hand
        $hand = array_slice($deck, $i * $cards_per_player, $cards_per_player);

        // The hand is a simple flat array of card objects.
        $handJson = json_encode($hand);

        $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand=? WHERE room_id=? AND user_id=?");
        $updateStmt->bind_param("sii", $handJson, $roomId, $player_ids[$i]);
        $updateStmt->execute();
        $updateStmt->close();
    }

    // Update room status to 'arranging'
    $stmt = $conn->prepare("UPDATE game_rooms SET status='arranging' WHERE id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $stmt->close();
}

/**
 * Fills the remaining slots in a room with AI players.
 */
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

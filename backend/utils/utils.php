<?php
// This file no longer needs the scorer for dealing cards, as no sorting that requires it is done here.

/**
 * Deals 13 cards to each player in the room.
 * The hand is arranged by a simple rank sort and sliced into lanes.
 * This is a fast and simple approach as per user instruction.
 */
function dealCardsFor4Players($conn, $roomId) {
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

    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerIdsResult = $stmt->get_result();

    $player_ids = [];
    while ($row = $playerIdsResult->fetch_assoc()) {
        $player_ids[] = $row['user_id'];
    }
    $stmt->close();

    for ($i = 0; $i < count($player_ids); $i++) {
        $hand_unsorted = array_slice($deck, $i * $cards_per_player, $cards_per_player);

        // Simple sort by rank as per user's new instruction
        usort($hand_unsorted, function ($a, $b) use ($ranks) {
            return array_search($b['rank'], $ranks) - array_search($a['rank'], $ranks);
        });

        // Slice into lanes directly
        $hand_arranged = [
            'bottom' => array_slice($hand_unsorted, 0, 5),
            'middle' => array_slice($hand_unsorted, 5, 5),
            'top' => array_slice($hand_unsorted, 10, 3),
        ];

        $handJson = json_encode($hand_arranged);

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

function dealCardsFor8Players($conn, $roomId) {
    $stmt = $conn->prepare("SELECT COUNT(*) as playerCount FROM room_players WHERE room_id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $playerCount = (int)$result['playerCount'];
    $stmt->close();

    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];

    // Base deck
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }

    $suits_to_add = $playerCount - 4;
    if ($suits_to_add > 0) {
        $additional_suits = array_slice($suits, 0, $suits_to_add);
        foreach ($additional_suits as $suit) {
            foreach ($ranks as $rank) {
                $deck[] = ['rank' => $rank, 'suit' => $suit];
            }
        }
    }

    if ($playerCount === 8) { // Two full decks for 8 players
        $deck = array_merge($deck, $deck);
    }

    shuffle($deck);

    $cards_per_player = 13;

    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerIdsResult = $stmt->get_result();

    $player_ids = [];
    while ($row = $playerIdsResult->fetch_assoc()) {
        $player_ids[] = $row['user_id'];
    }
    $stmt->close();

    for ($i = 0; $i < count($player_ids); $i++) {
        $hand_unsorted = array_slice($deck, $i * $cards_per_player, $cards_per_player);

        usort($hand_unsorted, function ($a, $b) use ($ranks) {
            return array_search($b['rank'], $ranks) - array_search($a['rank'], $ranks);
        });

        $hand_arranged = [
            'bottom' => array_slice($hand_unsorted, 0, 5),
            'middle' => array_slice($hand_unsorted, 5, 5),
            'top' => array_slice($hand_unsorted, 10, 3),
        ];

        $handJson = json_encode($hand_arranged);

        $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand=? WHERE room_id=? AND user_id=?");
        $updateStmt->bind_param("sii", $handJson, $roomId, $player_ids[$i]);
        $updateStmt->execute();
        $updateStmt->close();
    }

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

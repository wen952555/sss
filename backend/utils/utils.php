<?php
// This file no longer needs the scorer for dealing cards, as no sorting that requires it is done here.

/**
 * Deals cards for multiple rounds and stores them in the database.
 */
function dealCards($conn, $roomId, $playerCount) {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $base_deck = [];
    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $base_deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }

    $cards_per_player = 13;
    $cards_per_round = $playerCount * $cards_per_player;
    $num_decks_needed = ceil($cards_per_round / 52);

    $full_deck = [];
    for ($i = 0; $i < $num_decks_needed; $i++) {
        $full_deck = array_merge($full_deck, $base_deck);
    }
    shuffle($full_deck);

    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id=? ORDER BY id ASC");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playerIdsResult = $stmt->get_result();

    $player_ids = [];
    while ($row = $playerIdsResult->fetch_assoc()) {
        $player_ids[] = $row['user_id'];
    }
    $stmt->close();

    $card_offset = 0;
    for ($i = 0; $i < count($player_ids); $i++) {
        $hand = array_slice($full_deck, $card_offset, $cards_per_player);
        $card_offset += $cards_per_player;

        $handJson = json_encode($hand);

        $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand = ? WHERE room_id = ? AND user_id = ?");
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
        $aiPhone = "ai_player_" . ($currentPlayers + $i); // Make AI names unique
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

function submitPlayerHand($conn, $userId, $roomId, $hand) {
    $handJson = json_encode($hand);
    $stmt = $conn->prepare("UPDATE room_players SET submitted_hand = ?, is_ready = 0 WHERE user_id = ? AND room_id = ?");
    $stmt->bind_param("sii", $handJson, $userId, $roomId);
    $stmt->execute();
    $stmt->close();

    // Check if all players have submitted their hands
    $stmt = $conn->prepare("SELECT COUNT(*) as total_players, SUM(CASE WHEN submitted_hand IS NOT NULL THEN 1 ELSE 0 END) as submitted_players FROM room_players WHERE room_id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($result['total_players'] > 0 && $result['total_players'] === $result['submitted_players']) {
        // All players have submitted, process scores and check for next round or game end
        $roomStmt = $conn->prepare("SELECT current_round, total_rounds FROM game_rooms WHERE id = ?");
        $roomStmt->bind_param("i", $roomId);
        $roomStmt->execute();
        $room = $roomStmt->get_result()->fetch_assoc();
        $roomStmt->close();

        // (Score calculation logic will be added here later)

        if ($room['current_round'] < $room['total_rounds']) {
            // Advance to the next round
            $nextRound = $room['current_round'] + 1;
            $updateRoomStmt = $conn->prepare("UPDATE game_rooms SET current_round = ?, status = 'arranging' WHERE id = ?");
            $updateRoomStmt->bind_param("ii", $nextRound, $roomId);
            $updateRoomStmt->execute();
            $updateRoomStmt->close();

            // Clear submitted hands for the next round
            $clearHandsStmt = $conn->prepare("UPDATE room_players SET submitted_hand = NULL, is_ready = 0 WHERE room_id = ?");
            $clearHandsStmt->bind_param("i", $roomId);
            $clearHandsStmt->execute();
            $clearHandsStmt->close();
        } else {
            // All rounds finished
            $stmt = $conn->prepare("UPDATE game_rooms SET status='finished' WHERE id=?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $stmt->close();
        }
    } else {
        // Not all players have submitted yet, just update status
        $stmt = $conn->prepare("UPDATE room_players SET is_ready = 0 WHERE user_id = ? AND room_id = ?");
        $stmt->bind_param("ii", $userId, $roomId);
        $stmt->execute();
        $stmt->close();
    }
}
?>

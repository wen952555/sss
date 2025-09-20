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
        // All players have submitted, calculate scores
        $stmt = $conn->prepare("SELECT user_id, submitted_hand FROM room_players WHERE room_id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $playersResult = $stmt->get_result();
        $players = [];
        while ($row = $playersResult->fetch_assoc()) {
            $players[] = [
                'id' => $row['user_id'],
                'hand' => json_decode($row['submitted_hand'], true)
            ];
        }
        $stmt->close();

        $scores = array_fill_keys(array_column($players, 'id'), 0);

        for ($i = 0; $i < count($players); $i++) {
            for ($j = $i + 1; $j < count($players); $j++) {
                $p1 = $players[$i];
                $p2 = $players[$j];

                $scoreResult = calculateSinglePairScorePhp($p1['hand'], $p2['hand']);
                $pairScore = $scoreResult['total_score'];
                $laneResults = $scoreResult['lane_results'];

                $scores[$p1['id']] += $pairScore;
                $scores[$p2['id']] -= $pairScore;

                foreach ($laneResults as $lane => $laneResult) {
                    $stmt = $conn->prepare("INSERT INTO game_hand_comparisons (room_id, player1_id, player2_id, lane, result, score_change) VALUES (?, ?, ?, ?, ?, ?)");
                    $stmt->bind_param("iiisss", $roomId, $p1['id'], $p2['id'], $lane, $laneResult['result'], $laneResult['score_change']);
                    $stmt->execute();
                    $stmt->close();
                }
            }
        }

        foreach ($scores as $userId => $score) {
            $stmt = $conn->prepare("UPDATE room_players SET score = ? WHERE room_id = ? AND user_id = ?");
            $stmt->bind_param("iii", $score, $roomId, $userId);
            $stmt->execute();
            $stmt->close();
        }

        // All players have submitted, game is finished
        $stmt = $conn->prepare("UPDATE game_rooms SET status='finished' WHERE id=?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $stmt->close();
    } else {
        // Not all players have submitted yet, just update status
        $stmt = $conn->prepare("UPDATE room_players SET is_ready = 0 WHERE user_id = ? AND room_id = ?");
        $stmt->bind_param("ii", $userId, $roomId);
        $stmt->execute();
        $stmt->close();
    }
}

require_once __DIR__ . '/scorer.php';
?>

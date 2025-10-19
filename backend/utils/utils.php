<?php
// backend/utils/utils.php

/**
 * Fills the remaining slots in a room with AI players.
 * This simplified version creates new AI users without checking for existence first,
 * which is suitable for a test/dev environment.
 */
function fillWithAI($conn, $roomId, $playersNeeded) {
    $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id=?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
    $stmt->close();

    $aiToCreate = $playersNeeded - $currentPlayers;
    if ($aiToCreate <= 0) return;

    for ($i = 0; $i < $aiToCreate; $i++) {
        // Using uniqid to ensure the AI phone is unique and avoids collisions.
        $aiPhone = "ai_player_" . uniqid();

        $insertStmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, '', 1000)");
        $insertStmt->bind_param("s", $aiPhone);
        $insertStmt->execute();
        $aiId = $insertStmt->insert_id;
        $insertStmt->close();

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

function generate_unique_room_code($conn) {
    do {
        $room_code = substr(str_shuffle('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 1, 6);
        $stmt = $conn->prepare("SELECT id FROM game_rooms WHERE room_code = ?");
        $stmt->bind_param("s", $room_code);
        $stmt->execute();
        $result = $stmt->get_result();
        $stmt->close();
    } while ($result->num_rows > 0);
    return $room_code;
}

require_once __DIR__ . '/scorer.php';
?>
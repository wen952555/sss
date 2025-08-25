<?php
// Simplified player_action.php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/../utils/utils.php';
require_once __DIR__ . '/../utils/scorer.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['userId'] ?? 0);
$roomId = (int)($input['roomId'] ?? 0);
$action = $input['action'] ?? '';

if (!$userId || !$roomId || !$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing parameters.']);
    exit;
}

$conn->begin_transaction();
try {
    if ($action === 'ready') {
        // Set player to ready
        $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1 WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();

        // Get room info
        $stmt = $conn->prepare("SELECT game_type, players_count FROM game_rooms WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $room = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$room) throw new Exception("Room not found.");

        // Check current number of players in this room
        $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
        $stmt->close();

        // If this room is not full, fill it with AI
        if ($currentPlayers < $room['players_count']) {
            fillWithAI($conn, $roomId, $room['game_type'], $room['players_count']);
        }

        // Check if room is now full and all are ready
        $stmt = $conn->prepare("SELECT COUNT(*) as ready_players FROM room_players WHERE room_id = ? AND is_ready = 1");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $readyPlayers = $stmt->get_result()->fetch_assoc()['ready_players'];
        $stmt->close();

        if ($readyPlayers == $room['players_count']) {
            dealCards($conn, $roomId, $room['game_type'], $room['players_count']);
        }

    } elseif ($action === 'unready') {
        // Set player to not ready
        $stmt = $conn->prepare("UPDATE room_players SET is_ready = 0 WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("ii", $roomId, $userId);
        $stmt->execute();
        $stmt->close();
    } elseif ($action === 'submit_hand') {
        $hand = $input['hand'] ?? null;
        if (!$hand) throw new Exception("Hand data is missing.");
        $handJson = json_encode($hand);

        $stmt = $conn->prepare("UPDATE room_players SET submitted_hand = ?, is_ready = 1 WHERE room_id = ? AND user_id = ?");
        $stmt->bind_param("sii", $handJson, $roomId, $userId);
        $stmt->execute();
        $stmt->close();

        // Check if all players have submitted their hands
        $stmt = $conn->prepare("SELECT COUNT(*) as submitted_players FROM room_players WHERE room_id = ? AND submitted_hand IS NOT NULL");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $submittedPlayers = $stmt->get_result()->fetch_assoc()['submitted_players'];
        $stmt->close();

        $stmt = $conn->prepare("SELECT players_count FROM game_rooms WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $playersNeeded = $stmt->get_result()->fetch_assoc()['players_count'];
        $stmt->close();

        if ($submittedPlayers == $playersNeeded) {
            // All players have submitted, let's score the game
            $stmt = $conn->prepare("SELECT user_id, submitted_hand FROM room_players WHERE room_id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $result = $stmt->get_result();
            $players_data = [];
            while($row = $result->fetch_assoc()) {
                $players_data[] = [
                    'id' => $row['user_id'],
                    'hand' => json_decode($row['submitted_hand'], true)
                ];
            }
            $stmt->close();

            // Determine game type to call the correct scorer
            $stmt = $conn->prepare("SELECT game_type FROM game_rooms WHERE id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $game_type = $stmt->get_result()->fetch_assoc()['game_type'];
            $stmt->close();

            require_once __DIR__ . '/../utils/poker_evaluator.php';

            function combinations($arr, $k) {
                if ($k == 0) return [[]];
                if (count($arr) < $k) return [];
                $first = $arr[0];
                $remaining = array_slice($arr, 1);
                $combs_with_first = [];
                $combs_without_first = combinations($remaining, $k);
                $combs_of_remaining = combinations($remaining, $k - 1);
                foreach ($combs_of_remaining as $comb) {
                    $combs_with_first[] = array_merge([$first], $comb);
                }
                return array_merge($combs_with_first, $combs_without_first);
            }

            function get_best_5_from_8($cards) {
                if (count($cards) < 5) return null;
                $best_eval = null;
                $card_combinations = combinations($cards, 5);
                foreach ($card_combinations as $hand_str_array) {
                    $current_hand_obj = array_map('parseCard', $hand_str_array);
                    $current_eval = evaluateHand($current_hand_obj);
                    if ($best_eval === null || compareHands($current_eval, $best_eval) > 0) {
                        $best_eval = $current_eval;
                    }
                }
                return $best_eval;
            }

            $player_evaluations = [];
            foreach ($players_data as $player) {
                if ($game_type === 'eight') {
                    $player_evaluations[$player['id']] = get_best_5_from_8($player['hand']['middle']);
                } else {
                    // SSS logic (not implemented in this fix)
                    $player_evaluations[$player['id']] = null;
                }
            }

            $hand_type_scores = [
                '高牌' => 1, '对子' => 2, '两对' => 3, '三条' => 4, '顺子' => 5,
                '同花' => 6, '葫芦' => 7, '铁支' => 8, '同花顺' => 10,
            ];

            $scores = [];
            $player_ids = array_keys($player_evaluations);
            for ($i = 0; $i < count($player_ids); $i++) {
                $p1_id = $player_ids[$i];
                $total_score = 0;
                for ($j = 0; $j < count($player_ids); $j++) {
                    if ($i === $j) continue;
                    $p2_id = $player_ids[$j];
                    $p1_eval = $player_evaluations[$p1_id];
                    $p2_eval = $player_evaluations[$p2_id];
                    if ($p1_eval && $p2_eval) {
                        $comparison = compareHands($p1_eval, $p2_eval);
                        if ($comparison > 0) {
                            $total_score += $hand_type_scores[$p1_eval['name']] ?? 1;
                        }
                        if ($comparison < 0) {
                            $total_score -= $hand_type_scores[$p2_eval['name']] ?? 1;
                        }
                    }
                }
                $scores[$p1_id] = $total_score;
            }

            // Update scores and points
            foreach($scores as $pId => $score) {
                $stmt = $conn->prepare("UPDATE room_players SET score = ? WHERE room_id = ? AND user_id = ?");
                $stmt->bind_param("iii", $score, $roomId, $pId);
                $stmt->execute();
                $stmt->close();

                if ($pId > 0) { // Only update points for real users
                    $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
                    $stmt->bind_param("ii", $score, $pId);
                    $stmt->execute();
                    $stmt->close();
                }
            }

            // Finish the game
            $stmt = $conn->prepare("UPDATE game_rooms SET status = 'finished' WHERE id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $stmt->close();
        }
    }

    $conn->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
$conn->close();
?>

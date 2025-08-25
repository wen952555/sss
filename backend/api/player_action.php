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

            // THIS IS THE NEW LOGIC
            require_once __DIR__ . '/../utils/poker_evaluator.php';

            function get_best_5_from_8($cards) {
                if (count($cards) < 5) return null;
                $best_hand = null;
                $best_eval = null;

                // Simple combination logic for brevity in this context
                $combinations = [
                    [0,1,2,3,4], [0,1,2,3,5], [0,1,2,3,6], [0,1,2,3,7],
                    [0,1,2,4,5], [0,1,2,4,6], [0,1,2,4,7], [0,1,2,5,6],
                    [0,1,2,5,7], [0,1,2,6,7], [0,1,3,4,5], [0,1,3,4,6],
                    [0,1,3,4,7], [0,1,3,5,6], [0,1,3,5,7], [0,1,3,6,7],
                    [0,1,4,5,6], [0,1,4,5,7], [0,1,4,6,7], [0,1,5,6,7],
                    [0,2,3,4,5], [0,2,3,4,6], [0,2,3,4,7], [0,2,3,5,6],
                    [0,2,3,5,7], [0,2,3,6,7], [0,2,4,5,6], [0,2,4,5,7],
                    [0,2,4,6,7], [0,2,5,6,7], [0,3,4,5,6], [0,3,4,5,7],
                    [0,3,4,6,7], [0,3,5,6,7], [0,4,5,6,7], [1,2,3,4,5],
                    [1,2,3,4,6], [1,2,3,4,7], [1,2,3,5,6], [1,2,3,5,7],
                    [1,2,3,6,7], [1,2,4,5,6], [1,2,4,5,7], [1,2,4,6,7],
                    [1,2,5,6,7], [1,3,4,5,6], [1,3,4,5,7], [1,3,4,6,7],
                    [1,3,5,6,7], [1,4,5,6,7], [2,3,4,5,6], [2,3,4,5,7],
                    [2,3,4,6,7], [2,3,5,6,7], [2,4,5,6,7], [3,4,5,6,7]
                ];

                foreach ($combinations as $indices) {
                    $current_hand_str = array_map(function($i) use ($cards) { return $cards[$i]; }, $indices);
                    $current_hand_obj = array_map('parseCard', $current_hand_str);
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
                    // SSS logic would be more complex
                    $player_evaluations[$player['id']] = null;
                }
            }

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
                        if ($comparison > 0) $total_score++;
                        if ($comparison < 0) $total_score--;
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

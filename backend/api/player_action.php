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

            $scores = [];
            for ($i = 0; $i < count($players_data); $i++) {
                $total_score = 0;
                for ($j = 0; $j < count($players_data); $j++) {
                    if ($i === $j) continue;

                    if ($game_type === 'eight') {
                        $total_score += calculateEightCardSinglePairScore($players_data[$i]['hand'], $players_data[$j]['hand']);
                    } else { // Default to thirteen (SSS)
                        $total_score += calculateSinglePairScore($players_data[$i]['hand'], $players_data[$j]['hand']);
                    }
                }
                $scores[$players_data[$i]['id']] = $total_score;
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

<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';
require_once __DIR__ . '/../../utils/scorer.php';

$data = json_decode(file_get_contents('php://input'), true);

$userId = $data['userId'] ?? null;
$roomId = $data['roomId'] ?? null;
$action = $data['action'] ?? null;

if (!$userId || !$roomId || !$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters.']);
    exit;
}

$conn = db_connect();
if (!$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}

$response = ['success' => false, 'message' => 'Invalid action.'];

$conn->begin_transaction();

try {
    switch ($action) {
        case 'submit_hand':
            $hand = $data['hand'] ?? null;
            if (!$hand) {
                throw new Exception("Hand data is missing.");
            }

            if (isSssFoul($hand)) {
                throw new Exception("倒水！Your hand is not valid.");
            }

            $handJson = json_encode($hand);
            $stmt = $conn->prepare("UPDATE room_players SET submitted_hand = ? WHERE user_id = ? AND room_id = ?");
            $stmt->bind_param("sii", $handJson, $userId, $roomId);
            $stmt->execute();
            $stmt->close();

            // Check if all players have submitted their hands
            $stmt = $conn->prepare("SELECT player_count FROM game_rooms WHERE id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $playerCount = $stmt->get_result()->fetch_assoc()['player_count'];
            $stmt->close();

            $stmt = $conn->prepare("SELECT COUNT(*) as submitted_count FROM room_players WHERE room_id = ? AND submitted_hand IS NOT NULL");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $submittedCount = $stmt->get_result()->fetch_assoc()['submitted_count'];
            $stmt->close();

            if ($submittedCount === $playerCount) {
                // All hands are in, calculate scores and finish the game
                $stmt = $conn->prepare("SELECT user_id, submitted_hand FROM room_players WHERE room_id = ?");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $result = $stmt->get_result();
                $players = [];
                while ($row = $result->fetch_assoc()) {
                    $players[] = [
                        'id' => $row['user_id'],
                        'hand' => json_decode($row['submitted_hand'], true)
                    ];
                }
                $stmt->close();

                $scores = [];
                foreach ($players as $p) {
                    $scores[$p['id']] = 0;
                }

                for ($i = 0; $i < count($players); $i++) {
                    for ($j = $i + 1; $j < count($players); $j++) {
                        $p1 = $players[$i];
                        $p2 = $players[$j];
                        $pair_score = calculateSinglePairScore($p1['hand'], $p2['hand']);
                        $scores[$p1['id']] += $pair_score;
                        $scores[$p2['id']] -= $pair_score;
                    }
                }

                foreach ($scores as $pId => $finalScore) {
                    $stmt = $conn->prepare("UPDATE room_players SET score = ? WHERE user_id = ? AND room_id = ?");
                    $stmt->bind_param("iii", $finalScore, $pId, $roomId);
                    $stmt->execute();
                    $stmt->close();
                }

                // Update game room status to finished
                $stmt = $conn->prepare("UPDATE game_rooms SET status = 'finished' WHERE id = ?");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $stmt->close();
            }

            $response = ['success' => true, 'message' => 'Hand submitted successfully.'];
            break;

        default:
            http_response_code(400);
            $response = ['success' => false, 'message' => 'Unknown action.'];
            break;
    }
    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    $response = ['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()];
}

$conn->close();

echo json_encode($response);
?>

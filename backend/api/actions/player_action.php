<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';
require_once __DIR__ . '/../../utils/pre_dealer.php';

$userId = $_POST['userId'] ?? null;
$roomId = $_POST['roomId'] ?? null;
$action = $_POST['action'] ?? null;

if (!$userId || !$roomId || !$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters (userId, roomId, action).']);
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
        case 'prepare':
        case 'ready':
            $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1 WHERE user_id = ? AND room_id = ?");
            $stmt->bind_param("ii", $userId, $roomId);
            $stmt->execute();
            $stmt->close();

            // Check if all players are ready
            $stmt = $conn->prepare("SELECT COUNT(*) as total_players, SUM(is_ready) as ready_players FROM room_players WHERE room_id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            $response = ['success' => true, 'message' => 'Player is ready.'];

            if ($result['ready_players'] >= 4 && $result['ready_players'] == $result['total_players']) {
                $playerCount = $result['total_players'];

                // Fetch a pre-dealt hand
                $stmt = $conn->prepare("SELECT id, hands FROM pre_dealt_hands WHERE player_count = ? AND is_used = 0 ORDER BY RAND() LIMIT 1");
                $stmt->bind_param("i", $playerCount);
                $stmt->execute();
                $preDealtHand = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                if (!$preDealtHand) {
                    // No pre-dealt hands available, create one on the fly
                    $hands = deal_new_game($playerCount);
                } else {
                    $hands = json_decode($preDealtHand['hands'], true);
                    // Mark the hand as used
                    $stmt = $conn->prepare("UPDATE pre_dealt_hands SET is_used = 1 WHERE id = ?");
                    $stmt->bind_param("i", $preDealtHand['id']);
                    $stmt->execute();
                    $stmt->close();
                }

                // Distribute hands to players
                $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id = ? ORDER BY id ASC");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $playerIdsResult = $stmt->get_result();
                $player_ids = [];
                while ($row = $playerIdsResult->fetch_assoc()) {
                    $player_ids[] = $row['user_id'];
                }
                $stmt->close();

                $userHand = null;
                for ($i = 0; $i < count($player_ids); $i++) {
                    $handJson = json_encode($hands[$i]);
                    $stmt = $conn->prepare("UPDATE room_players SET initial_hand = ? WHERE room_id = ? AND user_id = ?");
                    $stmt->bind_param("sii", $handJson, $roomId, $player_ids[$i]);
                    $stmt->execute();
                    $stmt->close();
                    if ($player_ids[$i] == $userId) {
                        $userHand = $hands[$i];
                    }
                }

                // Update room status
                $stmt = $conn->prepare("UPDATE game_rooms SET status = 'arranging' WHERE id = ?");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $stmt->close();

                // Replenish hands in the background
                $php_path = '/usr/bin/php';
                $replenish_script_path = __DIR__ . '/../../utils/pre_dealer.php';
                exec("$php_path $replenish_script_path > /dev/null 2>&1 &");

                $response['cardsDealt'] = true;
                $response['hand'] = $userHand;
            }
            break;

        case 'unready':
            $stmt = $conn->prepare("UPDATE room_players SET is_ready = 0 WHERE user_id = ? AND room_id = ?");
            $stmt->bind_param("ii", $userId, $roomId);
            $stmt->execute();
            $stmt->close();
            $response = ['success' => true, 'message' => 'Player is no longer ready.'];
            break;

        case 'submit_hand':
            $hand = isset($_POST['hand']) ? json_decode($_POST['hand'], true) : null;
            if (!$hand) {
                throw new Exception("Hand data is missing.");
            }
            submitPlayerHand($conn, $userId, $roomId, $hand);
            $response = ['success' => true, 'message' => 'Hand submitted successfully.'];
            break;

        default:
            http_response_code(400);
            $response = ['success' => false, 'message' => 'Unknown action provided.'];
            break;
    }
    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    $response = ['success' => false, 'message' => $e->getMessage()];
}

$conn->close();

echo json_encode($response);
?>

<?php
require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../../utils/utils.php';
require_once __DIR__ . '/../../utils/pre_dealer.php';
require_once __DIR__ . '/../../utils/auto_sorter.php';

// Use json_decode for all incoming requests.
$post_data = json_decode(file_get_contents("php://input"), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input.']);
    exit;
}

$userId = $post_data['userId'] ?? null;
$roomId = $post_data['roomId'] ?? null;
$action = $post_data['action'] ?? null;

if (!$userId || !$roomId || !$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters (userId, roomId, action).']);
    exit;
}

$conn = null;
try {
    $conn = db_connect();
    $conn->begin_transaction();

    $response = ['success' => false, 'message' => 'Invalid action.'];

    switch ($action) {
        case 'prepare':
        case 'ready':
            $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1 WHERE user_id = ? AND room_id = ?");
            $stmt->bind_param("ii", $userId, $roomId);
            $stmt->execute();
            $stmt->close();

            $response = ['success' => true, 'message' => 'Player is ready.'];

            // Get room's required player count
            $stmt = $conn->prepare("SELECT player_count FROM game_rooms WHERE id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $roomResult = $stmt->get_result()->fetch_assoc();
            $playerCount = $roomResult['player_count'];
            $stmt->close();

            // Get current human player stats
            $stmt = $conn->prepare("SELECT COUNT(user_id) as total_humans, SUM(is_ready) as ready_humans FROM room_players WHERE room_id = ? AND is_auto_managed = 0");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $humanPlayerStats = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            // If all human players are ready, fill the rest with AI
            if (($humanPlayerStats['total_humans'] ?? 0) > 0 && $humanPlayerStats['total_humans'] == ($humanPlayerStats['ready_humans'] ?? 0)) {
                $stmt = $conn->prepare("SELECT COUNT(user_id) as total_players FROM room_players WHERE room_id = ?");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $totalPlayers = $stmt->get_result()->fetch_assoc()['total_players'];
                $stmt->close();

                $neededAi = $playerCount - $totalPlayers;
                if ($neededAi > 0) {
                    $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id = ?");
                    $stmt->bind_param("i", $roomId);
                    $stmt->execute();
                    $existingPlayersResult = $stmt->get_result();
                    $existingPlayerIds = [];
                    while ($row = $existingPlayersResult->fetch_assoc()) {
                        $existingPlayerIds[] = $row['user_id'];
                    }
                    $stmt->close();

                    // Find available AI players from the users table
                    $aiQuery = "SELECT id FROM users WHERE is_ai = 1 AND id NOT IN (" . implode(',', array_map('intval', $existingPlayerIds)) . ") LIMIT ?";
                    $stmt = $conn->prepare($aiQuery);
                    $stmt->bind_param("i", $neededAi);
                    $stmt->execute();
                    $availableAiResult = $stmt->get_result();
                    $aiIdsToAdd = [];
                    while ($row = $availableAiResult->fetch_assoc()) {
                        $aiIdsToAdd[] = $row['id'];
                    }
                    $stmt->close();

                    if (!empty($aiIdsToAdd)) {
                        $insertStmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 1, 1)");
                        foreach ($aiIdsToAdd as $aiId) {
                            $insertStmt->bind_param("ii", $roomId, $aiId);
                            $insertStmt->execute();
                        }
                        $insertStmt->close();
                    }
                }
            }

            // Check if all players are ready now that AI might have been added
            $stmt = $conn->prepare("SELECT COUNT(*) as total_players, SUM(is_ready) as ready_players FROM room_players WHERE room_id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (isset($result['total_players']) && $result['total_players'] == $playerCount && $result['ready_players'] == $playerCount) {
                // All players are ready, let's deal
                // Fetch a pre-dealt hand
                $stmt = $conn->prepare("SELECT id, hands FROM pre_dealt_hands WHERE player_count = ? AND is_used = 0 ORDER BY RAND() LIMIT 1");
                $stmt->bind_param("i", $playerCount);
                $stmt->execute();
                $preDealtHand = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                $hand_id = null;
                if (!$preDealtHand) {
                    // No pre-dealt hands available, create one on the fly and save it
                    $hands = deal_new_game($playerCount);
                    $handsJson = json_encode($hands);
                    $insertStmt = $conn->prepare("INSERT INTO pre_dealt_hands (player_count, hands, is_used) VALUES (?, ?, 1)");
                    $insertStmt->bind_param("is", $playerCount, $handsJson);
                    $insertStmt->execute();
                    $hand_id = $insertStmt->insert_id;
                    $insertStmt->close();
                } else {
                    $hand_id = $preDealtHand['id'];
                    $hands = json_decode($preDealtHand['hands'], true);
                    // Mark the hand as used
                    $stmt = $conn->prepare("UPDATE pre_dealt_hands SET is_used = 1 WHERE id = ?");
                    $stmt->bind_param("i", $hand_id);
                    $stmt->execute();
                    $stmt->close();
                }

                // Store the hand_id in the game_rooms table
                $stmt = $conn->prepare("UPDATE game_rooms SET current_hand_id = ? WHERE id = ?");
                $stmt->bind_param("ii", $hand_id, $roomId);
                $stmt->execute();
                $stmt->close();

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

                // Securely replenish hands
                replenish_pre_dealt_hands();

                $response['cardsDealt'] = true;
                $response['hand'] = auto_sort_hand($userHand);
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
            $hand = $post_data['hand'] ?? null;
            if (!$hand) {
                throw new Exception("Hand data is missing or invalid.");
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
    if ($conn) {
        $conn->rollback();
    }
    http_response_code(400);
    $response = ['success' => false, 'message' => $e->getMessage()];
} finally {
    if ($conn) {
        $conn->close();
    }
}

echo json_encode($response);
?>
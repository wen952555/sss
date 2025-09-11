<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

// All API requests will be routed through this file based on the 'action' parameter.
require_once __DIR__ . '/../utils/utils.php';
// Scorer.php is no longer needed as the functions are moved inline.
// require_once __DIR__ . '/../utils/scorer.php';

$action = $_REQUEST['action'] ?? '';

switch ($action) {
    case 'get_online_count':
        $onlineCount = 0;
        $query = "
            SELECT COUNT(DISTINCT id) as onlineCount
            FROM users
            WHERE last_active > NOW() - INTERVAL 5 MINUTE
              AND phone NOT LIKE 'guest_%'
              AND phone NOT LIKE 'ai_player_%'
        ";
        $result = $conn->query($query);
        if ($result) {
            $row = $result->fetch_assoc();
            $onlineCount = (int)$row['onlineCount'];
            $result->free();

            if ($onlineCount === 0) {
                // If no one is online, clean up all rooms.
                $conn->query("DELETE FROM room_players");
                $conn->query("DELETE FROM game_rooms");
            }
        }
        echo json_encode(['success' => true, 'onlineCount' => $onlineCount]);
        $conn->close();
        break;

    case 'player_action':
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = (int)($input['userId'] ?? 0);
        $roomId = (int)($input['roomId'] ?? 0);
        $sub_action = $input['action'] ?? '';

        if (!$userId || !$roomId || !$sub_action) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing parameters for player action.']);
            exit;
        }

        $conn->begin_transaction();
        try {
            $response = ['success' => true];

            // Get room details first to decide on the logic path
            $stmt = $conn->prepare("SELECT game_type, game_mode, players_count FROM game_rooms WHERE id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $room = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$room) {
                throw new Exception("Room not found.");
            }

            // --- Logic for 4-Player Normal Thirteen Game ---
            if ($room['game_type'] === 'thirteen' && (int)$room['players_count'] === 4) {
                if ($sub_action === 'ready') {
                    $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1 WHERE room_id = ? AND user_id = ?");
                    $stmt->bind_param("ii", $roomId, $userId);
                    $stmt->execute();
                    $stmt->close();

                    // Check if all players are ready
                    $stmt = $conn->prepare("SELECT COUNT(*) as ready_players FROM room_players WHERE room_id = ? AND is_ready = 1");
                    $stmt->bind_param("i", $roomId);
                    $stmt->execute();
                    $readyPlayers = $stmt->get_result()->fetch_assoc()['ready_players'];
                    $stmt->close();

                    if ($readyPlayers === 4) {
                        dealCards($conn, $roomId, 4);
                    }
                } elseif ($sub_action === 'unready') {
                    $stmt = $conn->prepare("UPDATE room_players SET is_ready = 0 WHERE room_id = ? AND user_id = ?");
                    $stmt->bind_param("ii", $roomId, $userId);
                    $stmt->execute();
                    $stmt->close();
                }
            }
            // --- Placeholder for 8-Player Logic ---
            elseif ($room['game_type'] === 'thirteen' && (int)$room['players_count'] === 8) {
                // TODO: Implement separate logic for 8-player games
                // For now, it can reuse the 4-player logic if it's identical
                if ($sub_action === 'ready') {
                    // ... (logic for 8 players) ...
                }
            }
            // --- Placeholder for Double-Points Game Logic ---
            elseif ($room['game_type'] === 'thirteen-5') {
                 // TODO: Implement separate logic for double-points games
                 if ($sub_action === 'ready') {
                    // ... (logic for double-points games) ...
                 }
            }

            // --- Common logic for submitting hands (can also be separated if needed) ---
            if ($sub_action === 'submit_hand') {
                $hand = $input['hand'] ?? null;
                if (!$hand) throw new Exception("Hand data is missing.");
                $handJson = json_encode($hand);
                $stmt = $conn->prepare("UPDATE room_players SET submitted_hand = ?, is_ready = 1 WHERE room_id = ? AND user_id = ?");
                $stmt->bind_param("sii", $handJson, $roomId, $userId);
                $stmt->execute();
                $stmt->close();
                $stmt = $conn->prepare("SELECT COUNT(*) as submitted_players FROM room_players WHERE room_id = ? AND submitted_hand IS NOT NULL");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $submittedPlayers = $stmt->get_result()->fetch_assoc()['submitted_players'];
                $stmt->close();
                $stmt = $conn->prepare("SELECT game_type, players_count FROM game_rooms WHERE id = ?");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $roomDetails = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                $playersNeeded = $roomDetails['players_count'];
                $gameType = $roomDetails['game_type'];

                if ($submittedPlayers == $playersNeeded) {
                    // Define point multipliers
                    $pointMultiplier = 1;
                    if ($gameType === 'thirteen') {
                        $pointMultiplier = 2;
                    } else if ($gameType === 'thirteen-5') {
                        $pointMultiplier = 5;
                    }

                    // --- Main scoring execution ---
                    require_once __DIR__ . '/../utils/scorer.php';
                    $stmt = $conn->prepare("SELECT user_id, submitted_hand FROM room_players WHERE room_id = ?");
                    $stmt->bind_param("i", $roomId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $players_data = [];
                    while($row = $result->fetch_assoc()) {
                        $players_data[$row['user_id']] = json_decode($row['submitted_hand'], true);
                    }
                    $stmt->close();

                    $player_ids = array_keys($players_data);
                    $scores = array_fill_keys($player_ids, 0);

                    for ($i = 0; $i < count($player_ids); $i++) {
                        for ($j = $i + 1; $j < count($player_ids); $j++) {
                            $p1_id = $player_ids[$i];
                            $p2_id = $player_ids[$j];
                            $p1_hand = $players_data[$p1_id];
                            $p2_hand = $players_data[$p2_id];
                            $pair_score = calculateSinglePairScore($p1_hand, $p2_hand);
                            $scores[$p1_id] += $pair_score;
                            $scores[$p2_id] -= $pair_score;
                        }
                    }

                    foreach($scores as $pId => $score) {
                        $finalScore = $score * $pointMultiplier;
                        $stmt = $conn->prepare("UPDATE room_players SET score = ? WHERE room_id = ? AND user_id = ?");
                        $stmt->bind_param("iii", $finalScore, $roomId, $pId);
                        $stmt->execute();
                        $stmt->close();
                        if ($pId > 0) {
                            $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
                            $stmt->bind_param("ii", $finalScore, $pId);
                            $stmt->execute();
                            $stmt->close();
                        }
                    }

                    $stmt = $conn->prepare("UPDATE game_rooms SET status = 'finished' WHERE id = ?");
                    $stmt->bind_param("i", $roomId);
                    $stmt->execute();
                    $stmt->close();
                }
            }
            $conn->commit();
            echo json_encode($response);
        } catch (Exception $e) {
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        $conn->close();
        break;

    case 'login':
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->phone) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '手机号和密码均不能为空']);
            exit;
        }
        $phone = $data->phone;
        $password = $data->password;
        $stmt = $conn->prepare("SELECT id, password, phone, points FROM users WHERE phone = ?");
        $stmt->bind_param("s", $phone);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 1) {
            $foundUser = $result->fetch_assoc();
            if (password_verify($password, $foundUser['password'])) {
                $userDataForFrontend = [
                    'id' => $foundUser['id'],
                    'phone' => $foundUser['phone'],
                    'points' => $foundUser['points']
                ];
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'userId' => $foundUser['id'],
                    'userData' => $userDataForFrontend
                ]);
            } else {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => '手机号或密码错误']);
            }
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '手机号或密码错误']);
        }
        $stmt->close();
        $conn->close();
        break;

    case 'transfer_points':
        $data = json_decode(file_get_contents("php://input"));
        $fromId = (int)($data->fromId ?? 0);
        $toId = (int)($data->toId ?? 0);
        $amount = (int)($data->amount ?? 0);

        if (!$fromId || !$toId || $amount <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid transfer parameters.']);
            exit;
        }

        $conn->begin_transaction();
        try {
            // Check sender's balance
            $stmt = $conn->prepare("SELECT points FROM users WHERE id = ? FOR UPDATE");
            $stmt->bind_param("i", $fromId);
            $stmt->execute();
            $sender = $stmt->get_result()->fetch_assoc();

            if (!$sender || $sender['points'] < $amount) {
                throw new Exception('Insufficient points.');
            }

            // Perform transfer
            $stmt = $conn->prepare("UPDATE users SET points = points - ? WHERE id = ?");
            $stmt->bind_param("ii", $amount, $fromId);
            $stmt->execute();

            $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
            $stmt->bind_param("ii", $amount, $toId);
            $stmt->execute();

            // Get updated user data for the sender
            $stmt = $conn->prepare("SELECT id, phone, points FROM users WHERE id = ?");
            $stmt->bind_param("i", $fromId);
            $stmt->execute();
            $updatedUser = $stmt->get_result()->fetch_assoc();

            $conn->commit();
            echo json_encode(['success' => true, 'updatedUser' => $updatedUser]);

        } catch (Exception $e) {
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Transfer failed: ' . $e->getMessage()]);
        }
        $stmt->close();
        $conn->close();
        break;

    case 'register':
        $data = json_decode(file_get_contents("php://input"));
        if (!isset($data->phone) || !isset($data->password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '手机号和密码均不能为空']);
            exit;
        }
        $phone = $data->phone;
        $password = $data->password;
        if (!preg_match('/^\d{11}$/', $phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '无效的手机号格式']);
            exit;
        }
        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '密码长度不能少于6位']);
            exit;
        }
        $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
        $stmt->bind_param("s", $phone);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows > 0) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => '该手机号已被注册']);
            $stmt->close();
            $conn->close();
            exit;
        }
        $stmt->close();
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, ?, ?)");
        $initialPoints = 1000;
        $stmt->bind_param("ssi", $phone, $passwordHash, $initialPoints);
        if ($stmt->execute()) {
            $newUserId = $stmt->insert_id;
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'userId' => $newUserId,
                'userData' => [
                    'id' => $newUserId,
                    'phone' => $phone,
                    'points' => $initialPoints
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '注册失败，请稍后再试。']);
        }
        $stmt->close();
        $conn->close();
        break;

    case 'match':
        $gameType = $_GET['gameType'] ?? 'thirteen';
        $gameMode = $_GET['gameMode'] ?? 'normal';
        $userId = (int)($_GET['userId'] ?? 0);
        $playerCount = (int)($_GET['playerCount'] ?? 0);

        if (!$userId) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '用户未登录，无法匹配。']);
            exit;
        }

        $playersNeeded = $playerCount > 0 ? $playerCount : 4;

        // Defensive override: Recalculate playersNeeded on the server from the gameMode string
        if (strpos($gameMode, '-') !== false) {
            $parts = explode('-', $gameMode);
            $num_from_mode = (int)$parts[0];
            if ($num_from_mode > 0) {
                $playersNeeded = $num_from_mode;
            }
        }

        $conn->begin_transaction();
        try {
            $roomId = null;
            $stmt = $conn->prepare("SELECT r.id FROM game_rooms r LEFT JOIN room_players rp ON r.id = rp.room_id WHERE r.status = 'matching' AND r.game_type = ? AND r.game_mode = ? AND r.players_count = ? GROUP BY r.id HAVING COUNT(rp.id) < ? LIMIT 1");
            $stmt->bind_param("ssii", $gameType, $gameMode, $playersNeeded, $playersNeeded);
            $stmt->execute();
            $room = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if ($room) {
                $roomId = $room['id'];
            } else {
                $roomCode = uniqid('room_');
                $stmt = $conn->prepare("INSERT INTO game_rooms (room_code, game_type, game_mode, status, players_count) VALUES (?, ?, ?, 'matching', ?)");
                $stmt->bind_param("sssi", $roomCode, $gameType, $gameMode, $playersNeeded);
                $stmt->execute();
                $roomId = $stmt->insert_id;
                $stmt->close();
            }
            $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 0, 0) ON DUPLICATE KEY UPDATE room_id = ?");
            $stmt->bind_param("iii", $roomId, $userId, $roomId);
            $stmt->execute();
            $stmt->close();
            $conn->commit();
            http_response_code(200);
            echo json_encode(['success' => true, 'roomId' => $roomId]);
        } catch (Exception $e) {
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '匹配时发生错误: ' . $e->getMessage()]);
        }
        $conn->close();
        break;

    case 'leave_room':
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = (int)($input['userId'] ?? 0);
        $roomId = (int)($input['roomId'] ?? 0);
        if ($userId && $roomId) {
            $stmt = $conn->prepare("DELETE FROM room_players WHERE room_id = ? AND user_id = ?");
            $stmt->bind_param("ii", $roomId, $userId);
            $stmt->execute();
            $stmt->close();
        }
        echo json_encode(['success' => true]);
        $conn->close();
        break;

    case 'find_user':
        $data = json_decode(file_get_contents("php://input"));
        $phone = $data->phone ?? '';
        if (empty($phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Phone number is required.']);
            exit;
        }
        $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
        $stmt->bind_param("s", $phone);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($user = $result->fetch_assoc()) {
            echo json_encode(['success' => true, 'userId' => $user['id']]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User not found.']);
        }
        $stmt->close();
        $conn->close();
        break;

    case 'game_status':
        $roomId = (int)($_GET['roomId'] ?? 0);
        $userId = (int)($_GET['userId'] ?? 0);

        if (!$roomId || !$userId) { echo json_encode(['success'=>false]); exit; }

        // Cleanup inactive players from the room (zombie players)
        // We only do this in the 'matching' or 'waiting' phase to not disrupt an ongoing game
        $roomStatusStmt = $conn->prepare("SELECT status FROM game_rooms WHERE id = ?");
        $roomStatusStmt->bind_param("i", $roomId);
        $roomStatusStmt->execute();
        $roomStatusResult = $roomStatusStmt->get_result()->fetch_assoc();
        $roomStatusStmt->close();

        if ($roomStatusResult && ($roomStatusResult['status'] === 'matching' || $roomStatusResult['status'] === 'waiting')) {
            $cleanupStmt = $conn->prepare("
                DELETE rp FROM room_players rp
                JOIN users u ON rp.user_id = u.id
                WHERE rp.room_id = ? AND u.last_active < NOW() - INTERVAL 2 MINUTE
            ");
            $cleanupStmt->bind_param("i", $roomId);
            $cleanupStmt->execute();
            $cleanupStmt->close();
        }

        // Update user's last active timestamp
        if ($userId > 0) {
            $updateStmt = $conn->prepare("UPDATE users SET last_active = NOW() WHERE id = ?");
            $updateStmt->bind_param("i", $userId);
            $updateStmt->execute();
            $updateStmt->close();
        }

        $stmt = $conn->prepare("SELECT status FROM game_rooms WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $room = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$room) { echo json_encode(['success'=>false]); exit; }

        $stmt = $conn->prepare("SELECT u.id, u.phone, rp.is_ready, rp.is_auto_managed FROM room_players rp JOIN users u ON rp.user_id = u.id WHERE rp.room_id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $playersResult = $stmt->get_result();
        $players = [];
        $aiCounter = 1;
        while($row = $playersResult->fetch_assoc()) {
            if ($row['is_auto_managed'] == 1) {
                $row['phone'] = '电脑玩家 ' . $aiCounter++;
            }
            $players[] = $row;
        }
        $stmt->close();

        $response = [
            'success' => true,
            'gameStatus' => $room['status'],
            'players' => $players
        ];

        if ($room['status'] === 'playing' || $room['status'] === 'arranging') {
            $stmt = $conn->prepare("SELECT initial_hand FROM room_players WHERE room_id = ? AND user_id = ?");
            $stmt->bind_param("ii", $roomId, $userId);
            $stmt->execute();
            $handResult = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if ($handResult) {
                $response['hand'] = json_decode($handResult['initial_hand'], true);
            }
        }
        if ($room['status'] === 'finished') {
            require_once __DIR__ . '/../utils/scorer.php';
            $stmt = $conn->prepare("SELECT u.id, u.phone as name, rp.submitted_hand, rp.score, rp.is_auto_managed FROM room_players rp JOIN users u ON rp.user_id = u.id WHERE rp.room_id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $resultPlayersResult = $stmt->get_result();
            $resultPlayers = [];
            $humanPlayerHand = null;

            while($row = $resultPlayersResult->fetch_assoc()) {
                $row['hand'] = json_decode($row['submitted_hand'], true);
                unset($row['submitted_hand']);
                if ($row['id'] == $userId) {
                    $humanPlayerHand = $row['hand'];
                }
                $resultPlayers[] = $row;
            }
            $stmt->close();

            if ($humanPlayerHand) {
                foreach ($resultPlayers as &$player) {
                    if ($player['id'] == $userId) {
                        $player['laneResults'] = ['draw', 'draw', 'draw'];
                        continue;
                    }
                    $laneResults = [];
                    foreach (['top', 'middle', 'bottom'] as $area) {
                        // Note: This compares the other player vs the human player.
                        // So a 'win' means the other player won that lane.
                        $cmp = compareSssArea($player['hand'][$area], $humanPlayerHand[$area], $area);
                        if ($cmp > 0) $laneResults[] = 'win';
                        else if ($cmp < 0) $laneResults[] = 'loss';
                        else $laneResults[] = 'draw';
                    }
                    $player['laneResults'] = $laneResults;
                }
                unset($player); // break the reference with the last element
            }

            $response['result'] = ['players' => $resultPlayers];
        }
        echo json_encode($response);
        $conn->close();
        break;

    case 'update_activity':
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = (int)($input['userId'] ?? 0);
        if ($userId > 0) {
            $stmt = $conn->prepare("UPDATE users SET last_active = NOW() WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $stmt->close();
        }
        echo json_encode(['success' => true]);
        $conn->close();
        break;

    default:
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Unknown API action provided.']);
        break;
}

// The connection will be closed by the individual action scripts
// or should be closed here if the logic is moved directly into the switch.
?>

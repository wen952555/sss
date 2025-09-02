<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

// All API requests will be routed through this file based on the 'action' parameter.
require_once __DIR__ . '/../utils/utils.php';
require_once __DIR__ . '/../utils/scorer.php';

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
        }
        echo json_encode(['success' => true, 'onlineCount' => $onlineCount]);
        $conn->close();
        break;

    case 'player_action':
        // This block is a combination of the logic from the original player_action.php
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
            if ($sub_action === 'ready') {
                $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1 WHERE room_id = ? AND user_id = ?");
                $stmt->bind_param("ii", $roomId, $userId);
                $stmt->execute();
                $stmt->close();
                $stmt = $conn->prepare("SELECT game_type, players_count FROM game_rooms WHERE id = ?");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $room = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                if (!$room) throw new Exception("Room not found.");
                $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id = ?");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
                $stmt->close();
                if ($currentPlayers < $room['players_count']) {
                    fillWithAI($conn, $roomId, $room['game_type'], $room['players_count']);
                }
                $stmt = $conn->prepare("SELECT COUNT(*) as ready_players FROM room_players WHERE room_id = ? AND is_ready = 1");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $readyPlayers = $stmt->get_result()->fetch_assoc()['ready_players'];
                $stmt->close();
                if ($readyPlayers == $room['players_count']) {
                    dealCards($conn, $roomId, $room['game_type'], $room['players_count']);
                }
            } elseif ($sub_action === 'unready') {
                $stmt = $conn->prepare("UPDATE room_players SET is_ready = 0 WHERE room_id = ? AND user_id = ?");
                $stmt->bind_param("ii", $roomId, $userId);
                $stmt->execute();
                $stmt->close();
            } elseif ($sub_action === 'submit_hand') {
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
                $stmt = $conn->prepare("SELECT players_count FROM game_rooms WHERE id = ?");
                $stmt->bind_param("i", $roomId);
                $stmt->execute();
                $playersNeeded = $stmt->get_result()->fetch_assoc()['players_count'];
                $stmt->close();
                if ($submittedPlayers == $playersNeeded) {
                    $stmt = $conn->prepare("SELECT user_id, submitted_hand FROM room_players WHERE room_id = ?");
                    $stmt->bind_param("i", $roomId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    $players_data = [];
                    while($row = $result->fetch_assoc()) {
                        $players_data[] = ['id' => $row['user_id'], 'hand' => json_decode($row['submitted_hand'], true)];
                    }
                    $stmt->close();
                    $stmt = $conn->prepare("SELECT game_type FROM game_rooms WHERE id = ?");
                    $stmt->bind_param("i", $roomId);
                    $stmt->execute();
                    $game_type = $stmt->get_result()->fetch_assoc()['game_type'];
                    $stmt->close();
                    require_once __DIR__ . '/../utils/poker_evaluator.php';
                    function combinations($arr, $k) { if ($k == 0) return [[]]; if (count($arr) < $k) return []; $first = $arr[0]; $remaining = array_slice($arr, 1); $combs_with_first = []; $combs_without_first = combinations($remaining, $k); $combs_of_remaining = combinations($remaining, $k - 1); foreach ($combs_of_remaining as $comb) { $combs_with_first[] = array_merge([$first], $comb); } return array_merge($combs_with_first, $combs_without_first); }
                    function get_best_5_from_8($cards) { if (count($cards) < 5) return null; $best_eval = null; $card_combinations = combinations($cards, 5); foreach ($card_combinations as $hand_str_array) { $current_hand_obj = array_map('parseCard', $hand_str_array); $current_eval = evaluateHand($current_hand_obj); if ($best_eval === null || compareHands($current_eval, $best_eval) > 0) { $best_eval = $current_eval; } } return $best_eval; }
                    $player_evaluations = [];
                    foreach ($players_data as $player) { if ($game_type === 'eight') { $player_evaluations[$player['id']] = get_best_5_from_8($player['hand']['middle']); } else { $player_evaluations[$player['id']] = null; } }
                    $hand_type_scores = [ '高牌' => 1, '对子' => 2, '两对' => 3, '三条' => 4, '顺子' => 5, '同花' => 6, '葫芦' => 7, '铁支' => 8, '同花顺' => 10, ];
                    $scores = [];
                    $player_ids = array_keys($player_evaluations);
                    for ($i = 0; $i < count($player_ids); $i++) { $p1_id = $player_ids[$i]; $total_score = 0; for ($j = 0; $j < count($player_ids); $j++) { if ($i === $j) continue; $p2_id = $player_ids[$j]; $p1_eval = $player_evaluations[$p1_id]; $p2_eval = $player_evaluations[$p2_id]; if ($p1_eval && $p2_eval) { $comparison = compareHands($p1_eval, $p2_eval); if ($comparison > 0) { $total_score += $hand_type_scores[$p1_eval['name']] ?? 1; } if ($comparison < 0) { $total_score -= $hand_type_scores[$p2_eval['name']] ?? 1; } } } $scores[$p1_id] = $total_score; }
                    foreach($scores as $pId => $score) { $stmt = $conn->prepare("UPDATE room_players SET score = ? WHERE room_id = ? AND user_id = ?"); $stmt->bind_param("iii", $score, $roomId, $pId); $stmt->execute(); $stmt->close(); if ($pId > 0) { $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?"); $stmt->bind_param("ii", $score, $pId); $stmt->execute(); $stmt->close(); } }
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

        if (!$userId) {
            $playersNeeded = $gameType === 'thirteen' ? 4 : 2;
            $conn->begin_transaction();
            try {
                $roomCode = uniqid('guest_room_');
                $stmt = $conn->prepare("INSERT INTO game_rooms (room_code, game_type, game_mode, status, players_count) VALUES (?, ?, ?, 'playing', ?)");
                $stmt->bind_param("sssi", $roomCode, $gameType, $gameMode, $playersNeeded);
                $stmt->execute();
                $roomId = $stmt->insert_id;
                $stmt->close();
                $guestPhone = "guest_" . uniqid();
                $stmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, '', 0)");
                $stmt->bind_param("s", $guestPhone);
                $stmt->execute();
                $guestUserId = $stmt->insert_id;
                $stmt->close();
                $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, is_ready, is_auto_managed) VALUES (?, ?, 1, 0)");
                $stmt->bind_param("ii", $roomId, $guestUserId);
                $stmt->execute();
                $stmt->close();
                fillWithAI($conn, $roomId, $gameType, $playersNeeded);
                dealCards($conn, $roomId, $gameType, $playersNeeded);
                $conn->commit();
                http_response_code(200);
                echo json_encode(['success' => true, 'roomId' => $roomId, 'guestUserId' => $guestUserId]);
            } catch (Exception $e) {
                $conn->rollback();
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Guest match failed: ' . $e->getMessage()]);
            }
        } else {
            $playersNeeded = $gameType === 'thirteen' ? 4 : 2;
            $conn->begin_transaction();
            try {
                $roomId = null;
                $stmt = $conn->prepare("SELECT r.id FROM game_rooms r LEFT JOIN room_players rp ON r.id = rp.room_id WHERE r.status = 'matching' AND r.game_type = ? AND r.game_mode = ? GROUP BY r.id HAVING COUNT(rp.id) < ? LIMIT 1");
                $stmt->bind_param("ssi", $gameType, $gameMode, $playersNeeded);
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
        }
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
        while($row = $playersResult->fetch_assoc()) {
            $players[] = $row;
        }
        $stmt->close();

        $response = [
            'success' => true,
            'gameStatus' => $room['status'],
            'players' => $players
        ];

        if ($room['status'] === 'playing') {
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
            $stmt = $conn->prepare("SELECT u.phone as name, rp.submitted_hand, rp.score, rp.is_auto_managed FROM room_players rp JOIN users u ON rp.user_id = u.id WHERE rp.room_id = ?");
            $stmt->bind_param("i", $roomId);
            $stmt->execute();
            $resultPlayersResult = $stmt->get_result();
            $resultPlayers = [];
            while($row = $resultPlayersResult->fetch_assoc()) {
                $row['hand'] = json_decode($row['submitted_hand'], true);
                unset($row['submitted_hand']);
                $resultPlayers[] = $row;
            }
            $stmt->close();
            $response['result'] = ['players' => $resultPlayers];
        }
        echo json_encode($response);
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

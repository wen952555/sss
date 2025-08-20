<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';
require_once '../utils/sssScorer.php';
require_once '../utils/eightCardScorer.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['userId'] ?? 0);
$roomId = (int)($input['roomId'] ?? 0);
$hand = $input['hand'] ?? null;

if (!$userId || !$roomId || !$hand) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '缺少参数']);
    exit;
}

$conn->begin_transaction();
try {
    // 1. 更新玩家状态和手牌
    $handJson = json_encode($hand);
    $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1, submitted_hand = ? WHERE room_id = ? AND user_id = ?");
    $stmt->bind_param("sii", $handJson, $roomId, $userId);
    $stmt->execute();
    $stmt->close();

    // 2. 检查是否所有人都已准备
    $stmt = $conn->prepare("SELECT COUNT(*) as ready_players, gr.players_count, gr.game_type, gr.game_mode FROM room_players rp JOIN game_rooms gr ON rp.room_id = gr.id WHERE rp.room_id = ? AND rp.is_ready = 1 GROUP BY gr.id");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $readyPlayers = $result['ready_players'] ?? 0;
    $playersNeeded = $result['players_count'] ?? 0;
    $gameType = $result['game_type'] ?? 'thirteen';
    $gameMode = $result['game_mode'] ?? 'normal';

    // 3. 如果全部准备，计算结果
    if ($readyPlayers == $playersNeeded) {
        // 获取所有玩家的手牌
        $stmt = $conn->prepare("SELECT user_id, submitted_hand FROM room_players WHERE room_id = ? ORDER BY id ASC");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $playersResult = $stmt->get_result();
        $players = [];
        while($row = $playersResult->fetch_assoc()) {
            $player_hand = json_decode($row['submitted_hand'], true);
            if ($gameType === 'thirteen') {
                 $players[] = [
                    'id' => $row['user_id'],
                    'head' => array_map('card_to_string_format', $player_hand['top']),
                    'middle' => array_map('card_to_string_format', $player_hand['middle']),
                    'tail' => array_map('card_to_string_format', $player_hand['bottom']),
                ];
            } else {
                 $players[] = [
                    'id' => $row['user_id'],
                    'head' => $player_hand['top'],
                    'middle' => $player_hand['middle'],
                    'tail' => $player_hand['bottom'],
                ];
            }
        }
        $stmt->close();

        function card_to_string_format($card) {
            return $card['rank'] . '_of_' . $card['suit'];
        }

        // 计算分数
        if ($gameType === 'thirteen') {
            $scores = sss_calculate_all_scores($players);
        } else {
            $scores = eight_card_calculate_all_scores($players);
        }

        // 更新分数和房间状态
        for ($i = 0; $i < count($players); $i++) {
            $playerId = $players[$i]['id'];
            $score = $scores[$i];

            $point_multiplier = ($gameMode === 'double' || $gameMode === 'special') ? 2 : 1;
            $final_score = $score * $point_multiplier;

            $stmt = $conn->prepare("UPDATE room_players SET score = ? WHERE room_id = ? AND user_id = ?");
            $stmt->bind_param("iii", $score, $roomId, $playerId);
            $stmt->execute();
            $stmt->close();

            $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
            $stmt->bind_param("ii", $final_score, $playerId);
            $stmt->execute();
            $stmt->close();
        }

        $stmt = $conn->prepare("UPDATE game_rooms SET status = 'finished' WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $stmt->close();
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => '提交成功！']);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '服务器错误: ' . $e->getMessage()]);
}
$conn->close();
?>

<?php
header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

// --- 1. 获取参数 ---
$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['userId'] ?? 0);
$roomId = (int)($input['roomId'] ?? 0);

if (!$userId || !$roomId) {
    echo json_encode(['success' => false, 'message' => '缺少参数']);
    exit;
}

$conn->begin_transaction();
try {
    // --- 2. 标记玩家已准备 ---
    $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1 WHERE room_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $roomId, $userId);
    $stmt->execute();
    $stmt->close();

    // --- 3. 检查是否所有人都已准备 ---
    $stmt = $conn->prepare("SELECT COUNT(*) as ready_players FROM room_players WHERE room_id = ? AND is_ready = 1");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $readyPlayers = $stmt->get_result()->fetch_assoc()['ready_players'];
    $stmt->close();

    $stmt = $conn->prepare("SELECT players_count FROM game_rooms WHERE id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $playersNeeded = $stmt->get_result()->fetch_assoc()['players_count'];
    $stmt->close();

    // --- 4. 如果全部准备，执行发牌，存入 initial_hand ---
    if ($readyPlayers == $playersNeeded) {
        // 发牌函数
        function dealCards($gameType, $playerCount) {
            $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
            $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
            $deck = [];
            foreach ($suits as $suit) foreach ($ranks as $rank) $deck[] = ['rank'=>$rank, 'suit'=>$suit];
            shuffle($deck);
            $cards_per_player = 13;
            $all_hands = [];
            for ($i=0; $i<$playerCount; $i++) {
                $hand = array_slice($deck, $i*$cards_per_player, $cards_per_player);
                usort($hand, function($a, $b)use($ranks){return array_search($b['rank'],$ranks)-array_search($a['rank'],$ranks);});
                $all_hands[$i] = [
                    'top'=>array_slice($hand,10,3),
                    'middle'=>array_slice($hand,5,5),
                    'bottom'=>array_slice($hand,0,5),
                ];
            }
            return $all_hands;
        }
        $gameType = 'thirteen'; // 可以从房间读取实际类型
        $hands = dealCards($gameType, $playersNeeded);

        $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id = ? ORDER BY id ASC");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $playerIdsResult = $stmt->get_result();
        $i = 0;
        while($row = $playerIdsResult->fetch_assoc()) {
            $handJson = json_encode($hands[$i++]);
            $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand = ? WHERE room_id = ? AND user_id = ?");
            $updateStmt->bind_param("sii", $handJson, $roomId, $row['user_id']);
            $updateStmt->execute();
            $updateStmt->close();
        }
        $stmt->close();
        // 更新房间状态
        $stmt = $conn->prepare("UPDATE game_rooms SET status='playing' WHERE id=?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $stmt->close();
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => '准备成功！']);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => '准备失败！']);
}
$conn->close();
?>
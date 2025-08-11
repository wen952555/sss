<?php
// --- START OF FILE api/match.php ---

header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

// 辅助函数 (发牌逻辑)
function dealCards($gameType, $playerCount) {
    // ... (发牌逻辑与之前文件方案一致，此处省略，您可以从之前代码复制过来)
}

$gameType = $_GET['gameType'] ?? 'thirteen';
$gameMode = $_GET['gameMode'] ?? 'normal';
$userId = (int)($_GET['userId'] ?? 0);

if (!$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '缺少用户ID。']);
    exit;
}

$playersNeeded = $gameType === 'thirteen' ? 4 : 2;

$conn->begin_transaction();
try {
    // 查找一个正在匹配且人数未满的房间
    $stmt = $conn->prepare("SELECT r.id FROM game_rooms r LEFT JOIN room_players rp ON r.id = rp.room_id WHERE r.status = 'matching' AND r.game_type = ? AND r.game_mode = ? GROUP BY r.id HAVING COUNT(rp.id) < ? LIMIT 1");
    $stmt->bind_param("ssi", $gameType, $gameMode, $playersNeeded);
    $stmt->execute();
    $result = $stmt->get_result();
    $room = $result->fetch_assoc();
    $stmt->close();

    if ($room) {
        // 加入现有房间
        $roomId = $room['id'];
    } else {
        // 创建新房间
        $roomCode = uniqid('room_');
        $stmt = $conn->prepare("INSERT INTO game_rooms (room_code, game_type, game_mode, status, players_count) VALUES (?, ?, ?, 'matching', ?)");
        $stmt->bind_param("sssi", $roomCode, $gameType, $gameMode, $playersNeeded);
        $stmt->execute();
        $roomId = $stmt->insert_id;
        $stmt->close();
    }

    // 将玩家加入房间 (如果已存在则忽略)
    $stmt = $conn->prepare("INSERT INTO room_players (room_id, user_id, initial_hand) VALUES (?, ?, '[]') ON DUPLICATE KEY UPDATE room_id=room_id");
    $stmt->bind_param("ii", $roomId, $userId);
    $stmt->execute();
    $stmt->close();

    // 检查房间是否人满了
    $stmt = $conn->prepare("SELECT COUNT(*) as current_players FROM room_players WHERE room_id = ?");
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $currentPlayers = $stmt->get_result()->fetch_assoc()['current_players'];
    $stmt->close();

    if ($currentPlayers == $playersNeeded) {
        // 人满了，发牌并开始游戏
        $hands = dealCards($gameType, $playersNeeded);
        
        $stmt = $conn->prepare("SELECT user_id FROM room_players WHERE room_id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $playerIdsResult = $stmt->get_result();
        $i = 0;
        while($row = $playerIdsResult->fetch_assoc()) {
            $pId = $row['user_id'];
            $handJson = json_encode($hands['player' . (++$i)]);
            $updateStmt = $conn->prepare("UPDATE room_players SET initial_hand = ? WHERE room_id = ? AND user_id = ?");
            $updateStmt->bind_param("sii", $handJson, $roomId, $pId);
            $updateStmt->execute();
            $updateStmt->close();
        }
        $stmt->close();

        // 更新房间状态
        $stmt = $conn->prepare("UPDATE game_rooms SET status = 'playing' WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $stmt->close();
    }
    
    $conn->commit();

    // 无论是否开始，都返回当前状态让前端轮询
    http_response_code(200);
    echo json_encode(['success' => true, 'roomId' => $roomId, 'message' => '已加入房间，请等待游戏开始...']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '匹配时发生错误: ' . $e->getMessage()]);
}

$conn->close();

// --- END OF FILE api/match.php ---
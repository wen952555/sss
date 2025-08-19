<?php
// --- START OF FILE api/player_ready.php ---

header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['userId'] ?? 0);
$roomId = (int)($input['roomId'] ?? 0);
$hand = $input['hand'] ?? null;
$isAutoManaged = (int)($input['isAutoManaged'] ?? 0); // 新增：是否智能托管

if (!$userId || !$roomId || !$hand) {
    echo json_encode(['success' => false, 'message' => '缺少参数']);
    exit;
}

$submittedHandJson = json_encode($hand);

$conn->begin_transaction();
try {
    // 更新玩家状态（增加托管字段）
    $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1, submitted_hand = ?, is_auto_managed = ?, auto_managed_at = IF(?=1, NOW(), NULL) WHERE room_id = ? AND user_id = ?");
    $stmt->bind_param("siiii", $submittedHandJson, $isAutoManaged, $isAutoManaged, $roomId, $userId);
    $stmt->execute();
    $stmt->close();

    // 检查是否所有人都准备好
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

    if ($readyPlayers == $playersNeeded) {
        // 所有人都准备好了，结算
        // TODO: calculateScores 查询所有玩家的submitted_hand并返回分数，更新room_players和users积分
        // $scores = calculateScores($conn, $roomId);

        // 更新房间状态为 finished
        $stmt = $conn->prepare("UPDATE game_rooms SET status = 'finished', finished_at = NOW() WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $stmt->close();

        // 伪代码: 更新所有玩家分数
        /*
        foreach($scores as $pId => $score) {
            $stmt = $conn->prepare("UPDATE room_players SET score = ? WHERE room_id = ? AND user_id = ?");
            $stmt->bind_param("iii", $score, $roomId, $pId);
            $stmt->execute();
            $stmt->close();

            $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE id = ?");
            $stmt->bind_param("ii", $score, $pId);
            $stmt->execute();
            $stmt->close();
        }
        */

        // 移除本局被托管玩家
        $conn->query("DELETE FROM room_players WHERE room_id = $roomId AND is_auto_managed = 1");
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => '提交成功！']);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => '提交失败！']);
}
$conn->close();

// --- END OF FILE api/player_ready.php ---
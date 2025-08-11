<?php
// --- START OF FILE api/player_ready.php ---

header("Content-Type: application/json; charset=UTF-8");
require_once 'db_connect.php';

$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['userId'] ?? 0);
$roomId = (int)($input['roomId'] ?? 0);
$hand = $input['hand'] ?? null;

if (!$userId || !$roomId || !$hand) {
    //... 错误处理
    exit;
}

$submittedHandJson = json_encode($hand);

$conn->begin_transaction();
try {
    // 更新玩家状态
    $stmt = $conn->prepare("UPDATE room_players SET is_ready = 1, submitted_hand = ? WHERE room_id = ? AND user_id = ?");
    $stmt->bind_param("sii", $submittedHandJson, $roomId, $userId);
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
        // 伪代码: calculateScores 应该是一个复杂的函数，它查询所有玩家的submitted_hand并返回一个分数数组
        // $scores = calculateScores($conn, $roomId);

        // 更新房间状态为 finished
        $stmt = $conn->prepare("UPDATE game_rooms SET status = 'finished', finished_at = NOW() WHERE id = ?");
        $stmt->bind_param("i", $roomId);
        $stmt->execute();
        $stmt->close();

        // 伪代码: 更新所有玩家的分数
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
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => '提交成功！']);

} catch (Exception $e) {
    $conn->rollback();
    //... 错误处理
}
$conn->close();

// --- END OF FILE api/player_ready.php ---
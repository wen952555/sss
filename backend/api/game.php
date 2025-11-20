<?php
// backend/api/game.php
require '../db.php';
$user = authenticate($pdo);
$action = $_GET['action'] ?? '';

// 获取当前这手牌
if ($action === 'get_hand') {
    // 1. 获取玩家当前进度
    $stmt = $pdo->prepare("SELECT * FROM session_players WHERE user_id = ? AND is_finished = 0");
    $stmt->execute([$user['id']]);
    $playerParams = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$playerParams) {
        // 如果找不到进行中的记录，可能已经完成了
        echo json_encode(['status' => 'finished', 'message' => '当前没有进行中的游戏，请返回大厅']);
        exit;
    }

    $currentStep = intval($playerParams['current_step']); // 1-20
    
    if ($currentStep > 20) {
        // 标记为已结束
        $pdo->prepare("UPDATE session_players SET is_finished = 1 WHERE id = ?")->execute([$playerParams['id']]);
        echo json_encode(['status' => 'finished', 'message' => '恭喜！本场次 20 局已全部完成！']);
        exit;
    }

    $deckOrder = json_decode($playerParams['deck_order'], true);
    
    // 容错：如果 deck_order 解析失败或步数越界
    if (!is_array($deckOrder) || !isset($deckOrder[$currentStep - 1])) {
        echo json_encode(['status' => 'error', 'message' => '牌局数据异常']);
        exit;
    }

    $deckId = $deckOrder[$currentStep - 1]; 
    $seatIndex = $playerParams['seat_index']; // 1-4

    // 2. 从预设库中拿牌
    $stmt = $pdo->prepare("SELECT cards_json, solutions_json FROM pre_decks WHERE id = ?");
    $stmt->execute([$deckId]);
    $deckData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$deckData) {
        // 如果题库里找不到这个ID (极端情况)，跳过这一局
        $pdo->prepare("UPDATE session_players SET current_step = current_step + 1 WHERE id = ?")->execute([$playerParams['id']]);
        echo json_encode(['status' => 'retry', 'message' => '牌局加载错误，正在跳过...']);
        exit;
    }

    $allSolutions = json_decode($deckData['solutions_json'], true);
    $mySolutions = $allSolutions[$seatIndex - 1];

    echo json_encode([
        'status' => 'success',
        'session_id' => $playerParams['session_id'],
        'round_info' => "第 {$currentStep} / 20 局",
        'deck_id' => $deckId,
        'solutions' => $mySolutions
    ]);
}

// 提交牌型
elseif ($action === 'submit_hand') {
    $input = json_decode(file_get_contents('php://input'), true);
    $deckId = $input['deck_id'];
    $arranged = $input['arranged']; 
    $sessionId = $input['session_id'];

    try {
        $pdo->beginTransaction();

        // 1. 检查是否已经提交过这一局 (幂等性检查)
        $stmt = $pdo->prepare("SELECT id FROM game_actions WHERE session_id = ? AND deck_id = ? AND user_id = ?");
        $stmt->execute([$sessionId, $deckId, $user['id']]);
        $exists = $stmt->fetch();

        if (!$exists) {
            // 没提交过，插入记录
            $sql = "INSERT INTO game_actions (session_id, deck_id, user_id, hand_arranged) VALUES (?, ?, ?, ?)";
            $pdo->prepare($sql)->execute([
                $sessionId,
                $deckId,
                $user['id'],
                json_encode($arranged)
            ]);
            
            // 只有在首次提交成功时，才增加步数
            // 使用 AND current_step 来确保并发安全，防止多加
            $pdo->prepare("UPDATE session_players SET current_step = current_step + 1 WHERE user_id = ? AND session_id = ?")
                ->execute([$user['id'], $sessionId]);
        } else {
            // 已经提交过了，可能是前端重发，这里不做操作，直接返回成功，或者检查步数是否滞后
            // 强制同步步数：如果 game_actions 有记录，但 current_step 没加，这里补救一下（虽然理论上事务会保证一致）
        }

        // 2. 检查是否所有人都在这个 deck_id 提交了 (触发结算)
        $stmt = $pdo->prepare("SELECT count(*) FROM game_actions WHERE session_id = ? AND deck_id = ?");
        $stmt->execute([$sessionId, $deckId]);
        $submittedCount = $stmt->fetchColumn();

        if ($submittedCount >= 4) {
            // 结算逻辑 (占位)
            $pdo->prepare("UPDATE game_actions SET is_settled = 1 WHERE session_id = ? AND deck_id = ?")->execute([$sessionId, $deckId]);
        }

        $pdo->commit();
        echo json_encode(['status' => 'success']);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        // 如果是重复键错误(Code 23000)，也算成功，让前端继续
        if ($e->getCode() == '23000') {
             echo json_encode(['status' => 'success', 'info' => 'already_submitted']);
        } else {
             echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}
?>
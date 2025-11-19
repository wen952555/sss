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
        echo json_encode(['status' => 'finished', 'message' => '您没有进行中的游戏']);
        exit;
    }

    $currentStep = $playerParams['current_step']; // 1-20
    
    if ($currentStep > 20) {
         echo json_encode(['status' => 'finished', 'message' => '本场次已结束']);
         exit;
    }

    $deckOrder = json_decode($playerParams['deck_order'], true);
    $deckId = $deckOrder[$currentStep - 1]; // 乱序后的真实 Deck ID
    $seatIndex = $playerParams['seat_index']; // 1-4

    // 2. 从预设库中拿牌
    $stmt = $pdo->prepare("SELECT cards_json, solutions_json FROM pre_decks WHERE id = ?");
    $stmt->execute([$deckId]);
    $deckData = $stmt->fetch(PDO::FETCH_ASSOC);

    $allHands = json_decode($deckData['cards_json'], true);
    $allSolutions = json_decode($deckData['solutions_json'], true);

    // 玩家的手牌 (seatIndex 从1开始，数组从0开始)
    $myHand = $allHands[$seatIndex - 1];
    // 推荐的3种理牌方案
    $mySolutions = $allSolutions[$seatIndex - 1];

    echo json_encode([
        'status' => 'success',
        'round_info' => "第 {$currentStep} / 20 局",
        'deck_id' => $deckId,
        'cards' => $myHand, // 乱牌
        'solutions' => $mySolutions // 智能理牌方案
    ]);
}

// 提交牌型
if ($action === 'submit_hand') {
    $input = json_decode(file_get_contents('php://input'), true);
    $deckId = $input['deck_id'];
    $arranged = $input['arranged']; // {front:[], mid:[], back:[]}
    $sessionId = $input['session_id'];

    $pdo->beginTransaction();

    // 1. 记录提交
    $sql = "INSERT INTO game_actions (session_id, deck_id, user_id, hand_arranged) VALUES (?, ?, ?, ?)";
    try {
        $pdo->prepare($sql)->execute([
            $sessionId,
            $deckId,
            $user['id'],
            json_encode($arranged)
        ]);

        // 2. 玩家进度 +1
        $pdo->prepare("UPDATE session_players SET current_step = current_step + 1 WHERE user_id = ? AND session_id = ?")
            ->execute([$user['id'], $sessionId]);

        // 3. 检查是否所有人都在这个 deck_id 提交了？(触发结算)
        // 这里的逻辑是：找出 session_id 里的所有 user_id，检查 game_actions 表里该 deck_id 的记录数是否等于 4
        $stmt = $pdo->prepare("SELECT count(*) FROM game_actions WHERE session_id = ? AND deck_id = ?");
        $stmt->execute([$sessionId, $deckId]);
        $submittedCount = $stmt->fetchColumn();

        if ($submittedCount >= 4) {
            // 所有人到齐，结算！
            // TODO: 这里调用 Logic::calculateScore 算出4人得分，更新 game_actions.score_result，并更新 users.points
            // 为了简化代码，此处省略具体算分，假设每人+10分
            // ...
        }

        $pdo->commit();
        echo json_encode(['status' => 'success']);

    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['status' => 'error', 'message' => '重复提交或系统错误']);
    }
}
?>
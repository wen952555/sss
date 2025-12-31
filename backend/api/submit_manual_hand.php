<?php
session_start();
require __DIR__ . '/../db.php';
require __DIR__ . '/../utils.php';
require __DIR__ . '/../lib/SmartSorter.php';

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    sendJSON(['status' => 'error', 'message' => '用户未认证'], 401);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$sorted_hand = $data['sorted_hand'] ?? null;

if (!$sorted_hand || !is_array($sorted_hand) || count($sorted_hand) !== 13) {
    sendJSON(['status' => 'error', 'message' => '提交的手牌无效'], 400);
    exit;
}

$pdo->beginTransaction();

try {
    // 1. Find the user's active game and current round
    $game_sql = "SELECT id, stadium_id, current_round FROM active_games WHERE status = 'active' AND (
                    player_1_id = ? OR player_2_id = ? OR player_3_id = ? OR player_4_id = ?
                )";
    $game_stmt = $pdo->prepare($game_sql);
    $game_stmt->execute([$user_id, $user_id, $user_id, $user_id]);
    $game = $game_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        throw new Exception("未找到该玩家的活跃游戏");
    }
    $game_id = $game['id'];
    $round = $game['current_round'];

    // 2. Check if the user has already submitted for this round
    $play_check_stmt = $pdo->prepare("SELECT id FROM game_plays WHERE active_game_id = ? AND user_id = ? AND round_number = ?");
    $play_check_stmt->execute([$game_id, $user_id, $round]);
    if ($play_check_stmt->fetch()) {
        throw new Exception("您在本回合已经出过牌了");
    }

    // 3. Get the deal_id for the current round
    $deal_stmt = $pdo->prepare("SELECT id FROM stadium_deals WHERE stadium_id = ? AND deal_index = ?");
    $deal_stmt->execute([$game['stadium_id'], $round]);
    $deal = $deal_stmt->fetch(PDO::FETCH_ASSOC);
    if (!$deal) {
        throw new Exception("找不到当前回合的牌局信息");
    }

    // 4. Calculate score for the submitted hand
    $head_score = SmartSorter::getHandScore(array_slice($sorted_hand, 0, 3))['score'];
    $mid_score = SmartSorter::getHandScore(array_slice($sorted_hand, 3, 5))['score'];
    $back_score = SmartSorter::getHandScore(array_slice($sorted_hand, 8, 5))['score'];
    $total_score = $head_score + $mid_score + $back_score;

    // 5. Insert the play into the database
    $insert_stmt = $pdo->prepare(
        "INSERT INTO game_plays (active_game_id, user_id, round_number, deal_id, sorted_hand, score, is_autopilot) VALUES (?, ?, ?, ?, ?, ?, FALSE)"
    );
    $insert_stmt->execute([
        $game_id,
        $user_id,
        $round,
        $deal['id'],
        json_encode($sorted_hand),
        $total_score
    ]);

    // 6. Update the game's last_action_at timestamp
    $update_game_stmt = $pdo->prepare("UPDATE active_games SET last_action_at = NOW() WHERE id = ?");
    $update_game_stmt->execute([$game_id]);

    $pdo->commit();
    sendJSON(['status' => 'success', 'message' => '出牌成功', 'your_score' => $total_score], 201);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
}
?>
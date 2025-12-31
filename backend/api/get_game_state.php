<?php
session_start();
require __DIR__ . '/../db.php';
require __DIR__ . '/../utils.php';
require __DIR__ . '/../lib/Deck.php'; // To get player positions

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    sendJSON(['status' => 'no_auth', 'message' => '用户未认证'], 401);
    exit;
}

try {
    // 1. Find the user's active game
    $game_sql = "SELECT id, stadium_id, current_round, player_1_id, player_2_id, player_3_id, player_4_id 
                 FROM active_games 
                 WHERE status = 'active' AND (player_1_id = ? OR player_2_id = ? OR player_3_id = ? OR player_4_id = ?)";
    $game_stmt = $pdo->prepare($game_sql);
    $game_stmt->execute([$user_id, $user_id, $user_id, $user_id]);
    $game = $game_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        sendJSON(['status' => 'no_game', 'message' => '未找到您的有效比赛，请确认您已成功预约今晚的比赛。'], 404);
        exit;
    }

    $game_id = $game['id'];
    $round = $game['current_round'];
    $players_in_game = [$game['player_1_id'], $game['player_2_id'], $game['player_3_id'], $game['player_4_id']];
    
    if($round > 10){
         sendJSON(['status' => 'game_over', 'message' => '所有10轮比赛都已完成。', 'game_id' => $game_id], 200);
         exit;
    }

    // 2. Check if the user has already submitted for this round
    $play_check_stmt = $pdo->prepare("SELECT id FROM game_plays WHERE active_game_id = ? AND user_id = ? AND round_number = ?");
    $play_check_stmt->execute([$game_id, $user_id, $round]);
    if ($play_check_stmt->fetch()) {
        sendJSON(['status' => 'waiting_for_others', 'message' => '您已出牌，请等待其他玩家。', 'game_id' => $game_id, 'round' => $round], 200);
        exit;
    }

    // 3. Get the hand for the player for the current round
    $deal_stmt = $pdo->prepare("SELECT hands FROM stadium_deals WHERE stadium_id = ? AND deal_index = ?");
    $deal_stmt->execute([$game['stadium_id'], $round]);
    $deal = $deal_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$deal) {
        throw new Exception("严重错误：找不到当前比赛的牌局信息！");
    }

    $all_hands = json_decode($deal['hands'], true);
    $player_index = array_search($user_id, $players_in_game);
    $player_position = ['north', 'east', 'south', 'west'][$player_index];
    $player_hand = $all_hands[$player_position];

    sendJSON([
        'status' => 'my_turn',
        'message' => '轮到您出牌',
        'game_id' => $game_id,
        'round' => $round,
        'hand' => $player_hand
    ], 200);

} catch (Exception $e) {
    sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
}
?>
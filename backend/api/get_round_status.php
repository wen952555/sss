<?php
session_start();
require __DIR__ . '/../db.php';
require __DIR__ . '/../utils.php';

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    sendJSON(['status' => 'error', 'message' => '用户未认证'], 401);
    exit;
}

$game_id = $_GET['game_id'] ?? null;
$round = $_GET['round'] ?? null;

if (!$game_id || !$round) {
    sendJSON(['status' => 'error', 'message' => '缺少 game_id 或 round 参数'], 400);
    exit;
}

try {
    // 1. Get all player IDs for the game
    $game_stmt = $pdo->prepare("SELECT player_1_id, player_2_id, player_3_id, player_4_id FROM active_games WHERE id = ?");
    $game_stmt->execute([$game_id]);
    $game_players = $game_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game_players) {
        throw new Exception("找不到指定的游戏");
    }
    $player_ids = array_values(array_filter($game_players));

    // 2. Get users who have submitted for this round
    $plays_stmt = $pdo->prepare("SELECT user_id FROM game_plays WHERE active_game_id = ? AND round_number = ?");
    $plays_stmt->execute([$game_id, $round]);
    $submitted_user_ids = $plays_stmt->fetchAll(PDO::FETCH_COLUMN, 0);

    // 3. Get short_id for all players in the game
    $player_statuses = [];
    if (!empty($player_ids)) {
        $placeholders = implode(',', array_fill(0, count($player_ids), '?'));
        $users_stmt = $pdo->prepare("SELECT id, short_id FROM users WHERE id IN ($placeholders)");
        $users_stmt->execute($player_ids);
        $all_players_info = $users_stmt->fetchAll(PDO::FETCH_KEY_PAIR); // [id => short_id]

        // 4. Build the status list
        foreach ($player_ids as $pid) {
            if (isset($all_players_info[$pid])) {
                $player_statuses[] = [
                    'short_id' => $all_players_info[$pid],
                    'submitted' => in_array($pid, $submitted_user_ids)
                ];
            }
        }
    }
    
    $all_submitted = count($submitted_user_ids) >= count($player_ids) && count($player_ids) > 0;

    sendJSON([
        'status' => 'success',
        'all_submitted' => $all_submitted,
        'player_statuses' => $player_statuses
    ], 200);

} catch (Exception $e) {
    sendJSON(['status' => 'error', 'message' => $e->getMessage()], 500);
}
?>

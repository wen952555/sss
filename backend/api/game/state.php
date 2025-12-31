<?php
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/game.php';

header('Content-Type: application/json');

// 验证token
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

$auth = new Auth();
$user_data = $auth->validateToken($token);

if (!$user_data) {
    http_response_code(401);
    echo json_encode(['error' => '未授权访问']);
    exit;
}

if (!isset($_GET['game_id'])) {
    http_response_code(400);
    echo json_encode(['error' => '缺少 game_id 参数']);
    exit;
}

$game_id = $_GET['game_id'];
$game = new Game();
$game_state = $game->getGameState($game_id);

if (!$game_state) {
    http_response_code(404);
    echo json_encode(['error' => '游戏不存在']);
    exit;
}

// 验证玩家是否在该游戏中
if (!in_array($user_data['user_id'], $game_state['players'])) {
    http_response_code(403);
    echo json_encode(['error' => '你没有权限访问该游戏']);
    exit;
}

// 根据游戏状态决定返回的信息
// 如果游戏已经结束，或者当前玩家已经提交，则可以返回所有人的牌
if ($game_state['status'] === 'completed' || $game_state['game_state'][$user_data['user_id']]['submitted']) {
    // 显示所有玩家的牌
    $response = $game_state;
} else {
    // 游戏进行中，只显示自己的手牌
    $current_player_id = $user_data['user_id'];
    $response = [
        'game_id' => $game_state['game_id'],
        'status' => $game_state['status'],
        'players' => $game_state['players'],
        'current_hand' => $game_state['game_state'][$current_player_id]['hand'],
        'submitted_status' => []
    ];
    foreach($game_state['game_state'] as $pid => $state) {
        $response['submitted_status'][$pid] = $state['submitted'];
    }
}

echo json_encode($response);
?>
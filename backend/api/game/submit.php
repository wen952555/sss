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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$game_id = isset($data['game_id']) ? $data['game_id'] : null;
$front_hand = isset($data['front']) ? $data['front'] : [];
$middle_hand = isset($data['middle']) ? $data['middle'] : [];
$back_hand = isset($data['back']) ? $data['back'] : [];

if (!$game_id || !$front_hand || !$middle_hand || !$back_hand) {
    http_response_code(400);
    echo json_encode(['error' => '缺少必要的参数']);
    exit;
}

$player_id = $user_data['user_id'];

$game = new Game();
$result = $game->submitHand($game_id, $player_id, $front_hand, $middle_hand, $back_hand);

if (isset($result['error'])) {
    http_response_code(400);
    echo json_encode($result);
} else {
    echo json_encode($result);
}
?>
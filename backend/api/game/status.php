<?php
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/db.php';

header('Content-Type: application/json');

// 验证token
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

if (!$token) {
    // 对于状态查询，允许未登录用户查看公开房间
    $user_data = null;
} else {
    $auth = new Auth();
    $user_data = $auth->validateToken($token);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_GET['room_id'])) {
    http_response_code(400);
    echo json_encode(['error' => '请输入房间号']);
    exit;
}

$room_id = trim($_GET['room_id']);

$database = new Database();
$conn = $database->getConnection();

// 查询房间信息
$query = "SELECT * FROM games WHERE room_id = :room_id";
$stmt = $conn->prepare($query);
$stmt->bindParam(':room_id', $room_id);
$stmt->execute();

if ($stmt->rowCount() == 0) {
    http_response_code(404);
    echo json_encode(['error' => '房间不存在']);
    exit;
}

$room = $stmt->fetch(PDO::FETCH_ASSOC);
$room_data = [
    'id' => $room['room_id'],
    'status' => $room['status'],
    'bet_points' => $room['bet_points'],
    'players' => json_decode($room['players'], true),
    'created_at' => $room['created_at'],
    'started_at' => $room['started_at'],
    'finished_at' => $room['finished_at']
];

// 如果有游戏状态，也返回
$game_state = null;
if ($room['cards']) {
    $game_state = json_decode($room['cards'], true);
    
    // 如果用户不在游戏中，隐藏其他玩家的手牌
    if ($user_data) {
        $user_in_game = false;
        foreach ($room_data['players'] as $player) {
            if ($player['user_id'] === $user_data['user_id']) {
                $user_in_game = true;
                break;
            }
        }
        
        if (!$user_in_game && isset($game_state['players'])) {
            foreach ($game_state['players'] as &$player) {
                if ($player['user_id'] !== $user_data['user_id']) {
                    $player['hand'] = []; // 隐藏其他玩家的手牌
                }
            }
        }
    } else {
        // 未登录用户看不到任何手牌
        if (isset($game_state['players'])) {
            foreach ($game_state['players'] as &$player) {
                $player['hand'] = [];
            }
        }
    }
}

echo json_encode([
    'success' => true,
    'room' => $room_data,
    'game_state' => $game_state
]);
?>
<?php
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/db.php';

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

$player_count = isset($data['player_count']) ? intval($data['player_count']) : 4;
$bet_points = isset($data['bet_points']) ? intval($data['bet_points']) : 10;

// 验证参数
if ($player_count < 2 || $player_count > 4) {
    http_response_code(400);
    echo json_encode(['error' => '玩家数量必须在2-4人之间']);
    exit;
}

if ($bet_points < 10 || $bet_points > 1000) {
    http_response_code(400);
    echo json_encode(['error' => '下注积分必须在10-1000之间']);
    exit;
}

// 检查用户积分是否足够
$current_user = $auth->getUserById($user_data['user_id']);
if ($current_user['points'] < $bet_points) {
    http_response_code(400);
    echo json_encode(['error' => '积分不足，无法创建房间']);
    exit;
}

// 生成房间ID（6位字母数字）
function generateRoomId() {
    $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < 6; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}

$database = new Database();
$conn = $database->getConnection();

// 创建房间
$room_id = generateRoomId();
$players = json_encode([[
    'user_id' => $user_data['user_id'],
    'phone' => $user_data['phone'],
    'points' => $bet_points,
    'status' => 'ready',
    'position' => 0
]]);

$query = "INSERT INTO games (room_id, players, bet_points, status, created_at) 
          VALUES (:room_id, :players, :bet_points, 'waiting', NOW())";
$stmt = $conn->prepare($query);
$stmt->bindParam(':room_id', $room_id);
$stmt->bindParam(':players', $players);
$stmt->bindParam(':bet_points', $bet_points);

try {
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => '房间创建成功',
        'room' => [
            'id' => $room_id,
            'player_count' => $player_count,
            'bet_points' => $bet_points,
            'players' => json_decode($players, true),
            'status' => 'waiting',
            'creator' => $user_data['user_id']
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => '创建房间失败: ' . $e->getMessage()]);
}
?>
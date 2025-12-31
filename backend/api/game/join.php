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

if (!isset($data['room_id'])) {
    http_response_code(400);
    echo json_encode(['error' => '请输入房间号']);
    exit;
}

$room_id = trim($data['room_id']);

$database = new Database();
$conn = $database->getConnection();

// 查询房间信息
$query = "SELECT * FROM games WHERE room_id = :room_id AND status = 'waiting'";
$stmt = $conn->prepare($query);
$stmt->bindParam(':room_id', $room_id);
$stmt->execute();

if ($stmt->rowCount() == 0) {
    http_response_code(404);
    echo json_encode(['error' => '房间不存在或游戏已开始']);
    exit;
}

$room = $stmt->fetch(PDO::FETCH_ASSOC);
$players = json_decode($room['players'], true);

// 检查用户是否已在房间中
foreach ($players as $player) {
    if ($player['user_id'] === $user_data['user_id']) {
        echo json_encode([
            'success' => true,
            'message' => '您已在房间中',
            'room' => [
                'id' => $room['room_id'],
                'bet_points' => $room['bet_points'],
                'players' => $players,
                'status' => $room['status']
            ]
        ]);
        exit;
    }
}

// 检查房间是否已满
if (count($players) >= 4) {
    http_response_code(400);
    echo json_encode(['error' => '房间已满']);
    exit;
}

// 检查用户积分是否足够
$current_user = $auth->getUserById($user_data['user_id']);
if ($current_user['points'] < $room['bet_points']) {
    http_response_code(400);
    echo json_encode(['error' => '积分不足，无法加入房间']);
    exit;
}

// 添加玩家到房间
$new_player = [
    'user_id' => $user_data['user_id'],
    'phone' => $user_data['phone'],
    'points' => $room['bet_points'],
    'status' => 'ready',
    'position' => count($players)
];

$players[] = $new_player;
$players_json = json_encode($players);

$query = "UPDATE games SET players = :players WHERE room_id = :room_id";
$stmt = $conn->prepare($query);
$stmt->bindParam(':players', $players_json);
$stmt->bindParam(':room_id', $room_id);

try {
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => '加入房间成功',
        'room' => [
            'id' => $room['room_id'],
            'bet_points' => $room['bet_points'],
            'players' => $players,
            'status' => $room['status']
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => '加入房间失败: ' . $e->getMessage()]);
}
?>
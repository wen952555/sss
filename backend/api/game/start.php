<?php
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/cards.php';

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

// 检查游戏状态
if ($room['status'] !== 'waiting') {
    http_response_code(400);
    echo json_encode(['error' => '游戏已开始或已结束']);
    exit;
}

// 检查玩家数量
$players = json_decode($room['players'], true);
if (count($players) < 2) {
    http_response_code(400);
    echo json_encode(['error' => '至少需要2名玩家才能开始游戏']);
    exit;
}

// 检查是否所有玩家都准备就绪
foreach ($players as $player) {
    if ($player['status'] !== 'ready') {
        http_response_code(400);
        echo json_encode(['error' => '有玩家未准备']);
        exit;
    }
}

// 生成牌组并发牌
$deck = Cards::generateDeck(true);
$player_count = count($players);
$cards_per_player = 13;
$hands = [];

for ($i = 0; $i < $player_count; $i++) {
    $hands[] = array_slice($deck, $i * $cards_per_player, $cards_per_player);
}

// 为每位玩家分配手牌
foreach ($players as $index => &$player) {
    $player['hand'] = $hands[$index];
    $player['status'] = 'playing';
}

// 创建游戏状态
$game_state = [
    'room_id' => $room_id,
    'players' => $players,
    'current_player' => 0,
    'deck' => array_slice($deck, $player_count * $cards_per_player),
    'center_cards' => [],
    'round' => 1,
    'turn' => 1,
    'status' => 'playing',
    'start_time' => date('Y-m-d H:i:s')
];

$game_state_json = json_encode($game_state);
$players_json = json_encode($players);

// 更新游戏状态
$query = "UPDATE games 
          SET players = :players, 
              cards = :cards,
              status = 'playing',
              started_at = NOW() 
          WHERE room_id = :room_id";
$stmt = $conn->prepare($query);
$stmt->bindParam(':players', $players_json);
$stmt->bindParam(':cards', $game_state_json);
$stmt->bindParam(':room_id', $room_id);

try {
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => '游戏开始！',
        'game_state' => $game_state
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => '开始游戏失败: ' . $e->getMessage()]);
}
?>
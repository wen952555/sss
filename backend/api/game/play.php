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

if (!isset($data['room_id']) || !isset($data['cards'])) {
    http_response_code(400);
    echo json_encode(['error' => '缺少必要参数']);
    exit;
}

$room_id = trim($data['room_id']);
$played_cards = $data['cards'];

if (!is_array($played_cards) || empty($played_cards)) {
    http_response_code(400);
    echo json_encode(['error' => '请选择要出的牌']);
    exit;
}

$database = new Database();
$conn = $database->getConnection();

// 查询游戏状态
$query = "SELECT * FROM games WHERE room_id = :room_id AND status = 'playing'";
$stmt = $conn->prepare($query);
$stmt->bindParam(':room_id', $room_id);
$stmt->execute();

if ($stmt->rowCount() == 0) {
    http_response_code(404);
    echo json_encode(['error' => '游戏不存在或未开始']);
    exit;
}

$game = $stmt->fetch(PDO::FETCH_ASSOC);
$game_state = json_decode($game['cards'], true);
$players = $game_state['players'];

// 找到当前玩家
$current_player_index = -1;
foreach ($players as $index => $player) {
    if ($player['user_id'] === $user_data['user_id']) {
        $current_player_index = $index;
        break;
    }
}

if ($current_player_index === -1) {
    http_response_code(403);
    echo json_encode(['error' => '您不在游戏中']);
    exit;
}

// 检查是否是当前玩家的回合
if ($game_state['current_player'] !== $current_player_index) {
    http_response_code(400);
    echo json_encode(['error' => '不是您的回合']);
    exit;
}

// 验证玩家是否有这些牌
$player_hand = $players[$current_player_index]['hand'];
foreach ($played_cards as $card) {
    if (!in_array($card, $player_hand)) {
        http_response_code(400);
        echo json_encode(['error' => '您没有这些牌']);
        exit;
    }
}

// 检查牌型有效性（这里简化处理，实际需要验证十三水牌型）
if (!Cards::isValidCard($played_cards[0])) {
    http_response_code(400);
    echo json_encode(['error' => '无效的牌型']);
    exit;
}

// 从玩家手牌中移除打出的牌
foreach ($played_cards as $card) {
    $key = array_search($card, $player_hand);
    if ($key !== false) {
        unset($player_hand[$key]);
    }
}

// 重新索引数组
$player_hand = array_values($player_hand);

// 更新玩家手牌
$players[$current_player_index]['hand'] = $player_hand;

// 添加到中心牌区
$game_state['center_cards'][] = [
    'player_id' => $user_data['user_id'],
    'player_index' => $current_player_index,
    'cards' => $played_cards,
    'time' => date('Y-m-d H:i:s')
];

// 检查游戏是否结束
$game_finished = true;
foreach ($players as $player) {
    if (!empty($player['hand'])) {
        $game_finished = false;
        break;
    }
}

if ($game_finished) {
    $game_state['status'] = 'finished';
    $game_state['end_time'] = date('Y-m-d H:i:s');
    
    // 计算分数和胜负
    $results = calculateGameResults($players, $game_state['center_cards']);
    $game_state['results'] = $results;
    
    // 更新游戏状态为完成
    $status = 'finished';
} else {
    // 下一个玩家
    $game_state['current_player'] = ($current_player_index + 1) % count($players);
    $game_state['turn']++;
    $status = 'playing';
}

// 更新游戏状态
$game_state['players'] = $players;
$game_state_json = json_encode($game_state);

$query = "UPDATE games 
          SET cards = :cards,
              status = :status,
              finished_at = CASE WHEN :status = 'finished' THEN NOW() ELSE finished_at END,
              results = CASE WHEN :status = 'finished' THEN :results ELSE results END
          WHERE room_id = :room_id";
$stmt = $conn->prepare($query);
$stmt->bindParam(':cards', $game_state_json);
$stmt->bindParam(':status', $status);
$stmt->bindParam(':results', json_encode($game_state['results'] ?? null));
$stmt->bindParam(':room_id', $room_id);

try {
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => '出牌成功',
        'game_state' => $game_state
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => '出牌失败: ' . $e->getMessage()]);
}

// 计算游戏结果（简化版）
function calculateGameResults($players, $center_cards) {
    // 这里应该实现完整的十三水计分规则
    // 简化处理：手牌先出完的玩家获胜
    $results = [];
    $winners = [];
    
    foreach ($players as $index => $player) {
        if (empty($player['hand'])) {
            $winners[] = $index;
        }
    }
    
    foreach ($players as $index => $player) {
        $results[] = [
            'user_id' => $player['user_id'],
            'position' => in_array($index, $winners) ? 1 : 2,
            'points_change' => in_array($index, $winners) ? 100 : -50
        ];
    }
    
    return $results;
}
?>
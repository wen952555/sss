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
$players = json_decode($room['players'], true);

// 检查用户是否在房间中
$user_index = -1;
foreach ($players as $index => $player) {
    if ($player['user_id'] === $user_data['user_id']) {
        $user_index = $index;
        break;
    }
}

if ($user_index === -1) {
    echo json_encode([
        'success' => true,
        'message' => '您不在该房间中'
    ]);
    exit;
}

// 从房间中移除玩家
array_splice($players, $user_index, 1);

// 如果房间为空，删除房间
if (empty($players)) {
    $query = "DELETE FROM games WHERE room_id = :room_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':room_id', $room_id);
    
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => '已离开房间，房间已解散'
    ]);
    exit;
}

// 更新房间玩家列表
$players_json = json_encode($players);
$query = "UPDATE games SET players = :players WHERE room_id = :room_id";
$stmt = $conn->prepare($query);
$stmt->bindParam(':players', $players_json);
$stmt->bindParam(':room_id', $room_id);

try {
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => '已成功离开房间'
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => '离开房间失败: ' . $e->getMessage()]);
}
?>
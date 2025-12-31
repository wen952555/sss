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

if (!isset($data['to_user_id']) || !isset($data['points'])) {
    http_response_code(400);
    echo json_encode(['error' => '缺少必要参数']);
    exit;
}

$from_user_id = $user_data['user_id'];
$to_user_id = trim($data['to_user_id']);
$points = intval($data['points']);

if ($points <= 0) {
    http_response_code(400);
    echo json_encode(['error' => '积分必须大于0']);
    exit;
}

if ($from_user_id === $to_user_id) {
    http_response_code(400);
    echo json_encode(['error' => '不能给自己转账']);
    exit;
}

// 获取发送者信息
$from_user = $auth->getUserById($from_user_id);
if (!$from_user) {
    http_response_code(400);
    echo json_encode(['error' => '发送者不存在']);
    exit;
}

// 获取接收者信息
$to_user = $auth->getUserById($to_user_id);
if (!$to_user) {
    http_response_code(400);
    echo json_encode(['error' => '接收者不存在']);
    exit;
}

// 检查余额
if ($from_user['points'] < $points) {
    http_response_code(400);
    echo json_encode(['error' => '积分不足']);
    exit;
}

// 开始事务
$database = new Database();
$conn = $database->getConnection();
$conn->beginTransaction();

try {
    // 扣除发送者积分
    $query = "UPDATE users SET points = points - :points WHERE user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':points', $points);
    $stmt->bindParam(':user_id', $from_user_id);
    $stmt->execute();

    // 增加接收者积分
    $query = "UPDATE users SET points = points + :points WHERE user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':points', $points);
    $stmt->bindParam(':user_id', $to_user_id);
    $stmt->execute();

    // 记录交易
    $query = "INSERT INTO transactions (from_user_id, to_user_id, points, type, description) 
              VALUES (:from_user_id, :to_user_id, :points, 'transfer', :description)";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':from_user_id', $from_user_id);
    $stmt->bindParam(':to_user_id', $to_user_id);
    $stmt->bindParam(':points', $points);
    $description = "用户 {$from_user_id} 转账给用户 {$to_user_id}";
    $stmt->bindParam(':description', $description);
    $stmt->execute();

    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => '转账成功',
        'new_balance' => $from_user['points'] - $points
    ]);
    
} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['error' => '转账失败：' . $e->getMessage()]);
}
?>
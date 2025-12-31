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

// 验证管理员权限
if (!$auth->isAdmin($user_data['user_id'])) {
    http_response_code(403);
    echo json_encode(['error' => '需要管理员权限']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['target_user_id']) || !isset($data['points'])) {
    http_response_code(400);
    echo json_encode(['error' => '缺少必要参数']);
    exit;
}

$target_user_id = trim($data['target_user_id']);
$points = intval($data['points']);
$operation = isset($data['operation']) ? $data['operation'] : 'set'; // set, add, subtract

// 获取目标用户
$target_user = $auth->getUserById($target_user_id);
if (!$target_user) {
    http_response_code(404);
    echo json_encode(['error' => '用户不存在']);
    exit;
}

$database = new Database();
$conn = $database->getConnection();

// 计算新积分
$current_points = $target_user['points'];
switch ($operation) {
    case 'add':
        $new_points = $current_points + $points;
        break;
    case 'subtract':
        $new_points = max(0, $current_points - $points);
        break;
    case 'set':
    default:
        $new_points = max(0, $points);
        break;
}

// 开始事务
$conn->beginTransaction();

try {
    // 更新用户积分
    $query = "UPDATE users SET points = :points WHERE user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':points', $new_points);
    $stmt->bindParam(':user_id', $target_user_id);
    $stmt->execute();

    // 记录交易
    $admin_id = $user_data['user_id'];
    $query = "INSERT INTO transactions (from_user_id, to_user_id, points, type, description) 
              VALUES (:from_user_id, :to_user_id, :points, 'admin_adjust', :description)";
    $stmt = $conn->prepare($query);
    
    // 如果是增加积分，管理员是发送者，用户是接收者
    // 如果是减少积分，用户是发送者，管理员是接收者（但实际不接收）
    if ($operation === 'add') {
        $from_user_id = $admin_id;
        $to_user_id = $target_user_id;
        $description = "管理员 {$admin_id} 为用户 {$target_user_id} 增加 {$points} 积分";
    } elseif ($operation === 'subtract') {
        $from_user_id = $target_user_id;
        $to_user_id = $admin_id;
        $description = "管理员 {$admin_id} 扣除用户 {$target_user_id} {$points} 积分";
    } else {
        $from_user_id = $admin_id;
        $to_user_id = $target_user_id;
        $description = "管理员 {$admin_id} 设置用户 {$target_user_id} 积分为 {$new_points}";
    }
    
    $stmt->bindParam(':from_user_id', $from_user_id);
    $stmt->bindParam(':to_user_id', $to_user_id);
    $stmt->bindParam(':points', $points);
    $stmt->bindParam(':description', $description);
    $stmt->execute();

    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => '积分调整成功',
        'user' => [
            'user_id' => $target_user_id,
            'old_points' => $current_points,
            'new_points' => $new_points,
            'change' => $new_points - $current_points
        ]
    ]);
    
} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['error' => '调整失败：' . $e->getMessage()]);
}
?>
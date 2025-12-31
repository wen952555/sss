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

if (!isset($data['target_user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => '请输入用户ID']);
    exit;
}

$target_user_id = trim($data['target_user_id']);

// 不能删除自己
if ($target_user_id === $user_data['user_id']) {
    http_response_code(400);
    echo json_encode(['error' => '不能删除自己']);
    exit;
}

// 开始事务
$database = new Database();
$conn = $database->getConnection();
$conn->beginTransaction();

try {
    // 先删除相关交易记录
    $query = "DELETE FROM transactions WHERE from_user_id = :user_id OR to_user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $target_user_id);
    $stmt->execute();

    // 删除游戏记录
    $query = "DELETE FROM games WHERE JSON_CONTAINS(players, :user_id)";
    $stmt = $conn->prepare($query);
    $stmt->bindValue(':user_id', json_encode($target_user_id));
    $stmt->execute();

    // 删除用户
    $query = "DELETE FROM users WHERE user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':user_id', $target_user_id);
    
    if ($stmt->execute()) {
        $conn->commit();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode([
                'success' => true,
                'message' => '用户删除成功'
            ]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => '用户不存在']);
        }
    } else {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => '删除失败']);
    }
    
} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['error' => '删除失败：' . $e->getMessage()]);
}
?>
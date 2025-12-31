<?php
require_once __DIR__ . '/../../lib/auth.php';

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

// 获取用户信息
$user_id = $user_data['user_id'];
$user = $auth->getUserById($user_id);

if ($user) {
    // 检查是否为管理员
    $user['is_admin'] = $auth->isAdmin($user_id);
    echo json_encode([
        'success' => true,
        'user' => $user
    ]);
} else {
    http_response_code(404);
    echo json_encode(['error' => '用户不存在']);
}
?>
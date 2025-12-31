<?php
require_once __DIR__ . '/../../lib/auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['phone']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => '手机号和密码不能为空']);
    exit;
}

$phone = trim($data['phone']);
$password = trim($data['password']);

// 验证手机号格式（简单验证）
if (!preg_match('/^[0-9]{10,15}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['error' => '手机号格式不正确']);
    exit;
}

// 验证密码长度
if (strlen($password) != 6) {
    http_response_code(400);
    echo json_encode(['error' => '密码必须为6位']);
    exit;
}

$auth = new Auth();
$user_id = $auth->register($phone, $password);

if ($user_id) {
    echo json_encode([
        'success' => true,
        'message' => '注册成功',
        'user_id' => $user_id
    ]);
} else {
    http_response_code(400);
    echo json_encode(['error' => '注册失败，手机号可能已被使用']);
}
?>
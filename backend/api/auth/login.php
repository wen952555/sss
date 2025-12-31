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

$auth = new Auth();
$user = $auth->login($phone, $password);

if ($user) {
    echo json_encode([
        'success' => true,
        'message' => '登录成功',
        'user' => $user
    ]);
} else {
    http_response_code(401);
    echo json_encode(['error' => '手机号或密码错误']);
}
?>
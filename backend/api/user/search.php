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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['phone'])) {
    http_response_code(400);
    echo json_encode(['error' => '请输入手机号']);
    exit;
}

$phone = trim($data['phone']);

$users = $auth->searchByPhone($phone);

echo json_encode([
    'success' => true,
    'users' => $users
]);
?>
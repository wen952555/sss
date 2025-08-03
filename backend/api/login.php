<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

$db_path = '../database/users.json';

// 读取数据库
function getUsers($path) {
    if (!file_exists($path)) return [];
    return json_decode(file_get_contents($path), true);
}

// --- Main Logic ---

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['phone'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的请求，需要提供手机号。']);
    exit;
}

$phone = $input['phone'];

$users = getUsers($db_path);

// 查找用户
foreach ($users as $id => $user) {
    if ($user['phone'] === $phone) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => '登录成功！',
            'userId' => $id,
            'user' => $user
        ]);
        exit;
    }
}

// 如果循环结束还没找到
http_response_code(404); // 404 Not Found
echo json_encode(['success' => false, 'message' => '该手机号未注册。']);
?>

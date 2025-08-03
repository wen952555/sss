<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

$db_path = '../database/users.json';

// --- Helper Functions ---

// 读取数据库
function getUsers($path) {
    if (!file_exists($path)) {
        return [];
    }
    $json = file_get_contents($path);
    return json_decode($json, true);
}

// 保存数据库
function saveUsers($path, $users) {
    file_put_contents($path, json_encode($users, JSON_PRETTY_PRINT));
}

// 生成一个唯一的4位数ID
function generateUniqueId($users) {
    do {
        $id = str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
    } while (isset($users[$id])); // 确保ID是唯一的
    return $id;
}


// --- Main Logic ---

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['phone'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的请求，需要提供手机号。']);
    exit;
}

$phone = $input['phone'];

// 简单的手机号验证
if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的手机号格式。']);
    exit;
}

$users = getUsers($db_path);

// 检查手机号是否已存在
foreach ($users as $user) {
    if ($user['phone'] === $phone) {
        http_response_code(409); // 409 Conflict
        echo json_encode(['success' => false, 'message' => '该手机号已被注册。']);
        exit;
    }
}

// 创建新用户
$newUserId = generateUniqueId($users);
$newUser = [
    'phone' => $phone,
    'points' => 1000, // 初始积分
    'created_at' => date('Y-m-d H:i:s')
];

$users[$newUserId] = $newUser;
saveUsers($db_path, $users);

http_response_code(201); // 201 Created
echo json_encode([
    'success' => true,
    'message' => '注册成功！',
    'userId' => $newUserId,
    'user' => $newUser
]);
?>

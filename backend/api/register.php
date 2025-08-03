<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 数据库文件路径
$dbFile = '../database/users.json';

// --- 函数：读取用户数据 ---
function getUsers($file) {
    if (!file_exists($file)) {
        return [];
    }
    $json = file_get_contents($file);
    return json_decode($json, true);
}

// --- 函数：保存用户数据 ---
function saveUsers($file, $users) {
    $json = json_encode($users, JSON_PRETTY_PRINT);
    file_put_contents($file, $json);
}

// --- 主逻辑 ---

// 1. 获取前端POST的原始数据
$data = json_decode(file_get_contents("php://input"));

// 2. 校验数据
if (!isset($data->phone) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '手机号和密码均不能为空']);
    exit;
}

$phone = $data->phone;
$password = $data->password;

// 3. 校验手机号格式 (简单校验)
if (!preg_match('/^\d{11}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的手机号格式']);
    exit;
}

// 4. 校验密码长度
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '密码长度不能少于6位']);
    exit;
}

// 5. 检查手机号是否已被注册
$users = getUsers($dbFile);
foreach ($users as $user) {
    if ($user['phone'] === $phone) {
        http_response_code(409); // 409 Conflict
        echo json_encode(['success' => false, 'message' => '该手机号已被注册']);
        exit;
    }
}

// 6. 密码加密 (安全核心)
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

// 7. 创建新用户
$newUserId = uniqid(); // 生成一个唯一的用户ID
$newUser = [
    'id' => $newUserId,
    'phone' => $phone,
    'passwordHash' => $passwordHash, // 存储加密后的密码
    'points' => 1000, // 初始积分
    'created_at' => date('Y-m-d H:i:s')
];

// 8. 保存新用户到数据库
$users[] = $newUser;
saveUsers($dbFile, $users);

// 9. 返回成功响应
http_response_code(201); // 201 Created
echo json_encode(['success' => true, 'userId' => $newUserId]);
?>

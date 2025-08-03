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

// --- 主逻辑 ---

// 1. 获取前端POST的数据
$data = json_decode(file_get_contents("php://input"));

// 2. 校验数据
if (!isset($data->phone) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '手机号和密码均不能为空']);
    exit;
}

$phone = $data->phone;
$password = $data->password;

// 3. 查找用户
$users = getUsers($dbFile);
$foundUser = null;
foreach ($users as $user) {
    if ($user['phone'] === $phone) {
        $foundUser = $user;
        break;
    }
}

// 4. 如果用户不存在
if ($foundUser === null) {
    http_response_code(404); // 404 Not Found
    echo json_encode(['success' => false, 'message' => '用户不存在']);
    exit;
}

// 5. 验证密码 (安全核心)
// 使用 password_verify() 来检查用户输入的密码是否与存储的哈希匹配
if (password_verify($password, $foundUser['passwordHash'])) {
    // 密码正确
    // 从返回的用户信息中移除敏感数据
    unset($foundUser['passwordHash']);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'userId' => $foundUser['id'],
        'user' => $foundUser
    ]);
} else {
    // 密码错误
    http_response_code(401); // 401 Unauthorized
    echo json_encode(['success' => false, 'message' => '密码错误']);
}
?>

<?php
// --- START OF FILE api/login.php (DATABASE VERSION) ---

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 1. 引入数据库连接
require_once 'db_connect.php';

// 2. 获取前端POST的数据
$data = json_decode(file_get_contents("php://input"));

// 3. 校验数据
if (!isset($data->phone) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '手机号和密码均不能为空']);
    exit;
}

$phone = $data->phone;
$password = $data->password;

// 4. 查找用户 (使用数据库查询)
// 使用预处理语句防止SQL注入
// 我们需要查询出用户的 ID, password, phone, points
$stmt = $conn->prepare("SELECT id, password, phone, points FROM users WHERE phone = ?");
$stmt->bind_param("s", $phone);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    // 找到了用户
    $foundUser = $result->fetch_assoc();
    
    // 5. 验证密码 (安全核心)
    // 使用 password_verify() 检查用户输入的密码是否与数据库中存储的哈希匹配
    if (password_verify($password, $foundUser['password'])) {
        // 密码正确
        // 准备返回给前端的用户数据，不包含密码哈希
        $userDataForFrontend = [
            'id' => $foundUser['id'],
            'phone' => $foundUser['phone'],
            'points' => $foundUser['points']
        ];

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'userId' => $foundUser['id'],
            'userData' => $userDataForFrontend // 保持和 register.php 返回的结构一致
        ]);
    } else {
        // 密码错误
        http_response_code(401); // 401 Unauthorized
        echo json_encode(['success' => false, 'message' => '手机号或密码错误']);
    }
} else {
    // 用户不存在
    http_response_code(404); // 404 Not Found
    // 为了安全，通常不明确提示是用户不存在还是密码错误，统一返回一个模糊的错误信息
    echo json_encode(['success' => false, 'message' => '手机号或密码错误']);
}

$stmt->close();
$conn->close();

// --- END OF FILE api/login.php (DATABASE VERSION) ---
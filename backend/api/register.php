<?php
// --- START OF FILE api/register.php (DATABASE VERSION) ---

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 1. 引入数据库连接
require_once 'db_connect.php';

// 2. 获取前端POST的原始数据
$data = json_decode(file_get_contents("php://input"));

// 3. 校验数据
if (!isset($data->phone) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '手机号和密码均不能为空']);
    exit;
}

$phone = $data->phone;
$password = $data->password;

// 4. 校验手机号格式 (简单校验)
if (!preg_match('/^\d{11}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的手机号格式']);
    exit;
}

// 5. 校验密码长度
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '密码长度不能少于6位']);
    exit;
}

// 6. 检查手机号是否已被注册 (使用数据库查询)
// 使用预处理语句防止SQL注入
$stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
$stmt->bind_param("s", $phone);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    http_response_code(409); // 409 Conflict
    echo json_encode(['success' => false, 'message' => '该手机号已被注册']);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();

// 7. 密码加密 (安全核心)
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

// 8. 创建新用户 (插入到数据库)
// 再次使用预处理语句
$stmt = $conn->prepare("INSERT INTO users (phone, password, points) VALUES (?, ?, ?)");
$initialPoints = 1000; // 初始积分
$stmt->bind_param("ssi", $phone, $passwordHash, $initialPoints);

if ($stmt->execute()) {
    // 注册成功
    $newUserId = $stmt->insert_id; // 获取新插入行的ID
    
    // 9. 返回成功响应
    http_response_code(201); // 201 Created
    echo json_encode([
        'success' => true,
        'userId' => $newUserId,
        'userData' => [ // 同时返回用户信息，方便前端直接登录
            'id' => $newUserId,
            'phone' => $phone,
            'points' => $initialPoints
        ]
    ]);
} else {
    // 插入失败
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '注册失败，请稍后再试。']);
}

$stmt->close();
$conn->close();

// --- END OF FILE api/register.php (DATABASE VERSION) ---
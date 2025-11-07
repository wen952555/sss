<?php
// 引入全局函数
require_once __DIR__ . '/../core/functions.php';

/**
 * 处理所有与用户相关的API请求
 * @param string|null $action 请求的操作 (e.g., 'register', 'login')
 * @param array $parts URL路径的各个部分
 */
function handle_user_request($action, $parts) {
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($action) {
        case 'register':
            if ($method === 'POST') {
                register_user();
            } else {
                json_response(['error' => 'Invalid request method for register'], 405);
            }
            break;
        case 'login':
            if ($method === 'POST') {
                login_user();
            } else {
                json_response(['error' => 'Invalid request method for login'], 405);
            }
            break;
        default:
            json_response(['error' => 'Unknown user action'], 404);
            break;
    }
}

/**
 * 用户注册
 */
function register_user() {
    $data = get_request_data();

    // 1. 验证输入
    if (empty($data['phone']) || empty($data['password'])) {
        json_response(['error' => 'Phone and password are required'], 400);
        return;
    }

    // TODO: 实现更详细的验证 (e.g., 手机号格式, 密码强度)

    // 2. 检查手机号是否已存在
    // TODO: 查询数据库检查手机号 `phone` 是否已在 `users` 表中

    // 3. 生成4位不重复的用户ID
    // TODO: 实现一个循环来生成一个唯一的4位ID `user_id_4d`

    // 4. 密码哈希
    // $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);

    // 5. 存入数据库
    // TODO: 将用户信息插入 `users` 表

    // 注册成功
    json_response(['message' => 'User registration successful', 'user_id' => 'xxxx'], 201);
}

/**
 * 用户登录
 */
function login_user() {
    $data = get_request_data();

    // 1. 验证输入
    if (empty($data['phone']) || empty($data['password'])) {
        json_response(['error' => 'Phone and password are required'], 400);
        return;
    }

    // 2. 从数据库查找用户
    // TODO: 根据 `phone` 查询用户信息

    // 3. 验证密码
    // if ($user && password_verify($data['password'], $user['password_hash'])) {
        // 4. 生成JWT (或 Session Token)
        // TODO: 实现JWT生成逻辑
        // $token = 'dummy-jwt-token-for-now';
        // json_response(['message' => 'Login successful', 'token' => $token]);
    // } else {
    //     json_response(['error' => 'Invalid phone or password'], 401);
    // }
    
    // 临时响应
    json_response(['message' => 'User login placeholder', 'token' => 'dummy-jwt-token']);
}
?>
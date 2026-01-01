<?php
// 引入 CORS 头部支持、数据库连接和错误处理
require_once 'V2_cors_and_db.php';

// 检查请求方法
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        send_json_response(['success' => false, 'message' => '用户名和密码不能为空']);
        exit;
    }

    // 检查用户名是否已存在
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetchColumn() > 0) {
        send_json_response(['success' => false, 'message' => '用户名已存在']);
        exit;
    }

    // 生成唯一长 ID 和短 ID
    $long_id = uniqid('user_', true);
    $short_id = substr(base_convert(sha1($long_id), 16, 36), 0, 8);

    // 密码哈希处理
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // 插入新用户，并给予初始积分
    $stmt = $pdo->prepare("INSERT INTO users (id, username, password_hash, short_id, points) VALUES (?, ?, ?, ?, ?)");
    if ($stmt->execute([$long_id, $username, $password_hash, $short_id, 100])) { // 初始积分为 100
        send_json_response(['success' => true, 'message' => '注册成功']);
    } else {
        send_json_response(['success' => false, 'message' => '注册失败，请稍后再试']);
    }
}
?>
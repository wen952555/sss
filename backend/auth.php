<?php
require_once 'db.php';

$action = $_GET['action'] ?? '';

// 工具函数：生成4位随机ID
function generateShortId($pdo) {
    $chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for ($i = 0; $i < 10; $i++) { // 最多尝试10次防止死循环
        $shortId = "";
        for ($j = 0; $j < 4; $j++) {
            $shortId .= $chars[rand(0, strlen($chars) - 1)];
        }
        $stmt = $pdo->prepare("SELECT id FROM users WHERE short_id = ?");
        $stmt->execute([$shortId]);
        if (!$stmt->fetch()) return $shortId;
    }
    return substr(md5(time()), 0, 4); // 保底方案
}

if ($action == 'register') {
    $phone = $_POST['phone'] ?? '';
    $pass = $_POST['password'] ?? '';
    
    if (empty($phone) || empty($pass)) {
        http_response_code(400);
        echo json_encode(['msg' => '参数不足']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['msg' => '手机号已存在']);
        exit;
    }

    $shortId = generateShortId($pdo);
    $hashedPass = password_hash($pass, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("INSERT INTO users (phone, password, short_id, points) VALUES (?, ?, ?, 0)");
    if ($stmt->execute([$phone, $hashedPass, $shortId])) {
        echo json_encode(['msg' => '注册成功', 'short_id' => $shortId]);
    } else {
        http_response_code(500);
        echo json_encode(['msg' => '注册失败']);
    }
}

if ($action == 'login') {
    $phone = $_POST['phone'] ?? '';
    $pass = $_POST['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    $user = $stmt->fetch();

    if ($user && password_verify($pass, $user['password'])) {
        // 为了简化，直接用加密后的密码作为 Token 返回
        echo json_encode([
            'token' => $user['password'],
            'user' => [
                'phone' => $user['phone'],
                'short_id' => $user['short_id'],
                'points' => $user['points']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['msg' => '手机号或密码错误']);
    }
}

if ($action == 'search') {
    $phone = $_GET['phone'] ?? '';
    $stmt = $pdo->prepare("SELECT short_id FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    $user = $stmt->fetch();

    if ($user) {
        echo json_encode(['short_id' => $user['short_id']]);
    } else {
        http_response_code(404);
        echo json_encode(['msg' => '用户不存在']);
    }
}
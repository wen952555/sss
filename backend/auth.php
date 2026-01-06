<?php
// backend/auth.php (确保此文件不包含 api.php，避免死循环)

if ($action == 'register') {
    $phone = $_POST['phone'] ?? '';
    $pass = $_POST['password'] ?? '';
    
    if (empty($phone) || empty($pass)) {
        sendResponse(['msg' => '手机号和密码不能为空'], 400);
    }

    // 检查是否已存在
    $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    if ($stmt->fetch()) {
        sendResponse(['msg' => '该手机号已被注册'], 400);
    }

    $shortId = substr(str_shuffle("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"), 0, 4);
    $hashedPass = password_hash($pass, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("INSERT INTO users (phone, password, short_id, points) VALUES (?, ?, ?, 1000)"); // 注册送1000分
    if ($stmt->execute([$phone, $hashedPass, $shortId])) {
        sendResponse(['msg' => '注册成功', 'id' => $shortId]);
    } else {
        sendResponse(['msg' => '数据库写入失败'], 500);
    }
}

if ($action == 'login') {
    $phone = $_POST['phone'] ?? '';
    $pass = $_POST['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    $user = $stmt->fetch();

    if ($user && password_verify($pass, $user['password'])) {
        // 使用 password hash 作为临时 Token
        sendResponse([
            'token' => $user['password'],
            'user' => [
                'short_id' => $user['short_id'],
                'points' => $user['points']
            ]
        ]);
    } else {
        sendResponse(['msg' => '手机号或密码错误'], 401);
    }
}
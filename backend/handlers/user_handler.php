<?php
// handlers/user_handler.php

function handleRegister($pdo, $data) {
    $phone = $data['phone'] ?? '';
    $password = $data['password'] ?? '';

    // 验证输入
    if (empty($phone) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '手机号和密码不能为空']);
        return;
    }

    // 验证手机号格式
    if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '手机号格式不正确']);
        return;
    }

    // 验证密码长度
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '密码长度不能少于6位']);
        return;
    }

    // 检查手机号是否已存在
    $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => '手机号已被注册']);
        return;
    }

    // 生成唯一的4位数ID
    $maxAttempts = 10;
    $attempts = 0;
    $userId4d = null;
    
    do {
        $userId4d = str_pad(mt_rand(0, 9999), 4, '0', STR_PAD_LEFT);
        $stmt = $pdo->prepare("SELECT id FROM users WHERE user_id_4d = ?");
        $stmt->execute([$userId4d]);
        $attempts++;
        
        if ($attempts > $maxAttempts) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '系统繁忙，请稍后重试']);
            return;
        }
    } while ($stmt->fetch());

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    try {
        $stmt = $pdo->prepare("INSERT INTO users (user_id_4d, phone, password_hash, points) VALUES (?, ?, ?, 1000)");
        if ($stmt->execute([$userId4d, $phone, $passwordHash])) {
            echo json_encode([
                'success' => true, 
                'message' => '注册成功',
                'user_id_4d' => $userId4d
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => '注册失败，请稍后重试']);
        }
    } catch (PDOException $e) {
        error_log("Registration error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '数据库错误，请稍后重试']);
    }
}

function handleLogin($pdo, $data) {
    $phone = $data['phone'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($phone) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '手机号和密码不能为空']);
        return;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, password_hash, user_id_4d, points FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            // 生成新的token
            $token = bin2hex(random_bytes(32));
            
            // 更新用户token
            $updateStmt = $pdo->prepare("UPDATE users SET auth_token = ? WHERE id = ?");
            $updateStmt->execute([$token, $user['id']]);
            
            echo json_encode([
                'success' => true, 
                'token' => $token,
                'user' => [
                    'user_id_4d' => $user['user_id_4d'],
                    'points' => $user['points']
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => '手机号或密码错误']);
        }
    } catch (PDOException $e) {
        error_log("Login error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '登录失败，请稍后重试']);
    }
}

function getUserByToken($pdo, $token) {
    if (empty($token)) {
        return null;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT id, user_id_4d, phone, points FROM users WHERE auth_token = ?");
        $stmt->execute([$token]);
        return $stmt->fetch();
    } catch (PDOException $e) {
        error_log("Get user by token error: " . $e->getMessage());
        return null;
    }
}
?>
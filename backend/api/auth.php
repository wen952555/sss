<?php
session_start();
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/functions.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['action']) && $input['action'] === 'register') {
        $phone = sanitize_input($input['phone']);
        $password = password_hash(sanitize_input($input['password']), PASSWORD_DEFAULT);
        
        // 检查手机号是否已存在
        $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        if ($stmt->fetch()) {
            json_response(['success' => false, 'message' => '手机号已注册']);
        }
        
        // 创建新用户
        $stmt = $pdo->prepare("INSERT INTO users (phone, password, points, created_at) VALUES (?, ?, 1000, NOW())");
        if ($stmt->execute([$phone, $password])) {
            $_SESSION['user_id'] = $pdo->lastInsertId();
            json_response(['success' => true, 'user' => ['id' => $_SESSION['user_id'], 'phone' => $phone, 'points' => 1000]]);
        } else {
            json_response(['success' => false, 'message' => '注册失败']);
        }
    }
    
    if (isset($input['action']) && $input['action'] === 'login') {
        $phone = sanitize_input($input['phone']);
        $password = sanitize_input($input['password']);
        
        $stmt = $pdo->prepare("SELECT id, password, points FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            json_response(['success' => true, 'user' => ['id' => $user['id'], 'phone' => $phone, 'points' => $user['points']]]);
        } else {
            json_response(['success' => false, 'message' => '手机号或密码错误']);
        }
    }
    
    if (isset($input['action']) && $input['action'] === 'logout') {
        session_destroy();
        json_response(['success' => true]);
    }
} else {
    http_response_code(405);
    echo "Method not allowed";
}

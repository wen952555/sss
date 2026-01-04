<?php
/* backend/api/auth.php */
require_once __DIR__ . '/../lib/DB.php';

$pdo = DB::connect();
$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

if ($action === 'register') {
    $phone = $data['phone'] ?? '';
    $password = $data['password'] ?? '';
    
    if (empty($phone) || empty($password)) {
        echo json_encode(['error' => '手机号和密码不能为空']);
        exit;
    }
    
    // 生成一个随机的4位短ID
    $shortId = sprintf("%04d", mt_rand(0, 9999));
    
    try {
        $stmt = $pdo->prepare("INSERT INTO users (phone, short_id, password) VALUES (?, ?, ?)");
        $stmt->execute([$phone, $shortId, password_hash($password, PASSWORD_DEFAULT)]);
        echo json_encode(['success' => true, 'short_id' => $shortId]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            echo json_encode(['error' => '该手机号已注册']);
        } else {
            echo json_encode(['error' => '注册失败: ' . $e->getMessage()]);
        }
    }
} elseif ($action === 'login') {
    $phone = $data['phone'] ?? '';
    $password = $data['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        unset($user['password']); // 不要返回密码
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['error' => '手机号或密码错误']);
    }
} else {
    echo json_encode(['error' => '无效的操作']);
}

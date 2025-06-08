<?php
session_start();
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/functions.php';

if (!isset($_SESSION['user_id'])) {
    json_response(['success' => false, 'message' => '未登录']);
}

$method = $_SERVER['REQUEST_METHOD'];
$user_id = $_SESSION['user_id'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // 保存游戏结果
    if (isset($input['action']) && $input['action'] === 'save_result') {
        $result = sanitize_input($input['result']); // win, lose, draw
        $points_change = (int)$input['points_change'];
        
        // 更新用户积分
        $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?");
        $stmt->execute([$points_change, $user_id]);
        
        // 记录游戏
        $stmt = $pdo->prepare("INSERT INTO game_records (user_id, result, points_change) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $result, $points_change]);
        
        // 获取更新后的积分
        $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $points = $stmt->fetchColumn();
        
        json_response(['success' => true, 'points' => $points]);
    }
} else {
    http_response_code(405);
    echo "Method not allowed";
}

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
    
    // 赠送积分
    if (isset($input['action']) && $input['action'] === 'send_points') {
        $recipient_phone = sanitize_input($input['recipient_phone']);
        $amount = (int)$input['amount'];
        
        if ($amount <= 0) {
            json_response(['success' => false, 'message' => '积分必须大于0']);
        }
        
        // 检查自己的积分
        $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        $sender_points = $stmt->fetchColumn();
        
        if ($sender_points < $amount) {
            json_response(['success' => false, 'message' => '积分不足']);
        }
        
        // 检查接收方是否存在
        $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
        $stmt->execute([$recipient_phone]);
        $recipient = $stmt->fetch();
        
        if (!$recipient) {
            json_response(['success' => false, 'message' => '接收方不存在']);
        }
        
        $recipient_id = $recipient['id'];
        
        // 开始事务
        $pdo->beginTransaction();
        
        try {
            // 扣除发送方积分
            $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ?");
            $stmt->execute([$amount, $user_id]);
            
            // 增加接收方积分
            $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?");
            $stmt->execute([$amount, $recipient_id]);
            
            // 记录交易
            $stmt = $pdo->prepare("INSERT INTO point_transactions (sender_id, receiver_id, amount, transaction_type) VALUES (?, ?, ?, 'transfer')");
            $stmt->execute([$user_id, $recipient_id, $amount]);
            
            $pdo->commit();
            
            // 获取更新后的积分
            $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $points = $stmt->fetchColumn();
            
            json_response(['success' => true, 'points' => $points]);
        } catch (Exception $e) {
            $pdo->rollBack();
            json_response(['success' => false, 'message' => '交易失败']);
        }
    }
} else if ($method === 'GET') {
    // 获取积分交易记录
    $stmt = $pdo->prepare("
        SELECT t.*, 
               s.phone as sender_phone,
               r.phone as receiver_phone
        FROM point_transactions t
        LEFT JOIN users s ON t.sender_id = s.id
        JOIN users r ON t.receiver_id = r.id
        WHERE t.sender_id = ? OR t.receiver_id = ?
        ORDER BY t.created_at DESC
        LIMIT 10
    ");
    $stmt->execute([$user_id, $user_id]);
    $transactions = $stmt->fetchAll();
    
    json_response(['success' => true, 'transactions' => $transactions]);
} else {
    http_response_code(405);
    echo "Method not allowed";
}

<?php
require_once 'db.php';

$userId = authCheck();

if ($_GET['action'] == 'send') {
    $toShortId = $_POST['to_id'] ?? '';
    $amount = intval($_POST['amount'] ?? 0);

    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(['msg' => '金额无效']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        // 1. 扣除自己积分
        $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ? AND points >= ?");
        $stmt->execute([$amount, $userId, $amount]);
        
        if ($stmt->rowCount() == 0) {
            throw new Exception("积分不足");
        }

        // 2. 增加对方积分
        $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE short_id = ?");
        $stmt->execute([$amount, $toShortId]);
        
        if ($stmt->rowCount() == 0) {
            throw new Exception("目标用户不存在");
        }

        // 3. 记录日志
        $stmt = $pdo->prepare("INSERT INTO point_logs (user_id, amount, type, target_id) VALUES (?, ?, 'transfer', (SELECT id FROM users WHERE short_id = ?))");
        $stmt->execute([$userId, -$amount, $toShortId]);

        $pdo->commit();
        echo json_encode(['msg' => '赠送成功']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(['msg' => $e->getMessage()]);
    }
}
<?php
// 引入 CORS 头部支持、数据库连接和错误处理
require_once 'V2_cors_and_db.php';

// 验证会话
if (!isset($_SESSION['user_id'])) {
    send_json_response(['success' => false, 'message' => '未授权的访问'], 401);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $to_short_id = $data['to_short_id'] ?? '';
    $amount = filter_var($data['amount'] ?? 0, FILTER_VALIDATE_INT);

    if (empty($to_short_id) || $amount <= 0) {
        send_json_response(['success' => false, 'message' => '接收方 ID 或金额无效']);
        exit;
    }

    $from_user_id = $_SESSION['user_id'];

    try {
        $pdo->beginTransaction();

        // 检查付款方积分是否足够
        $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->execute([$from_user_id]);
        $from_user = $stmt->fetch();

        if (!$from_user || $from_user['points'] < $amount) {
            send_json_response(['success' => false, 'message' => '积分不足']);
            $pdo->rollBack();
            exit;
        }

        // 检查收款方是否存在
        $stmt = $pdo->prepare("SELECT id FROM users WHERE short_id = ?");
        $stmt->execute([$to_short_id]);
        $to_user = $stmt->fetch();

        if (!$to_user) {
            send_json_response(['success' => false, 'message' => '接收用户不存在']);
            $pdo->rollBack();
            exit;
        }
        $to_user_id = $to_user['id'];

        if ($from_user_id === $to_user_id) {
            send_json_response(['success' => false, 'message' => '不能给自己转账']);
            $pdo->rollBack();
            exit;
        }

        // 执行转账
        $stmt_from = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ?");
        $stmt_from->execute([$amount, $from_user_id]);

        $stmt_to = $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?");
        $stmt_to->execute([$amount, $to_user_id]);

        $pdo->commit();

        send_json_response(['success' => true, 'message' => '转账成功']);

    } catch (Exception $e) {
        $pdo->rollBack();
        send_json_response(['success' => false, 'message' => '转账失败: ' . $e->getMessage()]);
    }
}
?>
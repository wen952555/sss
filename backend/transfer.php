<?php
require_once 'db.php';

if ($_GET['action'] == 'send') {
    $fromUser = authCheck();
    $toShortId = $_POST['to_id'];
    $amount = intval($_POST['amount']);

    $pdo->beginTransaction();
    $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ? AND points >= ?");
    $stmt->execute([$amount, $fromUser, $amount]);

    if ($stmt->rowCount() > 0) {
        $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE short_id = ?");
        $stmt->execute([$amount, $toShortId]);
        $pdo->commit();
        echo json_encode(['msg' => '赠送成功']);
    } else {
        $pdo->rollBack();
        http_response_code(400);
        echo json_encode(['msg' => '余额不足']);
    }
}

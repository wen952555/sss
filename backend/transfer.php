<?php
session_start();
require 'db.php';
require 'utils.php';

if (!isset($_SESSION['user_id'])) sendJSON(["error" => "请先登录"], 401);

$data = json_decode(file_get_contents("php://input"), true);
$from_id = $_SESSION['user_id'];
$to_id = $data['to_id'] ?? '';
$amount = (int)($data['amount'] ?? 0);

if ($amount <= 0) sendJSON(["error" => "金额错误"], 400);
if ($from_id == $to_id) sendJSON(["error" => "不能给自己转账"], 400);

$pdo->beginTransaction();
try {
    // 扣除积分
    $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE short_id = ? AND points >= ?");
    $stmt->execute([$amount, $from_id, $amount]);
    if ($stmt->rowCount() == 0) throw new Exception("余额不足");

    // 增加积分
    $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE short_id = ?");
    $stmt->execute([$amount, $to_id]);
    if ($stmt->rowCount() == 0) throw new Exception("接收人不存在");

    $pdo->commit();
    sendJSON(["success" => true]);
} catch (Exception $e) {
    $pdo->rollBack();
    sendJSON(["error" => $e->getMessage()], 400);
}
?>
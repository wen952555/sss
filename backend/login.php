<?php
session_start();
require 'db.php';
require 'utils.php';

$data = json_decode(file_get_contents("php://input"), true);
$phone = $data['phone'] ?? '';
$password = $data['password'] ?? '';

$stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
$stmt->execute([$phone]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($password, $user['password'])) {
    $_SESSION['user_id'] = $user['short_id'];
    sendJSON([
        "success" => true, 
        "user" => [
            "short_id" => $user['short_id'],
            "phone" => $user['phone'],
            "points" => $user['points']
        ]
    ]);
} else {
    sendJSON(["error" => "手机号或密码错误"], 401);
}
?>
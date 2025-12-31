<?php
require 'db.php';
require 'utils.php';

$data = json_decode(file_get_contents("php://input"), true);
$phone = trim($data['phone'] ?? ''); // Trim the phone number
$password = $data['password'] ?? '';

if (empty($phone)) sendJSON(["error" => "请输入手机号"], 400);
if (strlen($password) < 6) sendJSON(["error" => "密码至少6位"], 400);

$short_id = generateShortId();
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

try {
    $stmt = $pdo->prepare("INSERT INTO users (short_id, phone, password) VALUES (?, ?, ?)");
    $stmt->execute([$short_id, $phone, $hashed_password]);
    sendJSON(["success" => true, "short_id" => $short_id]);
} catch (Exception $e) {
    sendJSON(["error" => "手机号已存在"], 400);
}
?>
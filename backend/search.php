<?php
require 'db.php';
require 'utils.php';

$phone = $_GET['phone'] ?? '';
$stmt = $pdo->prepare("SELECT short_id FROM users WHERE phone = ?");
$stmt->execute([$phone]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) sendJSON($user);
else sendJSON(["error" => "未找到用户"], 404);
?>
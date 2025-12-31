<?php
require 'db.php';
require 'utils.php';

$content = file_get_contents("php://input");
$update = json_decode($content, true);
$token = getEnvConfig('BOT_TOKEN');
$admin_id = getEnvConfig('ADMIN_TG_ID');

if (!$update || !isset($update['message'])) exit;

$message = $update['message'];
$chat_id = $message['chat']['id'];
$text = $message['text'] ?? '';

function reply($cid, $txt, $tok) {
    $url = "https://api.telegram.org/bot$tok/sendMessage";
    $data = ['chat_id' => $cid, 'text' => $txt];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
}

if ($chat_id != $admin_id) {
    reply($chat_id, "您没有管理员权限。您的ID是: " . $chat_id, $token);
    exit;
}

if ($text == '/start') {
    reply($chat_id, "指令列表:\n/users - 查看所有用户\n/points [ID] [数量] - 增减积分\n/del [ID] - 删除用户", $token);
} elseif ($text == '/users') {
    $stmt = $pdo->query("SELECT short_id, phone, points FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $out = "用户列表:\n";
    foreach($users as $u) $out .= "ID: {$u['short_id']} | 手机: {$u['phone']} | 积分: {$u['points']}\n";
    reply($chat_id, $out, $token);
} elseif (preg_match('/^\/points\s+(\w+)\s+(-?\d+)/', $text, $m)) {
    $sid = $m[1];
    $amt = (int)$m[2];
    $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE short_id = ?");
    $stmt->execute([$amt, $sid]);
    reply($chat_id, "用户 $sid 积分已更新 $amt", $token);
} elseif (preg_match('/^\/del\s+(\w+)/', $text, $m)) {
    $sid = $m[1];
    $stmt = $pdo->prepare("DELETE FROM users WHERE short_id = ?");
    $stmt->execute([$sid]);
    reply($chat_id, "用户 $sid 已从系统删除", $token);
}
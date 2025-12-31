<?php
require 'db.php';
$update = json_decode(file_get_contents("php://input"), true);
$admin_id = getEnvConfig('ADMIN_TG_ID'); // .env 中的管理员ID
$token = getEnvConfig('BOT_TOKEN');

if (!$update) exit;

$chat_id = $update['message']['chat']['id'];
$text = $update['message']['text'];

// 简单的指令解析: /points 4位ID 增减值
if ($chat_id == $admin_id) {
    if (strpos($text, '/points') === 0) {
        $parts = explode(' ', $text);
        $target_id = $parts[1];
        $amount = (int)$parts[2];
        $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE short_id = ?");
        $stmt->execute([$amount, $target_id]);
        sendMessage($chat_id, "用户 $target_id 积分已调整 $amount", $token);
    }
    if (strpos($text, '/del') === 0) {
        $target_id = explode(' ', $text)[1];
        $pdo->prepare("DELETE FROM users WHERE short_id = ?")->execute([$target_id]);
        sendMessage($chat_id, "用户 $target_id 已删除", $token);
    }
    if ($text == '/users') {
        $stmt = $pdo->query("SELECT short_id, phone, points FROM users");
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $msg = "用户列表:\n";
        foreach($res as $u) $msg .= "ID: {$u['short_id']} | {$u['phone']} | 积分: {$u['points']}\n";
        sendMessage($chat_id, $msg, $token);
    }
}

function sendMessage($chat_id, $text, $token) {
    $url = "https://api.telegram.org/bot$token/sendMessage?chat_id=$chat_id&text=".urlencode($text);
    file_get_contents($url);
}
?>
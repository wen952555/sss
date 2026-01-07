<?php
require_once 'config.php';
$content = file_get_contents("php://input");
$update = json_decode($content, true);
$chatId = $update['message']['chat']['id'];
$text = $update['message']['text'];

if ($chatId != $_ENV['ADMIN_TG_ID']) exit;

$args = explode(' ', $text);
if ($args[0] == '/find') {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
    $stmt->execute([$args[1]]);
    $u = $stmt->fetch();
    $msg = $u ? "{$u['nickname']} | 积分: {$u['points']}" : "查无此人";
    file_get_contents("https://api.telegram.org/bot{$_ENV['BOT_TOKEN']}/sendMessage?chat_id=$chatId&text=".urlencode($msg));
}
// 同样实现 /add, /sub, /del 指令...
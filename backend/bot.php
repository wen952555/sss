<?php
// backend/bot.php
require 'db.php';
$env = parse_ini_file('.env');
$token = $env['BOT_TOKEN'];
$admin_id = $env['ADMIN_ID'];

$update = json_decode(file_get_contents('php://input'), true);
if (!$update) exit;

$msg = $update['message'];
$text = $msg['text'];
$chat_id = $msg['chat']['id'];

if ($chat_id != $admin_id) exit;

if (strpos($text, '/points') === 0) {
    $uid = str_replace('/points ', '', $text);
    $stmt = $pdo->prepare("SELECT phone, points FROM users WHERE uid = ?");
    $stmt->execute([$uid]);
    $u = $stmt->fetch();
    $reply = $u ? "用户 {$uid}\n手机: {$u['phone']}\n积分: {$u['points']}" : "未找到";
} elseif (strpos($text, '/add') === 0) {
    // 格式: /add UID 1000
    list($cmd, $uid, $amt) = explode(' ', $text);
    $pdo->prepare("UPDATE users SET points = points + ? WHERE uid = ?")->execute([$amt, $uid]);
    $reply = "已给 $uid 增加 $amt 积分";
} elseif (strpos($text, '/del') === 0) {
    $uid = str_replace('/del ', '', $text);
    $pdo->prepare("DELETE FROM users WHERE uid = ?")->execute([$uid]);
    $reply = "用户 $uid 已删除";
} else {
    $reply = "管理指令:\n/points UID - 查看\n/add UID 数量 - 增减\n/del UID - 删除";
}

file_get_contents("https://api.telegram.org/bot$token/sendMessage?chat_id=$chat_id&text=".urlencode($reply));
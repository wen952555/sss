<?php
/* backend/api/bot.php */
// 管理员TG操作：/search 手机号, /add ID 积分, /del ID
require_once '../lib/DB.php';
$env = parse_ini_file('../.env');
$data = json_decode(file_get_contents("php://input"), true);
$chatId = $data['message']['chat']['id'];
$text = $data['message']['text'];

if ($chatId != $env['ADMIN_ID']) exit;

$pdo = DB::connect();
$parts = explode(' ', $text);
$cmd = $parts[0];

if ($cmd === '/search') {
    $stmt = $pdo->prepare("SELECT phone, short_id, points FROM users WHERE phone = ?");
    $stmt->execute([$parts[1]]);
    $res = $stmt->fetch();
    $msg = $res ? "ID: {$res['short_id']}\n积分: {$res['points']}" : "未找到用户";
} elseif ($cmd === '/add') {
    $pdo->prepare("UPDATE users SET points = points + ? WHERE short_id = ?")
        ->execute([$parts[2], $parts[1]]);
    $msg = "积分充值成功！";
}

file_get_contents("https://api.telegram.org/bot{$env['BOT_TOKEN']}/sendMessage?chat_id=$chatId&text=".urlencode($msg));

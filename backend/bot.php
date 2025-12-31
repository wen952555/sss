<?php
require 'db.php';
require 'utils.php';

$content = file_get_contents("php://input");
$update = json_decode($content, true);
$token = getEnvConfig('BOT_TOKEN');
$admin_id = getEnvConfig('ADMIN_TG_ID');

if (!$update || !isset($update['message'])) {
    exit;
}

$message = $update['message'];
$chat_id = $message['chat']['id'];
$text = $message['text'] ?? '';

function reply($cid, $txt, $tok) {
    $url = "https://api.telegram.org/bot$tok/sendMessage";
    $data = ['chat_id' => $cid, 'text' => $txt];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_exec($ch);
    curl_close($ch);
}

// Security Check: Only the admin can interact with this bot.
if (empty($admin_id) || (string)$chat_id !== $admin_id) {
    reply($chat_id, "您没有管理员权限。您的ID是: " . $chat_id, $token);
    error_log("Unauthorized access attempt by chat ID: " . $chat_id);
    exit;
}

if ($text == '/start') {
    reply($chat_id, "指令列表:\n/users - 查看所有用户\n/points [ID] [数量] - 增减积分\n/del [ID] - 删除用户", $token);
} elseif ($text == '/users') {
    $stmt = $pdo->query("SELECT short_id, points FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($users) === 0) {
        $out = "系统内没有用户。";
    } else {
        $out = "用户列表:\n";
        foreach($users as $u) {
            $out .= "ID: {$u['short_id']} | 积分: {$u['points']}\n";
        }
    }
    reply($chat_id, $out, $token);
} elseif (preg_match('/^\/points\s+(\w+)\s+(-?\d+)/', $text, $m)) {
    $sid = $m[1];
    $amt = (int)$m[2];
    $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE short_id = ?");
    if ($stmt->execute([$amt, $sid]) && $stmt->rowCount() > 0) {
        reply($chat_id, "用户 $sid 积分已更新 $amt", $token);
    } else {
        reply($chat_id, "操作失败。未找到用户 $sid 或数据库错误。", $token);
    }
} elseif (preg_match('/^\/del\s+(\w+)/', $text, $m)) {
    $sid = $m[1];
    $stmt = $pdo->prepare("DELETE FROM users WHERE short_id = ?");
    if ($stmt->execute([$sid]) && $stmt->rowCount() > 0) {
        reply($chat_id, "用户 $sid 已从系统删除", $token);
    } else {
        reply($chat_id, "操作失败。未找到用户 $sid 或数据库错误。", $token);
    }
} else {
    reply($chat_id, "未知指令: '$text'", $token);
}

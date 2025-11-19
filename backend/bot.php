<?php
// backend/bot.php
require 'db.php';

// 从 .env 或直接配置 Token
$botToken = getenv('TG_BOT_TOKEN') ?: 'YOUR_BOT_TOKEN_HERE';

$update = json_decode(file_get_contents('php://input'), true);
if (!$update || !isset($update['message'])) exit;

$chatId = $update['message']['chat']['id'];
$text = trim($update['message']['text']);
$parts = explode(' ', $text);
$command = strtolower($parts[0]);

// 1. 简单的管理员鉴权 (首次运行时手动数据库添加你的 chat_id，或者设置一个口令来认领管理员)
// 这里假设已经在 tg_admins 表里了，或者你可以通过 /claim your_secret_password 来认领
$stmt = $pdo->prepare("SELECT * FROM tg_admins WHERE chat_id = ?");
$stmt->execute([$chatId]);
$isAdmin = $stmt->fetch();

// 简单的认领命令 (方便你第一次初始化)
if ($command === '/claim' && isset($parts[1]) && $parts[1] === 'admin123') {
    $pdo->prepare("INSERT IGNORE INTO tg_admins (chat_id) VALUES (?)")->execute([$chatId]);
    sendMessage($chatId, "✅ 您已成为管理员", $botToken);
    exit;
}

if (!$isAdmin) {
    sendMessage($chatId, "⛔ 权限不足", $botToken);
    exit;
}

// --- 管理员功能 ---

// 检查库存 & 自动补货
if ($command === '/checkdecks') {
    $stmt = $pdo->query("SELECT count(*) FROM pre_decks");
    $count = $stmt->fetchColumn();
    
    $msg = "当前牌局库存: $count 局\n";
    
    if ($count < 80) {
        $msg .= "⚠️ 库存不足 80，正在自动生成补满 320...\n";
        sendMessage($chatId, $msg, $botToken);
        
        // 调用生成逻辑 (这部分逻辑最好封装在类里，这里简化直接写)
        // 补充数量
        $needed = 320 - $count;
        // 引入生成函数 (假设 seed_decks.php 改造成了函数库)
        require_once 'core/DeckGenerator.php'; 
        DeckGenerator::fill($pdo, $needed);
        
        sendMessage($chatId, "✅ 已补货完成，当前库存 320。", $botToken);
    } else {
        $msg .= "✅ 库存充足。";
        sendMessage($chatId, $msg, $botToken);
    }
}

// 增加/扣除 积分: /points [手机号] [分数] (正数加，负数减)
elseif ($command === '/points') {
    if (count($parts) < 3) {
        sendMessage($chatId, "用法: /points 手机号 积分变更(例如: 100 或 -100)", $botToken);
        exit;
    }
    $mobile = $parts[1];
    $amount = intval($parts[2]);
    
    $stmt = $pdo->prepare("SELECT id, points FROM users WHERE mobile = ?");
    $stmt->execute([$mobile]);
    $user = $stmt->fetch();
    
    if (!$user) {
        sendMessage($chatId, "❌ 用户未找到", $botToken);
    } else {
        $newPoints = $user['points'] + $amount;
        $pdo->prepare("UPDATE users SET points = ? WHERE id = ?")->execute([$newPoints, $user['id']]);
        sendMessage($chatId, "✅ 用户 $mobile 积分已更新。\n原积分: {$user['points']}\n现积分: $newPoints", $botToken);
    }
}

// 删除用户: /deluser [手机号]
elseif ($command === '/deluser') {
    if (!isset($parts[1])) {
        sendMessage($chatId, "用法: /deluser 手机号", $botToken);
        exit;
    }
    $mobile = $parts[1];
    
    // 由于设置了 ON DELETE CASCADE，删除 users 表会自动删除关联的 game_actions 和 session_players
    $stmt = $pdo->prepare("DELETE FROM users WHERE mobile = ?");
    $stmt->execute([$mobile]);
    
    if ($stmt->rowCount() > 0) {
        sendMessage($chatId, "✅ 用户 $mobile 及其所有数据已删除。", $botToken);
    } else {
        sendMessage($chatId, "❌ 用户未找到。", $botToken);
    }
}

// 帮助
elseif ($command === '/start' || $command === '/help') {
    $msg = "🎮 十三水管理员后台\n\n";
    $msg .= "/checkdecks - 检查库存(不足80自动补)\n";
    $msg .= "/points [手机] [数量] - 增减积分\n";
    $msg .= "/deluser [手机] - 删除用户\n";
    sendMessage($chatId, $msg, $botToken);
}

function sendMessage($chatId, $text, $token) {
    $url = "https://api.telegram.org/bot$token/sendMessage";
    $data = ['chat_id' => $chatId, 'text' => $text];
    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data),
        ],
    ];
    $context  = stream_context_create($options);
    file_get_contents($url, false, $context);
}
?>
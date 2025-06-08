<?php
require_once __DIR__ . '/../backend/config/db.php';
require_once __DIR__ . '/../backend/includes/functions.php';

// Telegram机器人配置
define('BOT_TOKEN', 'YOUR_TELEGRAM_BOT_TOKEN');
define('ADMIN_CHAT_ID', 'YOUR_ADMIN_CHAT_ID');

// 处理Telegram Webhook
$content = file_get_contents("php://input");
$update = json_decode($content, true);

if (!$update) {
    exit;
}

$message = $update['message'];
$chatId = $message['chat']['id'];
$text = $message['text'] ?? '';
$command = explode(' ', $text)[0] ?? '';

// 验证管理员
$isAdmin = ($chatId == ADMIN_CHAT_ID);

// 命令处理
switch ($command) {
    case '/start':
        sendMessage($chatId, "欢迎使用十三水游戏管理员机器人");
        break;
        
    case '/addpoints':
        if (!$isAdmin) {
            sendMessage($chatId, "您没有权限执行此操作");
            break;
        }
        
        $parts = explode(' ', $text);
        if (count($parts) < 3) {
            sendMessage($chatId, "用法: /addpoints [手机号] [积分]");
            break;
        }
        
        $phone = $parts[1];
        $points = intval($parts[2]);
        
        // 更新用户积分
        $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE phone = ?");
        if ($stmt->execute([$points, $phone]) && $stmt->rowCount() > 0) {
            sendMessage($chatId, "成功为用户 {$phone} 添加 {$points} 积分");
        } else {
            sendMessage($chatId, "操作失败，用户不存在或数据库错误");
        }
        break;
        
    case '/removepoints':
        if (!$isAdmin) {
            sendMessage($chatId, "您没有权限执行此操作");
            break;
        }
        
        $parts = explode(' ', $text);
        if (count($parts) < 3) {
            sendMessage($chatId, "用法: /removepoints [手机号] [积分]");
            break;
        }
        
        $phone = $parts[1];
        $points = intval($parts[2]);
        
        // 更新用户积分
        $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE phone = ? AND points >= ?");
        if ($stmt->execute([$points, $phone, $points]) && $stmt->rowCount() > 0) {
            sendMessage($chatId, "成功为用户 {$phone} 扣除 {$points} 积分");
        } else {
            sendMessage($chatId, "操作失败，用户不存在、积分不足或数据库错误");
        }
        break;
        
    case '/userinfo':
        if (!$isAdmin) {
            sendMessage($chatId, "您没有权限执行此操作");
            break;
        }
        
        $parts = explode(' ', $text);
        if (count($parts) < 2) {
            sendMessage($chatId, "用法: /userinfo [手机号]");
            break;
        }
        
        $phone = $parts[1];
        $stmt = $pdo->prepare("SELECT id, phone, points, created_at FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            $info = "用户ID: {$user['id']}\n手机号: {$user['phone']}\n积分: {$user['points']}\n注册时间: {$user['created_at']}";
            sendMessage($chatId, $info);
        } else {
            sendMessage($chatId, "用户不存在");
        }
        break;
        
    default:
        if ($isAdmin) {
            sendMessage($chatId, "可用命令:\n/addpoints [手机号] [积分]\n/removepoints [手机号] [积分]\n/userinfo [手机号]");
        }
        break;
}

function sendMessage($chatId, $text) {
    $url = "https://api.telegram.org/bot" . BOT_TOKEN . "/sendMessage";
    $data = [
        'chat_id' => $chatId,
        'text' => $text
    ];
    
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query($data)
        ]
    ];
    
    $context = stream_context_create($options);
    file_get_contents($url, false, $context);
}

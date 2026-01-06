<?php
require_once 'db.php'; // For $pdo object

// --- Telegram Bot Configuration ---
$botToken = getenv('TELEGRAM_BOT_TOKEN');
$apiUrl = "https://api.telegram.org/bot" . $botToken;
$adminId = getenv('ADMIN_TELEGRAM_ID');
// ---

// 此脚本由 Telegram Webhook 调用
$content = file_get_contents("php://input");
$update = json_decode($content, true);

// Basic validation
if (!isset($update["message"]["chat"]["id"])) {
    exit;
}

$chatId = $update["message"]["chat"]["id"];
$text = $update["message"]["text"] ?? '';

// 验证管理员ID
if ($chatId != $adminId) exit;

// 处理命令
if (strpos($text, "/points") === 0) {
    // 逻辑：搜索用户积分 /points 13800000000
    $parts = explode(" ", $text);
    if (count($parts) < 2) exit; // Ignore if no phone number
    $phone = $parts[1];
    
    $stmt = $pdo->prepare("SELECT points, short_id FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    $u = $stmt->fetch();
    
    $message = $u ? "用户ID: {$u['short_id']}, 积分: {$u['points']}" : "未找到用户";
    file_get_contents($apiUrl . "/sendMessage?chat_id=$chatId&text=" . urlencode($message));

} else if (strpos($text, "/add") === 0) {
    // 逻辑：上分 /add 13800000000 1000
    $parts = explode(" ", $text);
    if (count($parts) < 3) exit; // Ignore if not enough params
    list($cmd, $phone, $amt) = $parts;

    if (!is_numeric($amt)) exit; // Amount must be a number

    $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE phone = ?");
    $stmt->execute([$amt, $phone]);
    
    $message = $stmt->rowCount() > 0 ? "充值成功" : "未找到用户，充值失败";
    file_get_contents($apiUrl . "/sendMessage?chat_id=$chatId&text=" . urlencode($message));
}

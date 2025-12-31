<?php
require_once __DIR__ . '/../../lib/telegram.php';

// 获取原始输入
$content = file_get_contents("php://input");
$update = json_decode($content, true);

if (!$update) {
    http_response_code(400);
    exit;
}

// 验证请求来自Telegram
$secret_token = getenv('TELEGRAM_WEBHOOK_SECRET');
if ($secret_token) {
    $headers = getallheaders();
    $telegram_token = isset($headers['X-Telegram-Bot-Api-Secret-Token']) ? $headers['X-Telegram-Bot-Api-Secret-Token'] : '';
    
    if ($telegram_token !== $secret_token) {
        http_response_code(403);
        exit;
    }
}

$bot = new TelegramBot();
$bot->processUpdate($update);

// 返回成功响应
http_response_code(200);
echo json_encode(['status' => 'ok']);
?>
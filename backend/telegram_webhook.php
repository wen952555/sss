<?php

/**
 * telegram_webhook.php
 * 
 * 这是 Telegram Bot 的唯一 Webhook 入口点。
 * 它的职责是：
 * 1. 接收来自 Telegram 服务器的 POST 请求。
 * 2. 记录请求（用于调试）。
 * 3. 引入核心处理逻辑。
 * 4. 确保在任何情况下都向 Telegram 返回一个 HTTP 200 响应。
 */

// --- 调试日志记录 (可选，但在排错时非常有用) ---
// 这会在 telegram_webhook.php 文件的同目录下创建一个 telegram_log.txt 文件
// 记录下所有收到的原始请求数据。
// 在生产环境中可以注释掉此部分以提升性能。
try {
    $raw_input = file_get_contents("php://input");
    if ($raw_input) {
        $log_message = "--- Request Received at: " . date('Y-m-d H:i:s') . " ---\n";
        $log_message .= $raw_input . "\n\n";
        file_put_contents("telegram_log.txt", $log_message, FILE_APPEND);
    }
} catch (Exception $e) {
    // 如果日志记录失败，也不要中断脚本
    // 可以在服务器错误日志中记录这个问题
    error_log('Failed to write to telegram_log.txt: ' . $e->getMessage());
}


// --- 核心逻辑处理 ---
try {
    // 引入数据库连接和配置文件加载器
    // 这是所有操作的基础，如果此文件有问题，脚本会在这里停止
    require_once __DIR__ . '/db.php';

    // 引入 Telegram 消息处理器
    require_once __DIR__ . '/handlers/telegram_handler.php';

    // 从请求体中解码 JSON 数据
    $update = json_decode($raw_input, true);

    // 检查是否是有效的消息更新
    if (isset($update["message"])) {
        // 获取数据库连接实例
        $pdo = getDBConnection();
        // 获取 Telegram 配置 (Token 和 Admin Chat ID)
        $config = getTelegramConfig();
        
        // 将消息交由处理器函数进行处理
        handleTelegramMessage($pdo, $config, $update["message"]);

    } elseif (isset($update["callback_query"])) {
        // 预留位置：未来如果使用内联按钮，可以在这里处理回调查询
        // handleCallbackQuery($pdo, $config, $update["callback_query"]);
    }

} catch (Throwable $e) {
    // 捕获所有可能的致命错误 (包括 require 失败, 数据库连接失败等)
    // 记录到服务器的 PHP 错误日志中，这对于调试至关重要
    error_log(
        'Fatal error in telegram_webhook.php: ' . $e->getMessage() . 
        ' in ' . $e->getFile() . ' on line ' . $e->getLine()
    );
} finally {
    // --- 确保响应 ---
    // 无论上面的 try-catch 块中发生了什么，
    // 都必须向 Telegram 返回一个 HTTP 200 OK 响应。
    // 这可以防止 Telegram 因未收到确认而反复重发相同的消息。
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code(200);
        // 可以返回一个空的 JSON 对象或简单的成功消息
        echo json_encode(['status' => 'ok']);
    }
}

// 确保脚本在这里干净地结束
exit();

?>
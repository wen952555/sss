<?php
/**
 * 路径: backend/functions.php
 * 描述: 全局通用助手函数库
 */

/**
 * 生成唯一的4位随机ID (数字 + 大写字母)
 * @param PDO $pdo 数据库连接实例
 * @return string
 */
function generateUID($pdo) {
    $chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    $attempts = 0;
    $maxAttempts = 200; // 防止极端情况下的死循环

    while ($attempts < $maxAttempts) {
        $uid = '';
        for ($i = 0; $i < 4; $i++) {
            $uid .= $chars[rand(0, strlen($chars) - 1)];
        }

        // 检查数据库中是否已存在该 UID
        $stmt = $pdo->prepare("SELECT id FROM users WHERE uid = ? LIMIT 1");
        $stmt->execute([$uid]);
        
        if (!$stmt->fetch()) {
            return $uid; // 如果不存在，则该 UID 可用
        }
        
        $attempts++;
    }

    // 理论上不会走到这里，如果走到这里说明 4 位 UID 已基本用完
    return "E" . rand(100, 999); 
}

/**
 * 统一发送 JSON 响应并结束脚本
 * @param array $data 需要返回给前端的数据
 */
if (!function_exists('sendResponse')) {
    function sendResponse($data) {
        // 清除之前可能存在的任何输出
        if (ob_get_length()) ob_clean();
        
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Telegram 机器人发送消息函数 (用于后端通知或管理操作回复)
 * @param string $token 机器人Token
 * @param string $chat_id 接收人ID
 * @param string $text 消息内容
 */
function sendTelegramMessage($token, $chat_id, $text) {
    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    $postData = [
        'chat_id' => $chat_id,
        'text' => $text,
        'parse_mode' => 'HTML'
    ];

    $options = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query($postData),
            'timeout' => 5 // 设置超时
        ]
    ];

    $context = stream_context_create($options);
    return @file_get_contents($url, false, $context);
}

/**
 * 简单的权限验证助手 (可选)
 */
function isAdmin($chat_id) {
    $env = parse_ini_file(__DIR__ . '/.env');
    return $chat_id == ($env['ADMIN_ID'] ?? '');
}

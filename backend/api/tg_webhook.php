<?php
// --- START OF FILE api/tg_webhook.php ---

require_once 'db_connect.php'; // 使用统一的数据库连接

$BOT_TOKEN = 'YOUR_BOT_TOKEN';
$API_URL = 'https://api.telegram.org/bot' . $BOT_TOKEN . '/';

function sendMessage($chatId, $message) {
    // ... (sendMessage 函数不变)
}

$content = file_get_contents("php://input");
$update = json_decode($content, true);

if (isset($update["message"])) {
    $chatId = $update["message"]["chat"]["id"];
    $text = $update["message"]["text"];

    // 权限检查
    $stmt = $conn->prepare("SELECT * FROM tg_admins WHERE chat_id = ?");
    $stmt->bind_param("i", $chatId);
    $stmt->execute();
    if ($stmt->get_result()->num_rows == 0) {
        sendMessage($chatId, "抱歉，您没有权限。");
        $stmt->close(); $conn->close(); exit;
    }
    $stmt->close();

    $parts = explode(' ', $text);
    $command = $parts[0];
    $reply = '';

    switch ($command) {
        case '/addpoints':
            // ... (逻辑类似，但改为SQL: UPDATE users SET points = points + ? WHERE phone = ? OR id = ?)
            break;
        case '/deluser':
            // ... (逻辑类似，但改为SQL: DELETE FROM users WHERE phone = ? OR id = ?)
            break;
        case '/listusers':
            $result = $conn->query("SELECT id, phone, points FROM users ORDER BY id ASC LIMIT 100");
            $reply = "玩家列表:\n---------------------\n";
            while($row = $result->fetch_assoc()) {
                $reply .= "ID: `{$row['id']}`\n手机: `{$row['phone']}`\n积分: `{$row['points']}`\n\n";
            }
            break;
        case '/broadcast':
            $message = substr($text, strlen('/broadcast '));
            $stmt = $conn->prepare("INSERT INTO announcements (content) VALUES (?)");
            $stmt->bind_param("s", $message);
            $stmt->execute();
            $stmt->close();
            $reply = "公告已发送！";
            break;
        default:
            // ... 帮助信息
            break;
    }
    sendMessage($chatId, $reply);
}

$conn->close();

// --- END OF FILE api/tg_webhook.php ---
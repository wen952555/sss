<?php
// --- Enhanced Logging and Error Handling ---
$log_file = __DIR__ . '/tg_webhook.log';

// Function to write to log
function write_log($message) {
    global $log_file;
    $timestamp = date("Y-m-d H:i:s");
    file_put_contents($log_file, "[$timestamp] " . $message . "\n", FILE_APPEND);
}

// Clear previous log for a fresh start
if (file_exists($log_file)) {
    unlink($log_file);
}

set_error_handler(function($severity, $message, $file, $line) {
    write_log("Error: [$severity] $message in $file on line $line");
});

set_exception_handler(function($exception) {
    write_log("Exception: " . $exception->getMessage());
});

write_log("--- Webhook Accessed ---");

try {
    $raw_post_data = file_get_contents('php://input');
    if ($raw_post_data === false || empty($raw_post_data)) {
        write_log("Received empty or invalid POST data.");
        exit();
    }
    write_log("Raw POST data: " . $raw_post_data);

    require_once 'db_connect.php';
    write_log("db_connect.php included successfully.");

    // The rest of the script's logic
    $API_URL = 'https://api.telegram.org/bot' . $TELEGRAM_BOT_TOKEN . '/';
    write_log("API_URL configured.");

    // --- Telegram API Functions ---
    function sendMessage($chatId, $text, $replyMarkup = null) {
        write_log("Attempting to send message to chat ID: $chatId");
        $url = $GLOBALS['API_URL'] . 'sendMessage';
        $postFields = ['chat_id' => $chatId, 'text' => $text, 'parse_mode' => 'Markdown'];
        if ($replyMarkup) {
            $postFields['reply_markup'] = json_encode($replyMarkup);
        }
        sendRequest($url, $postFields);
        write_log("Message sent to chat ID: $chatId");
    }

    function answerCallbackQuery($callbackQueryId, $text) {
        write_log("Answering callback query ID: $callbackQueryId");
        $url = $GLOBALS['API_URL'] . 'answerCallbackQuery';
        $postFields = ['callback_query_id' => $callbackQueryId, 'text' => $text, 'show_alert' => true];
        sendRequest($url, $postFields);
    }

    function sendRequest($url, $postFields) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postFields));
        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);
        if ($error) {
            write_log("cURL Error in sendRequest: " . $error);
        }
        write_log("cURL response: " . $response);
    }

    // --- Helper Functions ---
    function isAdmin($conn, $chatId) {
        $stmt = $conn->prepare("SELECT * FROM tg_admins WHERE chat_id = ?");
        $stmt->bind_param("i", $chatId);
        $stmt->execute();
        $isAdmin = $stmt->get_result()->num_rows > 0;
        $stmt->close();
        return $isAdmin;
    }

    // --- Keyboards ---
    $adminKeyboard = ['keyboard' => [[['text' => '/listusers'], ['text' => '/broadcast']], [['text' => '/addpoints'], ['text' => '/deluser']]], 'resize_keyboard' => true];
    $userKeyboard = ['keyboard' => [[['text' => '游戏规则'], ['text' => '联系客服']]], 'resize_keyboard' => true];
    $welcomeInlineKeyboard = ['inline_keyboard' => [[['text' => '开始游戏', 'url' => $GAME_URL], ['text' => '我的积分', 'callback_data' => 'check_points']]]];
    write_log("Keyboards defined.");

    // --- Main Logic ---
    $update = json_decode($raw_post_data, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        write_log("Error decoding JSON: " . json_last_error_msg());
        exit();
    }

    if (isset($update["message"])) {
        write_log("Processing a message update.");
        $chatId = $update["message"]["chat"]["id"];
        $text = $update["message"]["text"];
        $reply = '';
        $replyMarkup = isAdmin($conn, $chatId) ? $adminKeyboard : $userKeyboard;

        if ($text === '/start') {
            $reply = "欢迎来到游戏机器人！";
            $replyMarkup = $welcomeInlineKeyboard;
        } else {
            $parts = explode(' ', $text);
            $command = $parts[0];
            write_log("Processing command: $command");

            switch ($command) {
                case '/listusers':
                    if (!isAdmin($conn, $chatId)) { $reply = "抱歉，没有权限。"; break; }
                    $result = $conn->query("SELECT id, phone, points FROM users ORDER BY id ASC LIMIT 100");
                    $reply = "玩家列表:\n---------------------\n";
                    while($row = $result->fetch_assoc()) {
                        $reply .= "ID: `{$row['id']}`\n手机: `{$row['phone']}`\n积分: `{$row['points']}`\n\n";
                    }
                    break;
                case '游戏规则':
                    $reply = "这里是游戏规则...";
                    break;
                case '联系客服':
                    $reply = "请联系 @your_support_username";
                    break;
                default:
                    $reply = "你好！请使用下方的菜单或输入命令。";
                    break;
            }
        }
        sendMessage($chatId, $reply, $replyMarkup);

    } elseif (isset($update["callback_query"])) {
        write_log("Processing a callback query.");
        $callbackQuery = $update["callback_query"];
        $chatId = $callbackQuery["message"]["chat"]["id"];
        $callbackQueryId = $callbackQuery["id"];
        $data = $callbackQuery["data"];

        if ($data === 'check_points') {
            $points = "查询积分功能待实现";
            answerCallbackQuery($callbackQueryId, "您的积分为: " . $points);
        }
    } else {
        write_log("Received an update that is not a message or callback query.");
    }

    $conn->close();
    write_log("--- Script finished successfully ---");

} catch (Exception $e) {
    write_log("Caught Exception: " . $e->getMessage());
}
?>

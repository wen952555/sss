<?php
require_once 'db_connect.php';
require_once __DIR__ . '/../config.php';

$API_URL = 'https://api.telegram.org/bot' . $TELEGRAM_BOT_TOKEN . '/';

// --- Telegram API Functions ---
function sendMessage($chatId, $text, $replyMarkup = null) {
    $url = $GLOBALS['API_URL'] . 'sendMessage';
    $postFields = ['chat_id' => $chatId, 'text' => $text, 'parse_mode' => 'Markdown'];
    if ($replyMarkup) {
        $postFields['reply_markup'] = json_encode($replyMarkup);
    }
    sendRequest($url, $postFields);
}

function answerCallbackQuery($callbackQueryId, $text) {
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
    curl_exec($ch);
    curl_close($ch);
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
$adminKeyboard = [
    'keyboard' => [[['text' => '/listusers'], ['text' => '/broadcast']], [['text' => '/addpoints'], ['text' => '/deluser']]],
    'resize_keyboard' => true
];
$userKeyboard = [
    'keyboard' => [[['text' => '游戏规则'], ['text' => '联系客服']]],
    'resize_keyboard' => true
];
$welcomeInlineKeyboard = [
    'inline_keyboard' => [[
        ['text' => '开始游戏', 'url' => $GAME_URL],
        ['text' => '我的积分', 'callback_data' => 'check_points']
    ]]
];

// --- Main Logic ---
$content = file_get_contents("php://input");
$update = json_decode($content, true);

if (isset($update["message"])) {
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

        switch ($command) {
            // Admin commands
            case '/addpoints':
            case '/deluser':
            case '/listusers':
            case '/broadcast':
                if (!isAdmin($conn, $chatId)) {
                    $reply = "抱歉，没有权限。";
                    break;
                }
                // Existing admin command logic here...
                if ($command === '/listusers') {
                     $result = $conn->query("SELECT id, phone, points FROM users ORDER BY id ASC LIMIT 100");
                     $reply = "玩家列表:\n---------------------\n";
                     while($row = $result->fetch_assoc()) {
                         $reply .= "ID: `{$row['id']}`\n手机: `{$row['phone']}`\n积分: `{$row['points']}`\n\n";
                     }
                } else {
                    $reply = "管理命令 '{$command}' 已收到，但逻辑待实现。";
                }
                break;

            // User commands from keyboard
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
    $callbackQuery = $update["callback_query"];
    $chatId = $callbackQuery["message"]["chat"]["id"];
    $callbackQueryId = $callbackQuery["id"];
    $data = $callbackQuery["data"];

    if ($data === 'check_points') {
        // Here you would look up the user's points from the 'users' table
        // This requires linking telegram chat_id to the user_id in your game database
        $points = "查询积分功能待实现";
        answerCallbackQuery($callbackQueryId, "您的积分为: " . $points);
    }
}

$conn->close();
?>

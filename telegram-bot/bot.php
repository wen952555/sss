<?php
require_once __DIR__ . '/../backend/includes/db.php';
require_once __DIR__ . '/../backend/includes/auth.php';

$db = new Database();
$auth = new Auth($db);

$botToken = 'YOUR_TELEGRAM_BOT_TOKEN';
$adminChatIds = ['ADMIN_CHAT_ID_1', 'ADMIN_CHAT_ID_2']; // 允许管理员的Telegram Chat ID

$input = file_get_contents('php://input');
$update = json_decode($input, true);

if (!$update) exit;

$chatId = $update['message']['chat']['id'] ?? null;
$text = $update['message']['text'] ?? '';
$command = explode(' ', $text)[0];

// 检查是否是管理员
if (!in_array($chatId, $adminChatIds)) {
    sendMessage($chatId, "Unauthorized access");
    exit;
}

switch ($command) {
    case '/start':
        sendMessage($chatId, "Welcome to Thirteen Water Admin Bot\n\nCommands:\n/addpoints [phone] [amount]\n/removepoints [phone] [amount]\n/checkpoints [phone]");
        break;
    case '/addpoints':
        handleAddPoints($chatId, $text);
        break;
    case '/removepoints':
        handleRemovePoints($chatId, $text);
        break;
    case '/checkpoints':
        handleCheckPoints($chatId, $text);
        break;
    default:
        sendMessage($chatId, "Unknown command");
}

function handleAddPoints($chatId, $text) {
    global $db;
    
    $parts = explode(' ', $text);
    if (count($parts) < 3) {
        sendMessage($chatId, "Usage: /addpoints [phone] [amount]");
        return;
    }
    
    $phone = $parts[1];
    $amount = intval($parts[2]);
    
    if ($amount <= 0) {
        sendMessage($chatId, "Amount must be positive");
        return;
    }
    
    $user = $db->query("SELECT id FROM users WHERE phone = ?", [$phone])->fetch();
    if (!$user) {
        sendMessage($chatId, "User not found");
        return;
    }
    
    $db->query("UPDATE users SET points = points + ? WHERE id = ?", [$amount, $user['id']]);
    $db->query("INSERT INTO admin_actions (admin_id, user_id, action, amount) VALUES (?, ?, 'add_points', ?)", 
        [0, $user['id'], $amount]); // admin_id 0表示Telegram管理员
    
    sendMessage($chatId, "Added $amount points to user $phone");
}

function handleRemovePoints($chatId, $text) {
    global $db;
    
    $parts = explode(' ', $text);
    if (count($parts) < 3) {
        sendMessage($chatId, "Usage: /removepoints [phone] [amount]");
        return;
    }
    
    $phone = $parts[1];
    $amount = intval($parts[2]);
    
    if ($amount <= 0) {
        sendMessage($chatId, "Amount must be positive");
        return;
    }
    
    $user = $db->query("SELECT id, points FROM users WHERE phone = ?", [$phone])->fetch();
    if (!$user) {
        sendMessage($chatId, "User not found");
        return;
    }
    
    if ($user['points'] < $amount) {
        sendMessage($chatId, "User doesn't have enough points");
        return;
    }
    
    $db->query("UPDATE users SET points = points - ? WHERE id = ?", [$amount, $user['id']]);
    $db->query("INSERT INTO admin_actions (admin_id, user_id, action, amount) VALUES (?, ?, 'remove_points', ?)", 
        [0, $user['id'], $amount]); // admin_id 0表示Telegram管理员
    
    sendMessage($chatId, "Removed $amount points from user $phone");
}

function handleCheckPoints($chatId, $text) {
    global $db;
    
    $parts = explode(' ', $text);
    if (count($parts) < 2) {
        sendMessage($chatId, "Usage: /checkpoints [phone]");
        return;
    }
    
    $phone = $parts[1];
    $user = $db->query("SELECT points FROM users WHERE phone = ?", [$phone])->fetch();
    
    if (!$user) {
        sendMessage($chatId, "User not found");
        return;
    }
    
    sendMessage($chatId, "User $phone has {$user['points']} points");
}

function sendMessage($chatId, $text) {
    global $botToken;
    
    $url = "https://api.telegram.org/bot$botToken/sendMessage";
    $data = [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'HTML'
    ];
    
    $options = [
        'http' => [
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'method' => 'POST',
            'content' => http_build_query($data)
        ]
    ];
    
    $context = stream_context_create($options);
    file_get_contents($url, false, $context);
}
?>

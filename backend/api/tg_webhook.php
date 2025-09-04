<?php
// --- Telegram Bot Admin Webhook ---

// 日志设置
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/tg_webhook.log');
error_reporting(E_ALL);

require_once 'db_connect.php';
require_once __DIR__ . '/../utils/announcements.php';

// 读取配置
if (!isset($TELEGRAM_BOT_TOKEN) || $TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN') {
    error_log("FATAL: Telegram Bot Token is not configured in config.php");
    exit();
}
$API_URL = 'https://api.telegram.org/bot' . $TELEGRAM_BOT_TOKEN . '/';

function sendRequest($method, $params = []) {
    $url = $GLOBALS['API_URL'] . $method;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

function sendMessage($chatId, $text, $replyMarkup = null) {
    $params = ['chat_id' => $chatId, 'text' => $text, 'parse_mode' => 'Markdown'];
    if ($replyMarkup) $params['reply_markup'] = $replyMarkup;
    sendRequest('sendMessage', $params);
}

function answerCallbackQuery($callbackQueryId, $text = '', $showAlert = false) {
    sendRequest('answerCallbackQuery', [
        'callback_query_id' => $callbackQueryId,
        'text' => $text,
        'show_alert' => $showAlert
    ]);
}

// --- 管理员与状态工具 ---
function tableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '{$tableName}'");
    return $result && $result->num_rows > 0;
}

function isSuperAdmin($chatId) {
    return $chatId == 1878794912;
}

function isAdmin($conn, $chatId) {
    // Super admin is always an admin
    if (isSuperAdmin($chatId)) {
        return true;
    }

    // Check the database for other admins
    if (!tableExists($conn, 'tg_admins')) return false;
    $stmt = $conn->prepare("SELECT chat_id FROM tg_admins WHERE chat_id = ?");
    $stmt->bind_param("i", $chatId);
    $stmt->execute();
    $isAdmin = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    return $isAdmin;
}

function setAdminState($conn, $chatId, $state, $data = null) {
    if (!tableExists($conn, 'tg_admin_states')) return;
    $stmt = $conn->prepare("INSERT INTO tg_admin_states (chat_id, state, state_data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE state = ?, state_data = ?");
    $stmt->bind_param("issss", $chatId, $state, $data, $state, $data);
    $stmt->execute();
    $stmt->close();
}

function getAdminState($conn, $chatId) {
    if (!tableExists($conn, 'tg_admin_states')) return ['state' => null, 'state_data' => null];
    $stmt = $conn->prepare("SELECT state, state_data FROM tg_admin_states WHERE chat_id = ?");
    $stmt->bind_param("i", $chatId);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $result ?: ['state' => null, 'state_data' => null];
}

function showManageAnnouncements($conn, $chatId, $messageId = null) {
    $stmt = $conn->prepare("SELECT id, message_text, created_at FROM tg_announcements WHERE status = 'published' ORDER BY created_at DESC LIMIT 10");
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $reply = "请选择要删除的公告：\n";
        $inline_keyboard = [];
        while ($announcement = $result->fetch_assoc()) {
            $announcement_id = $announcement['id'];
            $announcement_text = mb_substr($announcement['message_text'], 0, 20) . '...';

            $inline_keyboard[] = [
                ['text' => "删除: \"" . htmlspecialchars($announcement_text) . "\"", 'callback_data' => 'delete_ann_' . $announcement_id]
            ];
        }
        $replyMarkup = ['inline_keyboard' => $inline_keyboard];
    } else {
        $reply = "没有找到任何已发布的公告。";
        $replyMarkup = ['inline_keyboard' => []]; // Empty keyboard
    }
    $stmt->close();

    if ($messageId) {
        // Edit the existing message
        sendRequest('editMessageText', [
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => $reply,
            'reply_markup' => $replyMarkup
        ]);
    } else {
        // Send a new message
        sendMessage($chatId, $reply, $replyMarkup);
    }
}

// --- 管理员菜单 ---
$adminKeyboard = [
    'keyboard' => [
        [['text' => '查找玩家'], ['text' => '积分列表']],
        [['text' => '发布新公告'], ['text' => '管理公告']],
        [['text' => '取消']]
    ],
    'resize_keyboard' => true
];

// --- 主逻辑 ---
$update = json_decode(file_get_contents('php://input'), true);
if (!$update) exit();

$conn = function_exists('db_connect') ? db_connect() : (isset($conn) ? $conn : null);
if (!$conn) exit('无法连接数据库');

// 检查所需表
if (!tableExists($conn, 'tg_admins') || !tableExists($conn, 'tg_admin_states') || !tableExists($conn, 'tg_announcements')) {
    error_log("FATAL: Required Telegram bot tables ('tg_admins', 'tg_admin_states', or 'tg_announcements') not found in database.");
    exit();
}

if (isset($update["message"])) {
    $chatId = $update["message"]["chat"]["id"];
    $text = $update["message"]["text"];

    // Super Admin Commands
    if (isSuperAdmin($chatId)) {
        if (strpos($text, '/addadmin') === 0) {
            $parts = explode(' ', $text);
            $newAdminId = $parts[1] ?? 0;
            if ($newAdminId > 0) {
                $stmt = $conn->prepare("INSERT INTO tg_admins (chat_id) VALUES (?) ON DUPLICATE KEY UPDATE chat_id = ?");
                $stmt->bind_param("ii", $newAdminId, $newAdminId);
                $stmt->execute();
                $stmt->close();
                sendMessage($chatId, "✅ 管理员 `$newAdminId` 已添加。");
            } else {
                sendMessage($chatId, "❌ 无效的ID。用法: /addadmin [user_id]");
            }
            exit();
        }

        if (strpos($text, '/removeadmin') === 0) {
            $parts = explode(' ', $text);
            $adminIdToRemove = $parts[1] ?? 0;
            if ($adminIdToRemove > 0) {
                $stmt = $conn->prepare("DELETE FROM tg_admins WHERE chat_id = ?");
                $stmt->bind_param("i", $adminIdToRemove);
                $stmt->execute();
                if ($stmt->affected_rows > 0) {
                    sendMessage($chatId, "✅ 管理员 `$adminIdToRemove` 已移除。");
                } else {
                    sendMessage($chatId, "❌ 未找到该管理员。");
                }
                $stmt->close();
            } else {
                sendMessage($chatId, "❌ 无效的ID。用法: /removeadmin [user_id]");
            }
            exit();
        }

        if ($text === '/listadmins') {
            $result = $conn->query("SELECT chat_id FROM tg_admins");
            $reply = "当前管理员列表:\n---------------------\n";
            if ($result->num_rows > 0) {
                while($row = $result->fetch_assoc()) {
                    $reply .= "`{$row['chat_id']}`\n";
                }
            } else {
                $reply .= "没有找到任何管理员。";
            }
            sendMessage($chatId, $reply);
            exit();
        }
    }

    if (!isAdmin($conn, $chatId)) {
        sendMessage($chatId, "您好！");
        exit();
    }

    $adminState = getAdminState($conn, $chatId);

    if ($text === '/start' || $text === '取消') {
        setAdminState($conn, $chatId, null);
        $welcomeMessage = "欢迎回来，管理员！请选择一个操作。";
        if (isSuperAdmin($chatId)) {
            $welcomeMessage .= "\n\n您是超级管理员。您可以使用以下命令管理其他管理员：\n`/addadmin [user_id]`\n`/removeadmin [user_id]`\n`/listadmins`";
        }
        sendMessage($chatId, $welcomeMessage, $adminKeyboard);
        exit();
    }

    // --- 新增的直接命令处理 ---
    if (strpos($text, '/') === 0) {
        $parts = explode(' ', $text);
        $command = $parts[0];

        switch ($command) {
            case '/points':
                $phone = $parts[1] ?? '';
                $amount = (int)($parts[2] ?? 0);
                if (!empty($phone) && is_numeric($parts[2] ?? '')) {
                    $stmt = $conn->prepare("UPDATE users SET points = points + ? WHERE phone = ?");
                    $stmt->bind_param("is", $amount, $phone);
                    $stmt->execute();
                    if ($stmt->affected_rows > 0) {
                        $actionText = $amount >= 0 ? '增加' : '减少';
                        sendMessage($chatId, "✅ 成功为手机号 `{$phone}` {$actionText} `" . abs($amount) . "` 积分。", $adminKeyboard);
                    } else {
                        sendMessage($chatId, "❌ 操作失败。未找到手机号为 `{$phone}` 的玩家，或积分没有变化。", $adminKeyboard);
                    }
                    $stmt->close();
                } else {
                    sendMessage($chatId, "❌ 命令格式错误。\n用法: `/points <手机号> <积分数量>`\n(数量可为负数，例如: `/points 13800138000 -50`)");
                }
                exit();
            case '/delete_player':
                $phone = $parts[1] ?? '';
                if (!empty($phone)) {
                    $stmt = $conn->prepare("SELECT id FROM users WHERE phone = ?");
                    $stmt->bind_param("s", $phone);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    if ($user = $result->fetch_assoc()) {
                        $userId = $user['id'];
                        $confirmKeyboard = ['inline_keyboard' => [[['text' => '✅ 是，删除', 'callback_data' => 'confirm_del_' . $userId], ['text' => '❌ 否，取消', 'callback_data' => 'cancel_del_' . $userId]]]];
                        sendMessage($chatId, "⚠️ 您确定要删除手机号为 `{$phone}` 的玩家吗？此操作无法撤销。", $confirmKeyboard);
                    } else {
                        sendMessage($chatId, "❌ 未找到手机号为 `{$phone}` 的玩家。", $adminKeyboard);
                    }
                    $stmt->close();
                } else {
                    sendMessage($chatId, "❌ 命令格式错误。\n用法: `/delete_player <手机号>`");
                }
                exit();
            case '/publish_announcement':
                $message = implode(' ', array_slice($parts, 1));
                if (!empty($message)) {
                    createAnnouncement($conn, $message);
                    sendMessage($chatId, "✅ 公告已发布并保存。", $adminKeyboard);
                } else {
                    sendMessage($chatId, "❌ 命令格式错误。\n用法: `/publish_announcement <公告内容>`");
                }
                exit();
            case '/delete_announcement':
                $announcementId = (int)($parts[1] ?? 0);
                if ($announcementId > 0) {
                    if (deleteAnnouncement($conn, $announcementId)) {
                        sendMessage($chatId, "✅ 公告 #{$announcementId} 已删除。", $adminKeyboard);
                    } else {
                        sendMessage($chatId, "❌ 未找到ID为 `{$announcementId}` 的公告，或该公告已被删除。", $adminKeyboard);
                    }
                } else {
                    sendMessage($chatId, "❌ 命令格式错误。\n用法: `/delete_announcement <公告ID>`");
                }
                exit();
        }
    }

    switch ($adminState['state']) {
        case 'awaiting_broadcast_message':
            createAnnouncement($conn, $text);
            $broadcastMessage = "【📢 公告】\n\n" . $text;
            // 此处可调用实际群发逻辑
            sendMessage($chatId, "✅ 公告已发布并保存。\n\n内容:\n" . $broadcastMessage, $adminKeyboard);
            setAdminState($conn, $chatId, null);
            exit();
        case 'awaiting_add_amount':
        case 'awaiting_sub_amount':
            $amount = (int)$text;
            $userId = (int)$adminState['state_data'];
            if ($amount > 0 && $userId > 0) {
                $op = $adminState['state'] === 'awaiting_add_amount' ? '+' : '-';
                $stmt = $conn->prepare("UPDATE users SET points = points $op ? WHERE id = ?");
                $stmt->bind_param("ii", $amount, $userId);
                $stmt->execute();
                $actionText = $op === '+' ? '增加' : '减少';
                sendMessage($chatId, "成功为ID `{$userId}` {$actionText} `{$amount}` 积分。", $adminKeyboard);
                $stmt->close();
            } else {
                sendMessage($chatId, "无效的积分数量。", $adminKeyboard);
            }
            setAdminState($conn, $chatId, null);
            exit();
        case 'awaiting_phone_number':
            $phone = $text;
            $stmt = $conn->prepare("SELECT id, phone, points FROM users WHERE phone = ?");
            $stmt->bind_param("s", $phone);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($user = $result->fetch_assoc()) {
                $reply = "找到玩家:\nID: `{$user['id']}`\n手机号: `{$user['phone']}`\n积分: *{$user['points']}*\n\n请选择要执行的操作:";
                $inlineKeyboard = [
                    'inline_keyboard' => [
                        [
                            ['text' => '➕增加积分', 'callback_data' => 'add_pts_' . $user['id']],
                            ['text' => '➖减少积分', 'callback_data' => 'sub_pts_' . $user['id']]
                        ],
                        [
                            ['text' => '❌删除玩家', 'callback_data' => 'del_usr_' . $user['id']]
                        ]
                    ]
                ];
                sendMessage($chatId, $reply, $inlineKeyboard);
            } else {
                sendMessage($chatId, "未找到手机号为 `$phone` 的玩家。", $adminKeyboard);
            }
            $stmt->close();
            setAdminState($conn, $chatId, null);
            exit();
    }

    switch ($text) {
        case '查找玩家':
            setAdminState($conn, $chatId, 'awaiting_phone_number');
            sendMessage($chatId, "请输入您要查找的玩家手机号：");
            break;
        case '发布新公告':
            setAdminState($conn, $chatId, 'awaiting_broadcast_message');
            sendMessage($chatId, "请输入您要发送的公告内容：");
            break;
        case '积分列表':
            $result = $conn->query("SELECT phone, points FROM users WHERE points > 0 ORDER BY points DESC LIMIT 50");
            $reply = "积分排行榜 (Top 50):\n---------------------\n";
            while($row = $result->fetch_assoc()) {
                $reply .= "手机: `{$row['phone']}` - 积分: *{$row['points']}*\n";
            }
            sendMessage($chatId, $reply, $adminKeyboard);
            break;
        case '管理公告':
            showManageAnnouncements($conn, $chatId);
            break;
    }

} elseif (isset($update["callback_query"])) {
    $callbackQuery = $update["callback_query"];
    $chatId = $callbackQuery["message"]["chat"]["id"];
    $callbackQueryId = $callbackQuery["id"];
    $data = $callbackQuery["data"];

    if (!isAdmin($conn, $chatId)) {
        answerCallbackQuery($callbackQueryId, "抱歉，没有权限。", true);
        exit();
    }

    $parts = explode('_', $data);
    $actionType = $parts[0] . '_' . $parts[1];
    $userId = $parts[2] ?? 0;

    switch ($actionType) {
        case 'delete_ann':
            $announcementId = $parts[2] ?? 0;
            if ($announcementId > 0) {
                if (deleteAnnouncement($conn, $announcementId)) {
                    answerCallbackQuery($callbackQueryId, "公告 #$announcementId 已删除。");
                } else {
                    answerCallbackQuery($callbackQueryId, "操作已完成或公告不存在。");
                }
                // Refresh the announcement list message
                $messageId = $callbackQuery["message"]["message_id"];
                showManageAnnouncements($conn, $chatId, $messageId);
            }
            break;
        case 'add_pts':
            setAdminState($conn, $chatId, 'awaiting_add_amount', $userId);
            sendMessage($chatId, "请输入要为ID `{$userId}` 增加的积分数量：");
            answerCallbackQuery($callbackQueryId);
            break;
        case 'sub_pts':
            setAdminState($conn, $chatId, 'awaiting_sub_amount', $userId);
            sendMessage($chatId, "请输入要为ID `{$userId}` 减少的积分数量：");
            answerCallbackQuery($callbackQueryId);
            break;
        case 'del_usr':
            $confirmKeyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '✅ 是，删除', 'callback_data' => 'confirm_del_' . $userId],
                        ['text' => '❌ 否，取消', 'callback_data' => 'cancel_del_' . $userId]
                    ]
                ]
            ];
            sendMessage($chatId, "⚠️ 您确定要删除ID为 `{$userId}` 的玩家吗？此操作无法撤销。", $confirmKeyboard);
            answerCallbackQuery($callbackQueryId);
            break;
        case 'cancel_del':
            sendMessage($chatId, "操作已取消。");
            answerCallbackQuery($callbackQueryId);
            break;
        case 'confirm_del':
            $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            if ($stmt->affected_rows > 0) {
                sendMessage($chatId, "已成功删除ID为 `{$userId}` 的玩家。");
                answerCallbackQuery($callbackQueryId, "玩家已删除");
            } else {
                sendMessage($chatId, "删除失败，未找到ID为 `{$userId}` 的玩家。");
                answerCallbackQuery($callbackQueryId, "删除失败", true);
            }
            $stmt->close();
            break;
    }
}

$conn->close();
?>

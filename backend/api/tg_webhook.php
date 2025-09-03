<?php
// --- Telegram Bot Admin Webhook ---

// 日志设置
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/tg_webhook.log');
error_reporting(E_ALL);

require_once 'db_connect.php';

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

// --- 管理员菜单 ---
$adminKeyboard = [
    'keyboard' => [
        [['text' => '积分列表']],
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
if (!tableExists($conn, 'tg_admins') || !tableExists($conn, 'tg_admin_states')) {
    error_log("FATAL: Required Telegram bot tables ('tg_admins' or 'tg_admin_states') not found in database.");
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
                    $stmt = $conn->prepare("INSERT INTO tg_announcements (message_text) VALUES (?)");
                    $stmt->bind_param("s", $message);
                    $stmt->execute();
                    $stmt->close();
                    sendMessage($chatId, "✅ 公告已发布并保存。", $adminKeyboard);
                } else {
                    sendMessage($chatId, "❌ 命令格式错误。\n用法: `/publish_announcement <公告内容>`");
                }
                exit();
            case '/delete_announcement':
                $announcementId = (int)($parts[1] ?? 0);
                if ($announcementId > 0) {
                    $stmt = $conn->prepare("UPDATE tg_announcements SET status = 'deleted' WHERE id = ?");
                    $stmt->bind_param("i", $announcementId);
                    $stmt->execute();
                    if ($stmt->affected_rows > 0) {
                        sendMessage($chatId, "✅ 公告 #{$announcementId} 已删除。", $adminKeyboard);
                    } else {
                        sendMessage($chatId, "❌ 未找到ID为 `{$announcementId}` 的公告，或该公告已被删除。", $adminKeyboard);
                    }
                    $stmt->close();
                } else {
                    sendMessage($chatId, "❌ 命令格式错误。\n用法: `/delete_announcement <公告ID>`");
                }
                exit();
        }
    }

    switch ($text) {
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

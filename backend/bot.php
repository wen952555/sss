<?php
// backend/bot.php
require __DIR__ . '/db.php'; // 使用 __DIR__ 确保路径正确

// 从 db.php 中获取 $config 数组
global $config;

// 1. 获取 Telegram 发来的数据
$content = file_get_contents('php://input');
if (!$content) {
    // 如果不是从 Telegram Webhook 调用，则直接退出
    exit('This script is designed to be called by a Telegram webhook.');
}

$update = json_decode($content, true);
if (!$update || !isset($update['message'])) {
    exit;
}

$chatId = $update['message']['chat']['id'];
$text = trim($update['message']['text']);

// 2. 鉴权
$botToken = $config['TG_BOT_TOKEN'] ?? null;
$adminId  = $config['TG_ADMIN_ID'] ?? null;

if (!$botToken || !$adminId) {
    // 如果 Token 或 Admin ID 未设置，记录错误并退出，但不在 Telegram 中回复
    error_log("FATAL: TG_BOT_TOKEN or TG_ADMIN_ID is not configured in .env file.");
    exit;
}

$is_admin = ($chatId == $adminId);

if (!$is_admin) {
    sendMessage($chatId, "⛔ 权限不足 (ID: $chatId)", $botToken);
    exit;
}

// 3. 会话状态管理 (使用文件)
$sessionFile = sys_get_temp_dir() . "/session_{$chatId}.json"; // 使用系统临时目录
$session = file_exists($sessionFile) ? json_decode(file_get_contents($sessionFile), true) : [];

function updateSession($data) {
    global $sessionFile;
    file_put_contents($sessionFile, json_encode($data));
}

function clearSession() {
    global $sessionFile;
    if (file_exists($sessionFile)) {
        unlink($sessionFile);
    }
}

// 4. 键盘定义
$mainKeyboard = [
    'keyboard' => [
        [['text' => '📦 库存检查'], ['text' => '👥 用户查询']],
        [['text' => '➕ 增加积分'], ['text' => '➖ 扣除积分']],
        [['text' => '❌ 删除用户']]
    ],
    'resize_keyboard' => true
];

$cancelKeyboard = [
    'keyboard' => [[['text' => '🔙 取消/返回']]],
    'resize_keyboard' => true
];

// 5. 逻辑处理
if ($text === '🔙 取消/返回' || $text === '/start') {
    clearSession();
    sendMessage($chatId, "👋 已回到主菜单。", $botToken, $mainKeyboard);
    exit;
}

// 根据会话状态进行路由
$step = $session['step'] ?? 'main_menu';

switch ($step) {
    case 'main_menu':
        handleMainMenu($chatId, $text, $pdo, $botToken, $mainKeyboard, $cancelKeyboard);
        break;
    case 'add_score_ask_mobile':
        handleSingleInputStep($chatId, $text, $pdo, 'add_score_ask_amount', "✅ 找到用户 (当前积分: %d)\n\n请输入要 **增加** 的积分数量：", $botToken, $cancelKeyboard);
        break;
    case 'add_score_ask_amount':
        handleAddScoreAmount($chatId, $text, $pdo, $session['mobile'], $session['cur_points'], $botToken, $mainKeyboard);
        break;
    case 'sub_score_ask_mobile':
        handleSingleInputStep($chatId, $text, $pdo, 'sub_score_ask_amount', "✅ 找到用户 (当前积分: %d)\n\n请输入要 **扣除** 的积分数量：", $botToken, $cancelKeyboard);
        break;
    case 'sub_score_ask_amount':
        handleSubScoreAmount($chatId, $text, $pdo, $session['mobile'], $session['cur_points'], $botToken, $mainKeyboard);
        break;
    case 'del_user_ask_mobile':
        handleDeleteUser($chatId, $text, $pdo, $botToken, $mainKeyboard);
        break;
    default:
        clearSession();
        sendMessage($chatId, "状态异常，已重置到主菜单。", $botToken, $mainKeyboard);
        break;
}


// --- 辅助函数 & 逻辑处理函数 ---

function handleMainMenu($chatId, $text, $pdo, $botToken, $mainKeyboard, $cancelKeyboard)
{
    switch ($text) {
        case '📦 库存检查':
            $stmt = $pdo->query("SELECT count(*) FROM pre_decks");
            $count = $stmt->fetchColumn();
            sendMessage($chatId, "📊 库存统计: 当前剩余 **$count** 局。", $botToken, $mainKeyboard);
            break;
        case '👥 用户查询':
            $stmt = $pdo->query("SELECT count(*) FROM users");
            $count = $stmt->fetchColumn();
            sendMessage($chatId, "👥 当前注册用户总数: **$count** 人。", $botToken, $mainKeyboard);
            break;
        case '➕ 增加积分':
            updateSession(['step' => 'add_score_ask_mobile']);
            sendMessage($chatId, "➕ **增加积分**\n请回复用户的 **手机号**：", $botToken, $cancelKeyboard);
            break;
        case '➖ 扣除积分':
            updateSession(['step' => 'sub_score_ask_mobile']);
            sendMessage($chatId, "➖ **扣除积分**\n请回复用户的 **手机号**：", $botToken, $cancelKeyboard);
            break;
        case '❌ 删除用户':
            updateSession(['step' => 'del_user_ask_mobile']);
            sendMessage($chatId, "⚠️ **删除用户**\n请输入要删除的 **手机号**：", $botToken, $cancelKeyboard);
            break;
        default:
            sendMessage($chatId, "请点击下方菜单 👇", $botToken, $mainKeyboard);
            break;
    }
}

function handleSingleInputStep($chatId, $mobile, $pdo, $nextStep, $successMessage, $botToken, $cancelKeyboard)
{
    $user = getUserByMobile($pdo, $mobile);
    if (!$user) {
        sendMessage($chatId, "❌ 用户 `$mobile` 不存在，请重新输入手机号。", $botToken, $cancelKeyboard);
    } else {
        updateSession(['step' => $nextStep, 'mobile' => $mobile, 'cur_points' => $user['points']]);
        sendMessage($chatId, sprintf($successMessage, $user['points']), $botToken, $cancelKeyboard);
    }
}

function handleAddScoreAmount($chatId, $amountStr, $pdo, $mobile, $currentPoints, $botToken, $mainKeyboard)
{
    $amount = intval($amountStr);
    if ($amount <= 0) {
        sendMessage($chatId, "❌ 请输入大于 0 的数字。", $botToken, null);
        return;
    }
    adjustPoints($pdo, $mobile, $amount);
    $newTotal = $currentPoints + $amount;
    clearSession();
    sendMessage($chatId, "✅ **成功加分**\n用户: `$mobile`\n增加: +$amount\n最新余额: **$newTotal**", $botToken, $mainKeyboard);
}

function handleSubScoreAmount($chatId, $amountStr, $pdo, $mobile, $currentPoints, $botToken, $mainKeyboard)
{
    $amount = intval($amountStr);
    if ($amount <= 0) {
        sendMessage($chatId, "❌ 请输入大于 0 的数字。", $botToken, null);
        return;
    }
    adjustPoints($pdo, $mobile, -$amount);
    $newTotal = $currentPoints - $amount;
    clearSession();
    sendMessage($chatId, "✅ **成功扣分**\n用户: `$mobile`\n扣除: -$amount\n最新余额: **$newTotal**", $botToken, $mainKeyboard);
}

function handleDeleteUser($chatId, $mobile, $pdo, $botToken, $mainKeyboard)
{
    $stmt = $pdo->prepare("DELETE FROM users WHERE mobile = ?");
    $stmt->execute([$mobile]);
    clearSession();
    if ($stmt->rowCount() > 0) {
        sendMessage($chatId, "🗑 用户 `$mobile` 已彻底删除。", $botToken, $mainKeyboard);
    } else {
        sendMessage($chatId, "❌ 删除失败，用户 `$mobile` 不存在。", $botToken, $mainKeyboard);
    }
}

function getUserByMobile($pdo, $mobile)
{
    $stmt = $pdo->prepare("SELECT id, points FROM users WHERE mobile = ?");
    $stmt->execute([$mobile]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function adjustPoints($pdo, $mobile, $value)
{
    $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE mobile = ?");
    $stmt->execute([$value, $mobile]);
}

function sendMessage($chatId, $text, $token, $keyboard = null)
{
    $url = "https://api.telegram.org/bot$token/sendMessage";
    $data = [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'Markdown'
    ];

    if ($keyboard) {
        $data['reply_markup'] = json_encode($keyboard);
    }

    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data),
            'ignore_errors' => true // 方便调试
        ],
    ];
    $context = stream_context_create($options);
    file_get_contents($url, false, $context);
}

<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// backend/bot.php
require 'db.php';

// 开启错误日志
ini_set('display_errors', 1);
ini_set('error_log', 'bot_error.log');

// 1. 获取数据
$content = file_get_contents('php://input');
if (!$content) exit; 
$update = json_decode($content, true);
if (!$update || !isset($update['message'])) exit;

$chatId = $update['message']['chat']['id'];
$text = trim($update['message']['text']);

// 2. 鉴权
$botToken = getenv('TG_BOT_TOKEN');
$adminId = getenv('TG_ADMIN_ID'); 

$is_admin = false;
if ($adminId && $chatId == $adminId) {
    $is_admin = true;
} else {
    $stmt = $pdo->prepare("SELECT * FROM tg_admins WHERE chat_id = ?");
    $stmt->execute([$chatId]);
    if ($stmt->fetch()) $is_admin = true;
}

if (!$is_admin) {
    sendMessage($chatId, "⛔ 权限不足 (ID: $chatId)", $botToken);
    exit;
}

// -------------------------------------------------------
// 3. 会话状态管理 (使用文件存储 session，免数据库修改)
// -------------------------------------------------------
$sessionFile = "session_{$chatId}.json";
$session = file_exists($sessionFile) ? json_decode(file_get_contents($sessionFile), true) : [];

function updateSession($chatId, $data) {
    global $sessionFile;
    file_put_contents($sessionFile, json_encode($data));
}

function clearSession($chatId) {
    global $sessionFile;
    if (file_exists($sessionFile)) unlink($sessionFile);
}

// -------------------------------------------------------
// 4. 主菜单键盘定义
// -------------------------------------------------------
$mainKeyboard = [
    'keyboard' => [
        [['text' => '📦 库存检查'], ['text' => '👥 用户查询']],
        [['text' => '➕ 增加积分'], ['text' => '➖ 扣除积分']],
        [['text' => '❌ 删除用户']]
    ],
    'resize_keyboard' => true,
    'persistent_keyboard' => true
];

$cancelKeyboard = [
    'keyboard' => [[['text' => '🔙 取消/返回']]],
    'resize_keyboard' => true
];

// -------------------------------------------------------
// 5. 逻辑处理
// -------------------------------------------------------

// === 全局取消指令 ===
if ($text === '🔙 取消/返回' || $text === '/start') {
    clearSession($chatId);
    sendMessage($chatId, "👋 已回到主菜单。", $botToken, $mainKeyboard);
    exit;
}

// === 模式选择 (主菜单) ===
if (empty($session)) {
    
    // A. 库存检查
    if ($text === '📦 库存检查') {
        $stmt = $pdo->query("SELECT count(*) FROM pre_decks");
        $count = $stmt->fetchColumn();
        $msg = "📊 **库存统计**\n当前: **$count** 局\n";
        
        if ($count < 80) {
            sendMessage($chatId, $msg . "⚠️ 正在补货...", $botToken);
            require_once 'core/DeckGenerator.php';
            DeckGenerator::fill($pdo, $needed);
            $msg = "✅ 已补满 320 局。";
        } else {
            $msg .= "✅ 库存充足。";
        }
        sendMessage($chatId, $msg, $botToken, $mainKeyboard);
    }

    // B. 用户查询 (简单版)
    elseif ($text === '👥 用户查询') {
        $stmt = $pdo->query("SELECT count(*) FROM users");
        $count = $stmt->fetchColumn();
        sendMessage($chatId, "👥 当前注册用户总数: **$count** 人", $botToken, $mainKeyboard);
    }

    // C. 增加积分 - 进入流程
    elseif ($text === '➕ 增加积分') {
        updateSession($chatId, ['step' => 'add_score_ask_mobile']);
        sendMessage($chatId, "➕ **增加积分模式**\n请回复用户的 **手机号**：", $botToken, $cancelKeyboard);
    }

    // D. 扣除积分 - 进入流程
    elseif ($text === '➖ 扣除积分') {
        updateSession($chatId, ['step' => 'sub_score_ask_mobile']);
        sendMessage($chatId, "➖ **扣除积分模式**\n请回复用户的 **手机号**：", $botToken, $cancelKeyboard);
    }

    // E. 删除用户 - 进入流程
    elseif ($text === '❌ 删除用户') {
        updateSession($chatId, ['step' => 'del_user_ask_mobile']);
        sendMessage($chatId, "⚠️ **删除用户模式**\n请输入要删除的 **手机号**：", $botToken, $cancelKeyboard);
    }

    else {
        sendMessage($chatId, "请点击下方菜单 👇", $botToken, $mainKeyboard);
    }

} 
// === 处于会话状态中 ===
else {
    $step = $session['step'];

    // ----------------- 增加积分流程 -----------------
    if ($step === 'add_score_ask_mobile') {
        // 校验手机号
        $user = getUserByMobile($pdo, $text);
        if (!$user) {
            sendMessage($chatId, "❌ 用户 $text 不存在，请重新输入手机号，或点取消。", $botToken, $cancelKeyboard);
        } else {
            // 记录手机号，进入下一步
            updateSession($chatId, ['step' => 'add_score_ask_amount', 'mobile' => $text, 'cur_points' => $user['points']]);
            sendMessage($chatId, "✅ 找到用户 (当前积分: {$user['points']})\n\n请输入要 **增加** 的积分数量：", $botToken, $cancelKeyboard);
        }
    }
    elseif ($step === 'add_score_ask_amount') {
        $amount = intval($text);
        if ($amount <= 0) {
            sendMessage($chatId, "❌ 请输入大于 0 的数字：", $botToken, $cancelKeyboard);
        } else {
            $mobile = $session['mobile'];
            adjustPoints($pdo, $mobile, $amount);
            $newTotal = $session['cur_points'] + $amount;
            
            clearSession($chatId);
            sendMessage($chatId, "✅ **成功加分**\n用户: `$mobile`\n增加: +$amount\n最新余额: **$newTotal**", $botToken, $mainKeyboard);
        }
    }

    // ----------------- 扣除积分流程 -----------------
    elseif ($step === 'sub_score_ask_mobile') {
        $user = getUserByMobile($pdo, $text);
        if (!$user) {
            sendMessage($chatId, "❌ 用户 $text 不存在，请重试。", $botToken, $cancelKeyboard);
        } else {
            updateSession($chatId, ['step' => 'sub_score_ask_amount', 'mobile' => $text, 'cur_points' => $user['points']]);
            sendMessage($chatId, "✅ 找到用户 (当前积分: {$user['points']})\n\n请输入要 **扣除** 的积分数量：", $botToken, $cancelKeyboard);
        }
    }
    elseif ($step === 'sub_score_ask_amount') {
        $amount = intval($text);
        if ($amount <= 0) {
            sendMessage($chatId, "❌ 请输入大于 0 的数字：", $botToken, $cancelKeyboard);
        } else {
            $mobile = $session['mobile'];
            // 扣分其实就是加负数
            adjustPoints($pdo, $mobile, -$amount);
            $newTotal = $session['cur_points'] - $amount;
            
            clearSession($chatId);
            sendMessage($chatId, "✅ **成功扣分**\n用户: `$mobile`\n扣除: -$amount\n最新余额: **$newTotal**", $botToken, $mainKeyboard);
        }
    }

    // ----------------- 删除用户流程 -----------------
    elseif ($step === 'del_user_ask_mobile') {
        $mobile = $text;
        $stmt = $pdo->prepare("DELETE FROM users WHERE mobile = ?");
        $stmt->execute([$mobile]);
        
        clearSession($chatId);
        if ($stmt->rowCount() > 0) {
            sendMessage($chatId, "🗑 用户 `$mobile` 已彻底删除。", $botToken, $mainKeyboard);
        } else {
            sendMessage($chatId, "❌ 删除失败，用户 `$mobile` 不存在。", $botToken, $mainKeyboard);
        }
    }
}

// --- 辅助函数 ---

function getUserByMobile($pdo, $mobile) {
    $stmt = $pdo->prepare("SELECT id, points FROM users WHERE mobile = ?");
    $stmt->execute([$mobile]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

function adjustPoints($pdo, $mobile, $val) {
    // 先查再改比较稳妥
    $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE mobile = ?");
    $stmt->execute([$val, $mobile]);
}

function sendMessage($chatId, $text, $token, $keyboard = null) {
    $url = "https://api.telegram.org/bot$token/sendMessage";
    $data = [
        'chat_id' => $chatId, 
        'text' => $text,
        'parse_mode' => 'Markdown'
    ];

    if ($keyboard) {
        $data['reply_markup'] = json_encode($keyboard);
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    curl_close($ch);
    
    return $res;
}
?>
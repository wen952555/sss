<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

$db_path = '../database/users.json';

// --- Helper Functions ---
function getUsers($path) {
    if (!file_exists($path)) return [];
    return json_decode(file_get_contents($path), true);
}

function saveUsers($path, $users) {
    file_put_contents($path, json_encode($users, JSON_PRETTY_PRINT));
}

// --- Main Logic ---

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['fromId'], $input['toId'], $input['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的请求，需要提供 fromId, toId 和 amount。']);
    exit;
}

$fromId = $input['fromId'];
$toId = $input['toId'];
$amount = (int)$input['amount'];

if ($amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '赠送的积分必须是正数。']);
    exit;
}

if ($fromId === $toId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '不能给自己赠送积分。']);
    exit;
}

// --- 数据库操作 ---
// 为了保证数据一致性，我们在这里加一个简单的文件锁
$fp = fopen($db_path, 'r+');
if (!flock($fp, LOCK_EX)) {
    http_response_code(503); // Service Unavailable
    echo json_encode(['success' => false, 'message' => '服务器繁忙，请稍后再试。']);
    exit;
}

$users = json_decode(fread($fp, filesize($db_path)), true);

// 检查用户是否存在
if (!isset($users[$fromId]) || !isset($users[$toId])) {
    flock($fp, LOCK_UN);
    fclose($fp);
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => '赠送方或接收方用户不存在。']);
    exit;
}

// 检查积分是否足够
if ($users[$fromId]['points'] < $amount) {
    flock($fp, LOCK_UN);
    fclose($fp);
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '您的积分不足。']);
    exit;
}

// 执行转账
$users[$fromId]['points'] -= $amount;
$users[$toId]['points'] += $amount;

// 写回数据库
ftruncate($fp, 0); // 清空文件
rewind($fp);
fwrite($fp, json_encode($users, JSON_PRETTY_PRINT));
fflush($fp);

// 解锁并关闭文件
flock($fp, LOCK_UN);
fclose($fp);

// 返回成功响应
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => '积分赠送成功！',
    'updatedUser' => $users[$fromId] // 返回更新后的赠送者信息
]);
?>

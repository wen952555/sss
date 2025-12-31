<?php
require 'db.php';
require 'utils.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    sendJSON(["error" => "禁止访问。请先登录。"], 401);
    exit;
}

// Trim the phone number from the request
$phone = trim($_GET['phone'] ?? '');

if (empty($phone)) {
    sendJSON(["error" => "请输入手机号进行搜索。"], 400);
    exit;
}

$currentUserStmt = $pdo->prepare("SELECT phone FROM users WHERE id = ?");
$currentUserStmt->execute([$_SESSION['user_id']]);
$currentUser = $currentUserStmt->fetch(PDO::FETCH_ASSOC);

// Also trim the phone from the DB for comparison
if ($currentUser && trim($currentUser['phone']) === $phone) {
    sendJSON(["error" => "您不能选择自己为转账对象。"], 400);
    exit;
}

// Use TRIM in the SQL query to handle whitespace in the DB
$stmt = $pdo->prepare("SELECT short_id FROM users WHERE TRIM(phone) = ?");
$stmt->execute([$phone]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    sendJSON($user);
} else {
    sendJSON(["error" => "未找到该用户。请确认手机号是否正确。"], 404);
}
?>

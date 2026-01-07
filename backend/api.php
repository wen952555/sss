<?php
require_once 'config.php';
require_once 'src/GameLogic.php';

$action = $_GET['action'] ?? '';

// 1. 注册 (手机号+6位密码)
if ($action == 'register') {
    $phone = $_POST['phone'];
    $nick = $_POST['nickname'];
    $pass = strtolower($_POST['password']);
    if(strlen($pass) != 6) jsonResponse(['msg'=>'密码需6位']);
    
    $hash = password_hash($pass, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO users (phone, nickname, password) VALUES (?,?,?)");
    $stmt->execute([$phone, $nick, $hash]);
    jsonResponse(['code'=>200]);
}

// 2. 搜索用户并赠送积分
if ($action == 'search_user') {
    $stmt = $pdo->prepare("SELECT nickname FROM users WHERE phone = ?");
    $stmt->execute([$_GET['phone']]);
    jsonResponse($stmt->fetch() ?: ['msg'=>'未找到']);
}

if ($action == 'transfer') {
    // 事务处理积分赠送逻辑...
}

// 3. 获取当前车厢手牌
if ($action == 'get_carriage') {
    $uid = $_SESSION['user_id'];
    $pool_type = $_GET['pool']; // 8pm 或 12pm
    // 赛道分配逻辑：找未满2人的车厢或开新车厢
    // 返回 10 局手牌数据
}
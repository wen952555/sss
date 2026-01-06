<?php
require_once 'db.php';
require_once 'helpers.php';

// 注册
if ($_GET['action'] == 'register') {
    $phone = $_POST['phone'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    if ($stmt->fetch()) sendResponse(['msg' => '手机号已存在'], 400);

    $shortId = generateShortId($pdo);
    $stmt = $pdo->prepare("INSERT INTO users (phone, password, short_id, points) VALUES (?, ?, ?, 0)");
    $stmt->execute([$phone, $password, $shortId]);
    sendResponse(['msg' => '注册成功', 'short_id' => $shortId]);
}

// 搜索手机号
if ($_GET['action'] == 'search') {
    $phone = $_GET['phone'];
    $stmt = $pdo->prepare("SELECT short_id FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    $user = $stmt->fetch();
    if ($user) sendResponse(['short_id' => $user['short_id']]);
    else sendResponse(['msg' => '未找到用户'], 404);
}
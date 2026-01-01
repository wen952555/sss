<?php
// backend/api.php
require 'db.php';
require 'functions.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'register':
        $phone = $input['phone'];
        $pass = $input['password'];
        if (strlen($pass) < 6) sendResponse(['error' => '密码需6位']);
        
        $uid = generateUID($pdo);
        $hashed = password_hash($pass, PASSWORD_DEFAULT);
        
        try {
            $stmt = $pdo->prepare("INSERT INTO users (phone, uid, password) VALUES (?, ?, ?)");
            $stmt->execute([$phone, $uid, $hashed]);
            sendResponse(['success' => true, 'uid' => $uid]);
        } catch (Exception $e) {
            sendResponse(['error' => '手机号已存在']);
        }
        break;

    case 'login':
        $phone = $input['phone'];
        $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user && password_verify($input['password'], $user['password'])) {
            unset($user['password']);
            sendResponse(['success' => true, 'user' => $user]);
        } else {
            sendResponse(['error' => '账号或密码错误']);
        }
        break;

    case 'search':
        $phone = $input['phone'];
        $stmt = $pdo->prepare("SELECT uid, phone FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        sendResponse($stmt->fetch(PDO::FETCH_ASSOC) ?: ['error' => '未找到用户']);
        break;

    case 'transfer':
        $from_id = $input['from_id'];
        $to_uid = $input['to_uid'];
        $amount = intval($input['amount']);
        
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ? FOR UPDATE");
        $stmt->execute([$from_id]);
        $balance = $stmt->fetchColumn();
        
        if ($balance >= $amount) {
            $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ?")->execute([$amount, $from_id]);
            $res = $pdo->prepare("UPDATE users SET points = points + ? WHERE uid = ?")->execute([$amount, $to_uid]);
            if ($res) {
                $pdo->commit();
                sendResponse(['success' => true]);
            }
        }
        $pdo->rollBack();
        sendResponse(['error' => '余额不足或接收ID错误']);
        break;
}
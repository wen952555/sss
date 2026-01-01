<?php
// backend/api.php
require 'db.php';
require 'functions.php';
require 'game_logic.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'deal': // 发牌接口
        $suits = ['spades', 'hearts', 'diamonds', 'clubs'];
        $values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        $deck = [];
        foreach ($suits as $s) {
            foreach ($values as $v) $deck[] = "{$v}_of_{$s}.svg";
        }
        shuffle($deck);
        sendResponse(['cards' => array_slice($deck, 0, 13)]);
        break;

    case 'submit_hand': // 提交比牌
        $front = Shisanshui::analyzeHand($input['front']); // 3张
        $mid = Shisanshui::analyzeHand($input['mid']);     // 5张
        $back = Shisanshui::analyzeHand($input['back']);   // 5张
        
        // 规则检查：尾 > 中 > 头
        if ($back['rank'] < $mid['rank'] || $mid['rank'] < $front['rank']) {
            sendResponse(['error' => '倒水了！(规则：后道必须大于中道，中道必须大于前道)']);
        } else {
            // 这里简单模拟赢了，增加100分
            $pdo->prepare("UPDATE users SET points = points + 100 WHERE id = ?")->execute([$input['user_id']]);
            sendResponse(['success' => true, 'msg' => '比牌成功，获得100积分！']);
        }
        break;

    // ... 保留之前的 login, register, search, transfer 分支 ...
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
}
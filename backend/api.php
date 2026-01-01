<?php
/**
 * 路径: backend/api.php
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit;

require_once 'db.php';
require_once 'functions.php';
require_once 'game_logic.php';

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'register':
        $phone = $input['phone'] ?? '';
        $pass = $input['password'] ?? '';
        if (strlen($pass) < 6) sendResponse(['error' => '密码需6位']);
        $uid = generateUID($pdo);
        $hashed = password_hash($pass, PASSWORD_DEFAULT);
        try {
            $stmt = $pdo->prepare("INSERT INTO users (phone, uid, password, points) VALUES (?, ?, ?, 1000)");
            $stmt->execute([$phone, $uid, $hashed]);
            sendResponse(['success' => true, 'uid' => $uid]);
        } catch (Exception $e) {
            sendResponse(['error' => '手机号已存在']);
        }
        break;

    case 'login':
        $phone = $input['phone'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $user = $stmt->fetch();
        if ($user && password_verify($input['password'], $user['password'])) {
            unset($user['password']);
            sendResponse(['success' => true, 'user' => $user]);
        } else {
            sendResponse(['error' => '账号或密码错误']);
        }
        break;

    case 'search':
        $phone = $input['phone'] ?? '';
        $stmt = $pdo->prepare("SELECT uid, phone FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        sendResponse($stmt->fetch() ?: ['error' => '未找到用户']);
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
            if ($res && $pdo->commit()) sendResponse(['success' => true]);
        }
        $pdo->rollBack();
        sendResponse(['error' => '余额不足或UID错误']);
        break;

    case 'deal':
        $suits = ['spades', 'hearts', 'diamonds', 'clubs'];
        $values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        $deck = [];
        foreach ($suits as $s) foreach ($values as $v) $deck[] = "{$v}_of_{$s}.svg";
        shuffle($deck);
        sendResponse(['cards' => array_slice($deck, 0, 13)]);
        break;

    case 'submit_hand':
        $f = $input['front']; $m = $input['mid']; $b = $input['back'];
        if (count($f)!=3 || count($m)!=5 || count($b)!=5) sendResponse(['error' => '牌数不全']);
        
        $sF = Shisanshui::getHandScore($f);
        $sM = Shisanshui::getHandScore($m);
        $sB = Shisanshui::getHandScore($b);

        if ($sB < $sM || $sM < $sF) {
            sendResponse(['error' => '倒水！规则：后道 ≥ 中道 ≥ 前道']);
        } else {
            $pdo->prepare("UPDATE users SET points = points + 100 WHERE id = ?")->execute([$input['user_id']]);
            sendResponse(['success' => true, 'msg' => '比牌成功！']);
        }
        break;

    default:
        sendResponse(['error' => 'Action not found']);
}

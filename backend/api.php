<?php
// backend/api.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') exit;

require 'db.php';
require 'functions.php';
require 'game_logic.php';

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'register':
        $uid = generateUID($pdo);
        $hashed = password_hash($input['password'], PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (phone, uid, password) VALUES (?, ?, ?)");
        if ($stmt->execute([$input['phone'], $uid, $hashed])) sendResponse(['success'=>true, 'uid'=>$uid]);
        break;

    case 'login':
        $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
        $stmt->execute([$input['phone']]);
        $u = $stmt->fetch();
        if ($u && password_verify($input['password'], $u['password'])) {
            unset($u['password']);
            sendResponse(['success'=>true, 'user'=>$u]);
        } else sendResponse(['error'=>'密码错误']);
        break;

    case 'get_sessions':
        $stmt = $pdo->query("SELECT * FROM game_sessions WHERE settle_time > NOW() AND status='open'");
        sendResponse($stmt->fetchAll());
        break;

    case 'book_session':
        $sid = $input['session_id'];
        $uid = $input['user_id'];
        $s = $pdo->prepare("SELECT settle_time FROM game_sessions WHERE id=?");
        $s->execute([$sid]);
        $sess = $s->fetch();
        if (strtotime($sess['settle_time']) - time() < 1800) sendResponse(['error'=>'场次已截止预约']);
        
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("SELECT * FROM carriages WHERE session_id=? AND (u1=0 OR u2=0 OR u3=0 OR u4=0) LIMIT 1 FOR UPDATE");
        $stmt->execute([$sid]);
        $c = $stmt->fetch();
        if (!$c) {
            $gids = implode(',', array_rand(range(1,960), 10));
            $stmt = $pdo->prepare("INSERT INTO carriages (session_id, game_ids, u1) VALUES (?,?,?)");
            $stmt->execute([$sid, $gids, $uid]);
        } else {
            $seat = $c['u1']==0?'u1':($c['u2']==0?'u2':($c['u3']==0?'u3':'u4'));
            $pdo->prepare("UPDATE carriages SET $seat=? WHERE id=?")->execute([$uid, $c['id']]);
        }
        $pdo->prepare("UPDATE users SET status='playing' WHERE id=?")->execute([$uid]);
        $pdo->commit();
        sendResponse(['success'=>true]);
        break;

    case 'get_my_game':
        $uid = $input['user_id'];
        $stmt = $pdo->prepare("SELECT c.*, s.settle_time FROM carriages c JOIN game_sessions s ON c.session_id=s.id WHERE (u1=? OR u2=? OR u3=? OR u4=?) AND s.status='open' LIMIT 1");
        $stmt->execute([$uid, $uid, $uid, $uid]);
        $c = $stmt->fetch();
        if (!$c) sendResponse(['error'=>'无进行中的场次']);
        $seat = $c['u1']==$uid?1:($c['u2']==$uid?2:($c['u3']==$uid?3:4));
        $gids = explode(',', $c['game_ids']);
        $tables = [];
        foreach($gids as $idx => $gid) {
            $stmt = $pdo->prepare("SELECT pos{$seat}_ai FROM pre_dealt_pool WHERE id=?");
            $stmt->execute([$gid]);
            $ai = json_decode($stmt->fetchColumn(), true);
            $sub = $pdo->prepare("SELECT * FROM submissions WHERE user_id=? AND carriage_id=? AND table_index=?");
            $sub->execute([$uid, $c['id'], $idx]);
            $m = $sub->fetch();
            $tables[] = [
                'index'=>$idx,
                'is_manual'=>$m?1:0,
                'front'=>$m?json_decode($m['front']):$ai['front'],
                'mid'=>$m?json_decode($m['mid']):$ai['mid'],
                'back'=>$m?json_decode($m['back']):$ai['back']
            ];
        }
        sendResponse(['carriage_id'=>$c['id'], 'tables'=>$tables]);
        break;

    case 'save_hand':
        $stmt = $pdo->prepare("REPLACE INTO submissions (user_id, carriage_id, table_index, front, mid, back, is_manual) VALUES (?,?,?,?,?,?,1)");
        $stmt->execute([$input['user_id'], $input['carriage_id'], $input['table_index'], json_encode($input['front']), json_encode($input['mid']), json_encode($input['back'])]);
        sendResponse(['success'=>true]);
        break;

    case 'search':
        $stmt = $pdo->prepare("SELECT uid, phone FROM users WHERE phone=?");
        $stmt->execute([$input['phone']]);
        sendResponse($stmt->fetch() ?: ['error'=>'未找到']);
        break;

    case 'transfer':
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ? AND points >= ?");
        if ($stmt->execute([$input['amount'], $input['from_id'], $input['amount']])) {
            $pdo->prepare("UPDATE users SET points = points + ? WHERE uid = ?")->execute([$input['amount'], $input['to_uid']]);
            $pdo->commit(); sendResponse(['success'=>true]);
        } else { $pdo->rollBack(); sendResponse(['error'=>'余额不足']); }
        break;
}
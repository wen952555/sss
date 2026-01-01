<?php
// backend/api.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
require 'db.php';
require 'functions.php';
require 'game_logic.php';

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'get_sessions':
        $stmt = $pdo->query("SELECT * FROM game_sessions WHERE settle_time > NOW() AND status='open'");
        sendResponse($stmt->fetchAll());
        break;

    case 'book_session':
        $uid = $input['user_id'];
        $sid = $input['session_id'];
        // 检查30分钟限制
        $session = $pdo->prepare("SELECT settle_time FROM game_sessions WHERE id=?");
        $session->execute([$sid]);
        $s = $session->fetch();
        if (strtotime($s['settle_time']) - time() < 1800) sendResponse(['error' => '该场次已停止预约']);

        // 检查玩家是否忙碌
        $user = $pdo->prepare("SELECT status FROM users WHERE id=?");
        $user->execute([$uid]);
        if ($user->fetchColumn() == 'playing') sendResponse(['error' => '您正在对局中，不可重复预约']);

        // 寻找或分配车厢
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("SELECT * FROM carriages WHERE session_id=? AND (u1=0 OR u2=0 OR u3=0 OR u4=0) LIMIT 1 FOR UPDATE");
        $stmt->execute([$sid]);
        $c = $stmt->fetch();

        if (!$c) {
            // 创建新车厢，随机抽10局牌
            $gids = implode(',', array_rand(range(1, 960), 10));
            $stmt = $pdo->prepare("INSERT INTO carriages (session_id, game_ids, u1) VALUES (?,?,?)");
            $stmt->execute([$sid, $gids, $uid]);
        } else {
            $seat = $c['u1']==0 ? 'u1' : ($c['u2']==0 ? 'u2' : ($c['u3']==0 ? 'u3' : 'u4'));
            $pdo->prepare("UPDATE carriages SET $seat=? WHERE id=?")->execute([$uid, $c['id']]);
        }
        $pdo->prepare("UPDATE users SET status='playing' WHERE id=?")->execute([$uid]);
        $pdo->commit();
        sendResponse(['success' => true]);
        break;

    case 'get_my_game':
        $uid = $input['user_id'];
        $stmt = $pdo->prepare("SELECT c.* FROM carriages c 
                               JOIN game_sessions s ON c.session_id = s.id 
                               WHERE (u1=? OR u2=? OR u3=? OR u4=?) AND s.status='open' LIMIT 1");
        $stmt->execute([$uid, $uid, $uid, $uid]);
        $c = $stmt->fetch();
        if (!$c) sendResponse(['error' => '暂无进行中的预约场']);

        // 确定座位和关联的牌
        $seat_idx = $c['u1']==$uid?1:($c['u2']==$uid?2:($c['u3']==$uid?3:4));
        $game_ids = explode(',', $c['game_ids']);
        $tables = [];
        foreach ($game_ids as $index => $gid) {
            $g = $pdo->prepare("SELECT pos{$seat_idx}_ai FROM pre_dealt_pool WHERE id=?");
            $g->execute([$gid]);
            $ai_hand = json_decode($g->fetchColumn(), true);
            
            // 查找用户是否已经手动理过
            $sub = $pdo->prepare("SELECT * FROM submissions WHERE user_id=? AND carriage_id=? AND table_index=?");
            $sub->execute([$uid, $c['id'], $index]);
            $manual = $sub->fetch();
            
            $tables[] = [
                'index' => $index,
                'front' => $manual ? json_decode($manual['front']) : $ai_hand['front'],
                'mid'   => $manual ? json_decode($manual['mid']) : $ai_hand['mid'],
                'back'  => $manual ? json_decode($manual['back']) : $ai_hand['back'],
                'is_manual' => $manual ? 1 : 0
            ];
        }
        sendResponse(['carriage_id' => $c['id'], 'tables' => $tables]);
        break;

    case 'save_table':
        $uid = $input['user_id'];
        $cid = $input['carriage_id'];
        $idx = $input['table_index'];
        $stmt = $pdo->prepare("REPLACE INTO submissions (user_id, carriage_id, table_index, front, mid, back, is_manual) VALUES (?,?,?,?,?,?,1)");
        $stmt->execute([$uid, $cid, $idx, json_encode($input['front']), json_encode($input['mid']), json_encode($input['back'])]);
        sendResponse(['success' => true]);
        break;

    case 'login':
        $phone = $input['phone'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ?");
        $stmt->execute([$phone]);
        $user = $stmt->fetch();
        if ($user && password_verify($input['password'], $user['password'])) {
            unset($user['password']);
            sendResponse(['success' => true, 'user' => $user]);
        } else sendResponse(['error' => '账号或密码错误']);
        break;
}
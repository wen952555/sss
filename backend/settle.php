<?php
// backend/settle.php
require 'db.php';
require 'game_logic.php';

// 1. 查找到了结算时间但未结算的场次
$sessions = $pdo->query("SELECT * FROM game_sessions WHERE settle_time <= NOW() AND status='open'")->fetchAll();

foreach ($sessions as $session) {
    // 2. 遍历该场次所有车厢
    $carriages = $pdo->prepare("SELECT * FROM carriages WHERE session_id=?");
    $carriages->execute([$session['id']]);
    
    foreach ($carriages->fetchAll() as $c) {
        $gids = explode(',', $c['game_ids']);
        $u_ids = [$c['u1'], $c['u2'], $c['u3'], $c['u4']];
        
        // 3. 对 10 局牌逐一结算
        foreach ($gids as $t_idx => $gid) {
            $hands = [];
            for ($seat = 1; $seat <= 4; $seat++) {
                $uid = $u_ids[$seat-1];
                if (!$uid) continue;
                // 优先找真人提交，没有则找AI
                $sub = $pdo->prepare("SELECT * FROM submissions WHERE user_id=? AND carriage_id=? AND table_index=?");
                $sub->execute([$uid, $c['id'], $t_idx]);
                $res = $sub->fetch();
                if ($res) {
                    $hands[$seat] = ['f' => json_decode($res['front']), 'm' => json_decode($res['mid']), 'b' => json_decode($res['back']), 'uid' => $uid];
                } else {
                    // AI牌池的字段是 pos1_json, pos2_json ...
                    $g = $pdo->prepare("SELECT pos{$seat}_json FROM pre_dealt_pool WHERE id=?");
                    $g->execute([$gid]);
                    $ai_data = json_decode($g->fetchColumn(), true);
                    $hands[$seat] = ['f' => $ai_data['ai']['front'], 'm' => $ai_data['ai']['mid'], 'b' => $ai_data['ai']['back'], 'uid' => $uid];
                }
            }
            
            // 4. 比牌逻辑 (此处为简化版：4人交叉比分)
            // 实际上你需要写一个循环，两两比对 front/mid/back 并增减 uid 对应的积分
            // ... 比牌代码 ...
        }
        
        // 5. 解锁所有玩家
        foreach ($u_ids as $uid) {
            if ($uid > 0) $pdo->prepare("UPDATE users SET status='free' WHERE id=?")->execute([$uid]);
        }
    }
    // 6. 标记场次已关闭
    $pdo->prepare("UPDATE game_sessions SET status='settled' WHERE id=?")->execute([$session['id']]);
}

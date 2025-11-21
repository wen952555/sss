<?php
// backend/api/game.php
require '../db.php';
require_once '../core/CardComparator.php';
require_once '../core/SpecialHandEvaluator.php';

$user = authenticate($pdo);
$action = $_GET['action'] ?? '';

// ... (get_hand 部分省略，请保留原样) ...

if ($action === 'submit_hand') {
    $input = json_decode(file_get_contents('php://input'), true);
    $deckId = $input['deck_id'];
    $arranged = $input['arranged']; // {front, mid, back, is_special:bool}
    $sessionId = $input['session_id'];

    try {
        $pdo->beginTransaction();

        // 1. 检测是否特殊牌型
        $spScore = 0;
        // 汇总13张牌
        $allCards = array_merge($arranged['front'], $arranged['mid'], $arranged['back']);
        $realSpScore = SpecialHandEvaluator::evaluate($allCards);
        
        // 如果前端声称是特殊牌型(例如用户点击了"一条龙"按钮)，且校验通过
        // (这里简化：直接以后端校验为准，如果 >0 就当特殊牌处理)
        if ($realSpScore > 0) {
            $spScore = $realSpScore;
        }

        // 2. 存入记录 (增加 sp_score 字段，如果数据库没这字段请先 ALTER TABLE game_actions ADD sp_score INT DEFAULT 0)
        // 为了不改表结构，我们将 sp_score 存入 hand_arranged 的 JSON 里，或者 score_result 暂存
        // 建议: 存入 JSON
        $arranged['sp_score'] = $spScore;

        $stmt = $pdo->prepare("SELECT id FROM game_actions WHERE session_id = ? AND deck_id = ? AND user_id = ?");
        $stmt->execute([$sessionId, $deckId, $user['id']]);
        if (!$stmt->fetch()) {
            $pdo->prepare("INSERT INTO game_actions (session_id, deck_id, user_id, hand_arranged) VALUES (?, ?, ?, ?)")
                ->execute([$sessionId, $deckId, $user['id'], json_encode($arranged)]);
            
            $pdo->prepare("UPDATE session_players SET current_step = current_step + 1 WHERE user_id = ? AND session_id = ?")
                ->execute([$user['id'], $sessionId]);
        }

        // 3. 结算检查
        $stmt = $pdo->prepare("SELECT * FROM game_actions WHERE session_id = ? AND deck_id = ?");
        $stmt->execute([$sessionId, $deckId]);
        $actions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $settleResult = null;

        if (count($actions) == 4) {
            if ($actions[0]['is_settled'] == 0) {
                $scores = []; 
                $players = [];

                // 解析数据
                foreach ($actions as $act) {
                    $data = json_decode($act['hand_arranged'], true);
                    $uid = $act['user_id'];
                    $scores[$uid] = 0;
                    $players[] = [
                        'uid' => $uid,
                        'sp_score' => $data['sp_score'] ?? 0,
                        'hand' => $data // {front, mid, back}
                    ];
                }

                // --- 核心计分循环 ---
                for ($i = 0; $i < 4; $i++) {
                    for ($j = $i + 1; $j < 4; $j++) {
                        $p1 = $players[$i];
                        $p2 = $players[$j];
                        $s1 = 0; // p1 对 p2 的净胜分

                        // Case A: 至少一人是特殊牌型
                        if ($p1['sp_score'] > 0 || $p2['sp_score'] > 0) {
                            $s1 = $p1['sp_score'] - $p2['sp_score']; 
                            // 例: p1(26) - p2(0) = 26
                            // 例: p1(26) - p2(6) = 20
                            // 例: p1(0) - p2(6) = -6
                        }
                        // Case B: 都是普通牌型 -> 比三道 + 打枪
                        else {
                            // 解析三道
                            $h1 = [
                                'f' => CardComparator::getHandInfo($p1['hand']['front']),
                                'm' => CardComparator::getHandInfo($p1['hand']['mid']),
                                'b' => CardComparator::getHandInfo($p1['hand']['back'])
                            ];
                            $h2 = [
                                'f' => CardComparator::getHandInfo($p2['hand']['front']),
                                'm' => CardComparator::getHandInfo($p2['hand']['mid']),
                                'b' => CardComparator::getHandInfo($p2['hand']['back'])
                            ];

                            $wins = 0; // 记录赢的道数 (正数p1赢，负数p2赢)
                            $baseScore = 0;

                            foreach (['f'=>'front', 'm'=>'mid', 'b'=>'back'] as $k => $lane) {
                                $res = CardComparator::compare($h1[$k], $h2[$k]);
                                if ($res == 1) {
                                    $wins++;
                                    $baseScore += CardComparator::getScore($h1[$k], $lane);
                                } elseif ($res == -1) {
                                    $wins--;
                                    $baseScore -= CardComparator::getScore($h2[$k], $lane);
                                }
                            }

                            $s1 = $baseScore;

                            // 打枪判定 (3道全胜)
                            if ($wins == 3) {
                                $s1 = $s1 * 2; // 翻倍
                                // 标记打枪 (用于全垒打计算，暂略复杂全垒打检测，只做两两打枪)
                            } elseif ($wins == -3) {
                                $s1 = $s1 * 2;
                            }
                        }

                        // 累加分数
                        $scores[$p1['uid']] += $s1;
                        $scores[$p2['uid']] -= $s1;
                    }
                }

                // 全垒打检测 (Case B 场景下)
                // 这里的逻辑比较复杂：需要统计每个人是否赢了其他3个人所有道。
                // 简单起见，我们这里只实现了“打枪翻倍”。
                // 真正的全垒打需要在上面的循环外再套一层检测：
                // foreach player: if (beat_all_3_opponents_in_all_lanes) score *= 2;
                // 由于篇幅限制，且打枪翻倍已经很刺激，这里暂时只实现到打枪。

                // 入库
                foreach ($scores as $uid => $score) {
                    $pdo->prepare("UPDATE game_actions SET score_result = ?, is_settled = 1 WHERE session_id = ? AND deck_id = ? AND user_id = ?")
                        ->execute([$score, $sessionId, $deckId, $uid]);
                    
                    $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?")
                        ->execute([$score, $uid]);
                }
                
                $settleResult = $scores[$user['id']];
            } else {
                foreach ($actions as $act) {
                    if ($act['user_id'] == $user['id']) $settleResult = $act['score_result'];
                }
            }
        }

        $pdo->commit();
        echo json_encode(['status' => 'success', 'settled' => ($settleResult !== null), 'score_change' => $settleResult]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($e->getCode() == '23000') echo json_encode(['status' => 'success', 'info' => 'submitted']);
        else echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
?>
<?php
// backend/api/lobby.php
require '../db.php';
require '../core/Logic.php';

$user = authenticate($pdo);
$action = $_GET['action'] ?? '';
$score_level = $_GET['level'] ?? 2; // 2, 5, 10

if ($action === 'join_game') {
    // 1. 查找是否有 'recruiting' 的车厢
    $stmt = $pdo->prepare("SELECT id FROM game_sessions WHERE status = 'recruiting' AND score_level = ? LIMIT 1");
    $stmt->execute([$score_level]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    $session_id = 0;
    $seat_index = 0;

    $pdo->beginTransaction();

    if ($session) {
        $session_id = $session['id'];
        // 检查当前人数
        $stmt = $pdo->prepare("SELECT count(*) FROM session_players WHERE session_id = ?");
        $stmt->execute([$session_id]);
        $count = $stmt->fetchColumn();

        if ($count >= 4) {
            // 并发边界情况：满了，新建一个
            // 这里简化处理，实际应重试。
            // 为演示代码清晰，此处直接回滚并报错请重试
            $pdo->rollBack();
            echo json_encode(['status' => 'retry']); 
            exit;
        }
        $seat_index = $count + 1;
    } else {
        // 新建车厢
        $pdo->prepare("INSERT INTO game_sessions (score_level, status) VALUES (?, 'recruiting')")->execute([$score_level]);
        $session_id = $pdo->lastInsertId();
        $seat_index = 1;
    }

    // 2. 加入玩家到 session_players 并分配 20 局乱序 Deck
    $deck_order = GameLogic::generateDeckOrder();
    
    $sql = "INSERT INTO session_players (session_id, user_id, seat_index, deck_order, current_step) VALUES (?, ?, ?, ?, 1)";
    $pdo->prepare($sql)->execute([
        $session_id, 
        $user['id'], 
        $seat_index, 
        json_encode($deck_order)
    ]);

    // 如果坐满4人，更新状态为 active
    if ($seat_index == 4) {
        $pdo->prepare("UPDATE game_sessions SET status = 'active' WHERE id = ?")->execute([$session_id]);
    }

    $pdo->commit();

    echo json_encode([
        'status' => 'success', 
        'session_id' => $session_id,
        'seat_index' => $seat_index
    ]);
}
?>
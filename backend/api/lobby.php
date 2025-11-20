<?php
// backend/api/lobby.php
require '../db.php';
require '../core/Logic.php';

$user = authenticate($pdo);
$action = $_GET['action'] ?? '';
$score_level = $_GET['level'] ?? 2;

if ($action === 'join_game') {
    // [新增] 检查用户是否已经在进行中的游戏中 (断线重连)
    $stmt = $pdo->prepare("SELECT session_id FROM session_players WHERE user_id = ? AND is_finished = 0");
    $stmt->execute([$user['id']]);
    $existingSession = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existingSession) {
        // 如果已经在游戏中，直接返回成功，前端会自动跳转
        echo json_encode([
            'status' => 'success', 
            'session_id' => $existingSession['session_id'],
            'message' => '正在重连回当前牌局...'
        ]);
        exit;
    }

    // --- 以下是正常的加入逻辑 ---

    $stmt = $pdo->prepare("SELECT id FROM game_sessions WHERE status = 'recruiting' AND score_level = ? LIMIT 1");
    $stmt->execute([$score_level]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    $session_id = 0;
    $seat_index = 0;

    $pdo->beginTransaction();

    if ($session) {
        $session_id = $session['id'];
        $stmt = $pdo->prepare("SELECT count(*) FROM session_players WHERE session_id = ?");
        $stmt->execute([$session_id]);
        $count = $stmt->fetchColumn();

        if ($count >= 4) {
            $pdo->rollBack();
            echo json_encode(['status' => 'retry', 'message' => '房间已满请重试']); 
            exit;
        }
        $seat_index = $count + 1;
    } else {
        $pdo->prepare("INSERT INTO game_sessions (score_level, status) VALUES (?, 'recruiting')")->execute([$score_level]);
        $session_id = $pdo->lastInsertId();
        $seat_index = 1;
    }

    $deck_order = GameLogic::generateDeckOrder();
    
    $sql = "INSERT INTO session_players (session_id, user_id, seat_index, deck_order, current_step) VALUES (?, ?, ?, ?, 1)";
    $pdo->prepare($sql)->execute([
        $session_id, 
        $user['id'], 
        $seat_index, 
        json_encode($deck_order)
    ]);

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
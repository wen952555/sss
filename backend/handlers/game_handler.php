<?php
// handlers/game_handler.php

function handleGetTablesStatus($pdo, $userId) {
    // 这是一个复杂的查询，需要根据我们讨论的逻辑来实现
    // 简化逻辑：查询每个桌子(1-6)最新一个未完成的场次状态
    $tablesStatus = [];
    for ($i = 1; $i <= 6; $i++) {
        $stmt = $pdo->prepare("
            SELECT b.id as batch_id, COUNT(ps.user_id) as player_count, b.status
            FROM game_batches b
            LEFT JOIN batch_player_status ps ON b.id = ps.batch_id
            WHERE b.table_id = ? AND b.status != 'completed'
            GROUP BY b.id, b.status
            ORDER BY b.batch_number DESC LIMIT 1
        ");
        $stmt->execute([$i]);
        $batch = $stmt->fetch();

        $score_type_map = [1 => 2, 2 => 2, 3 => 5, 4 => 5, 5 => 10, 6 => 10];
        $table_number_map = [1 => 1, 2 => 2, 3 => 1, 4 => 2, 5 => 1, 6 => 2];
        
        if ($batch) {
             $status = ($batch['player_count'] >= 4) ? 'in_game' : 'waiting';
             // 这里需要更精确的状态判断，比如从 batch_player_status 中判断
             $tablesStatus[] = [
                'table_id' => $i,
                'score_type' => $score_type_map[$i],
                'table_number' => $table_number_map[$i],
                'status' => $status,
                'players_current' => (int)$batch['player_count'],
                'players_needed' => 4,
            ];
        } else {
            // 没有活跃场次，桌子空闲
            $tablesStatus[] = [
                'table_id' => $i,
                'score_type' => $score_type_map[$i],
                'table_number' => $table_number_map[$i],
                'status' => 'waiting',
                'players_current' => 0,
                'players_needed' => 4,
            ];
        }
    }
    
    echo json_encode(['success' => true, 'tables' => $tablesStatus]);
}

// 此处应有 handleJoinTable, handleGetNextCard, handleSubmitHand 等函数
// 它们的逻辑会严格遵循我们之前讨论的数据库交互流程
?>
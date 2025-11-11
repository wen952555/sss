<?php
// handlers/game_handler.php

function handleGetTablesStatus($pdo, $userId) {
    try {
        $tablesStatus = [];
        
        // 分数类型和桌子编号映射
        $score_type_map = [1 => 2, 2 => 2, 3 => 5, 4 => 5, 5 => 10, 6 => 10];
        $table_number_map = [1 => 1, 2 => 2, 3 => 1, 4 => 2, 5 => 1, 6 => 2];
        
        for ($i = 1; $i <= 6; $i++) {
            // 查询每个桌子的最新批次
            $stmt = $pdo->prepare("
                SELECT 
                    b.id as batch_id, 
                    b.status,
                    COUNT(ps.user_id) as player_count
                FROM game_batches b
                LEFT JOIN batch_player_status ps ON b.id = ps.batch_id
                WHERE b.table_id = ?
                GROUP BY b.id, b.status
                ORDER BY b.batch_number DESC, b.id DESC 
                LIMIT 1
            ");
            $stmt->execute([$i]);
            $batch = $stmt->fetch();

            if ($batch) {
                $status = ($batch['player_count'] >= 4) ? 'in_game' : 'waiting';
                // 如果数据库中的状态是 completed，则覆盖为 waiting
                if ($batch['status'] === 'completed') {
                    $status = 'waiting';
                }
                
                $tablesStatus[] = [
                    'table_id' => $i,
                    'score_type' => $score_type_map[$i],
                    'table_number' => $table_number_map[$i],
                    'status' => $status,
                    'players_current' => (int)$batch['player_count'],
                    'players_needed' => 4,
                ];
            } else {
                // 没有批次数据，创建默认状态
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
        
        echo json_encode([
            'success' => true, 
            'tables' => $tablesStatus,
            'message' => 'Tables status retrieved successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Error in handleGetTablesStatus: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Failed to retrieve tables status: ' . $e->getMessage()
        ]);
    }
}

// 其他游戏处理函数将在后续添加
function handleJoinTable($pdo, $userId, $tableId) {
    // 加入桌子的逻辑
    return ['success' => true, 'message' => 'Joined table successfully'];
}

function handleSubmitHand($pdo, $userId, $handData) {
    // 提交手牌的逻辑
    return ['success' => true, 'message' => 'Hand submitted successfully'];
}
?>
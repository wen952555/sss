<?php
function handle_game_request($action, $parts) {
    // TODO: 获取Token并验证用户身份

    switch ($action) {
        case 'join_table':
            // TODO: 实现加入桌子逻辑
            json_response(['message' => 'Joined table successfully']);
            break;
        case 'get_card':
            // TODO: 实现获取下一局牌逻辑
            json_response(['message' => 'Card data placeholder']);
            break;
        // ... 其他游戏相关接口
        default:
            json_response(['error' => 'Unknown game action'], 404);
            break;
    }
}

function get_tables_status() {
    // TODO: 实现获取所有桌子状态的逻辑
    $dummy_status = [
        'tables' => [
            ['table_id' => 1, 'score_type' => 2, 'table_number' => 1, 'status' => 'waiting', 'players_current' => 1, 'players_needed' => 4],
            ['table_id' => 2, 'score_type' => 2, 'table_number' => 2, 'status' => 'in_game', 'players_current' => 4, 'players_needed' => 4],
            // ... 其他4个桌子
        ]
    ];
    json_response($dummy_status);
}
?>
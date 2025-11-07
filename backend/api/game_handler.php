<?php
// 引入全局函数
require_once __DIR__ . '/../core/functions.php';

/**
 * 处理所有与游戏相关的API请求
 * @param string|null $action 请求的操作
 * @param array $parts URL路径的各个部分
 */
function handle_game_request($action, $parts) {
    // TODO: 从请求头获取Token并验证用户身份
    // $user_id = validate_token_and_get_user_id();
    // if (!$user_id) {
    //     json_response(['error' => 'Unauthorized'], 401);
    //     return;
    // }
    
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($action) {
        case 'join_table':
            if ($method === 'POST') {
                join_table();
            } else {
                json_response(['error' => 'Invalid request method'], 405);
            }
            break;
        case 'get_card':
            // 假设获取牌局信息使用GET
            if ($method === 'GET') {
                get_next_game_cards();
            } else {
                json_response(['error' => 'Invalid request method'], 405);
            }
            break;
        // ... 其他游戏相关接口
        default:
            json_response(['error' => 'Unknown game action'], 404);
            break;
    }
}

/**
 * 获取所有桌子的状态
 */
function get_tables_status() {
    // TODO: 实现真实的从数据库获取所有桌子状态的逻辑
    // 1. 查询 `batch_player_status` 表
    // 2. 按 `table_id` 分组并统计每个桌子的人数
    // 3. 组合成前端需要的格式

    $dummy_status = [
        'tables' => [
            ['table_id' => 1, 'score_type' => 2, 'table_number' => 1, 'status' => 'waiting', 'players_current' => 1, 'players_needed' => 4],
            ['table_id' => 2, 'score_type' => 2, 'table_number' => 2, 'status' => 'in_game', 'players_current' => 4, 'players_needed' => 4],
            // ... 其他4个桌子
        ]
    ];
    json_response($dummy_status);
}


/**
 * 玩家加入一个桌子
 */
function join_table() {
    $data = get_request_data();
    if (empty($data['table_id'])) {
        json_response(['error' => 'table_id is required'], 400);
        return;
    }
    
    $table_id = $data['table_id'];
    // $user_id = ... (从Token中获取)

    // TODO: 实现加入桌子的复杂逻辑
    // 1. 检查桌子是否存在且未满
    // 2. 检查玩家是否已在其他游戏中
    // 3. 将玩家加入 `batch_player_status` 表
    // 4. 如果人满，开始游戏 (更新状态，分配牌局等)
    
    json_response(['message' => "Joined table {$table_id} successfully"]);
}

/**
 * 获取玩家的下一局牌
 */
function get_next_game_cards() {
    // $user_id = ... (从Token中获取)

    // TODO: 实现获取下一局牌的逻辑
    // 1. 根据 `user_id` 从 `player_batch_assignments` 获取当前应该玩的牌局索引
    // 2. 从 `pre_generated_games` 表中获取对应的牌局数据
    // 3. 返回牌局信息给前端
    
    $dummy_cards = [
        'game_id' => 101,
        'hand' => ['s1', 's2', 's3', 'h4', 'h5', 'h6', 'd7', 'd8', 'd9', 'c10', 'c11', 'c12', 'c13'],
        'round' => '1/20'
    ];
    json_response($dummy_cards);
}
?>
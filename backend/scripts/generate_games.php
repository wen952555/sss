<?php
// 使用绝对路径来包含文件

// 获取当前脚本的目录
$current_dir = __DIR__;
// 获取项目根目录（public_html）
$root_dir = dirname($current_dir);

// 包含必要的文件
require_once $root_dir . '/config/database.php';
require_once $root_dir . '/models/GameModel.php';
require_once $root_dir . '/models/InventoryModel.php';
require_once $root_dir . '/utils/CardGenerator.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("无法连接到数据库，请检查配置\n");
}

$gameModel = new GameModel($db);
$inventoryModel = new InventoryModel($db);
$cardGenerator = new CardGenerator();

// 配置
$session_types = ['2', '5', '10'];
$games_per_type = 960; // 每个类型960局
$batch_size = 100; // 每批生成数量

foreach ($session_types as $session_type) {
    echo "开始生成 {$session_type} 分场牌局...\n";
    
    $current_count = $gameModel->countAvailableGames($session_type);
    $needed_games = $games_per_type - $current_count;
    
    if ($needed_games <= 0) {
        echo "{$session_type} 分场牌局充足，跳过生成\n";
        continue;
    }
    
    echo "需要生成 {$needed_games} 局牌局\n";
    
    $generated = 0;
    while ($generated < $needed_games) {
        $batch_games = min($batch_size, $needed_games - $generated);
        
        for ($i = 0; $i < $batch_games; $i++) {
            // 获取下一个位置
            $position = $gameModel->getNextGamePosition($session_type);
            $session_id = $position['session_id'];
            $round_number = $position['round_number'];
            
            // 生成牌局
            $players_cards = $cardGenerator->dealCards();
            
            $game_data = [
                'session_type' => $session_type,
                'session_id' => $session_id,
                'round_number' => $round_number
            ];
            
            // 为每个玩家生成智能理牌结果
            for ($p = 0; $p < 4; $p++) {
                $original_cards = $players_cards[$p];
                $arranged_cards = $cardGenerator->smartArrange($original_cards);
                
                $game_data['player' . ($p + 1) . '_original'] = json_encode($original_cards);
                $game_data['player' . ($p + 1) . '_arranged'] = json_encode($arranged_cards);
            }
            
            // 保存牌局
            $gameModel->createGame($game_data);
            $generated++;
            
            if ($generated % 50 == 0) {
                echo "已生成 {$generated} 局...\n";
            }
        }
    }
    
    // 更新库存统计
    $total_games = $gameModel->countAvailableGames($session_type) + 
                   $gameModel->countAvailableGames($session_type, 'used');
    $available_games = $gameModel->countAvailableGames($session_type);
    
    $inventoryModel->updateInventory($session_type, $total_games, $available_games);
    
    echo "{$session_type} 分场牌局生成完成！总计: {$total_games}, 可用: {$available_games}\n";
}

echo "所有牌局生成完成！\n";
?>
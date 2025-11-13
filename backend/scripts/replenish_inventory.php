<?php
require_once '../config/database.php';
require_once '../models/GameModel.php';
require_once '../models/InventoryModel.php';
require_once '../utils/CardGenerator.php';

$database = new Database();
$db = $database->getConnection();
$gameModel = new GameModel($db);
$inventoryModel = new InventoryModel($db);
$cardGenerator = new CardGenerator();

// 配置
$min_inventory = 240; // 最小库存
$replenish_amount = 720; // 补货数量
$session_types = ['2', '5', '10'];

foreach ($session_types as $session_type) {
    $available_games = $gameModel->countAvailableGames($session_type);
    
    echo "{$session_type} 分场当前库存: {$available_games}\n";
    
    if ($available_games > $min_inventory) {
        echo "库存充足，跳过补货\n";
        continue;
    }
    
    $needed_games = $replenish_amount;
    echo "开始补货 {$needed_games} 局...\n";
    
    $generated = 0;
    while ($generated < $needed_games) {
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
        
        if ($generated % 100 == 0) {
            echo "已补货 {$generated} 局...\n";
        }
    }
    
    // 更新库存统计
    $total_games = $gameModel->countAvailableGames($session_type) + 
                   $gameModel->countAvailableGames($session_type, 'used');
    $available_games = $gameModel->countAvailableGames($session_type);
    
    $inventoryModel->updateInventory($session_type, $total_games, $available_games);
    
    echo "{$session_type} 分场补货完成！当前库存: {$available_games}\n";
}

echo "库存补货完成！\n";
?>
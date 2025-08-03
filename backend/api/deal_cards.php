<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// 定义一副完整的牌
$ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
$suits = ['spades', 'hearts', 'clubs', 'diamonds'];
$deck = [];
foreach ($suits as $suit) {
    foreach ($ranks as $rank) {
        $deck[] = ['rank' => $rank, 'suit' => $suit];
    }
}

// 洗牌
shuffle($deck);

// --- 智能理牌函数 (基础策略) ---
// 为了直接将牌分到牌墩中，我们需要一个函数来执行这个操作。
// 这里的策略是简单的按牌力排序，然后分配。
function autoArrangeHand($hand) {
    // 定义点数用于排序
    $rankValues = [
        '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10, 
        'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
    ];

    // 按点数从大到小排序
    usort($hand, function($a, $b) use ($rankValues) {
        return $rankValues[$b['rank']] - $rankValues[$a['rank']];
    });
    
    // 按照 5-5-3 的顺序分配，因为排序后最大的牌应该在尾墩
    $bottomLane = array_slice($hand, 0, 5);
    $middleLane = array_slice($hand, 5, 5);
    $topLane = array_slice($hand, 10, 3);
    
    return [
        'top' => $topLane,
        'middle' => $middleLane,
        'bottom' => $bottomLane
    ];
}


// --- 主逻辑 ---
// 我们只处理一个玩家的情况，因为现在是单人游戏模式
$players = 1;
$cards_per_player = 13;
$total_cards_needed = $players * $cards_per_player;

if (count($deck) < $total_cards_needed) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '牌不够分']);
    exit;
}

$playerHand = array_slice($deck, 0, $cards_per_player);

// 使用智能理牌函数直接生成三个牌墩
$arrangedHand = autoArrangeHand($playerHand);

// 返回理好的牌墩
echo json_encode([
    'success' => true,
    // hands 结构现在直接包含分好的牌墩
    'hands' => [
        '玩家 1' => $arrangedHand
    ]
]);

?>

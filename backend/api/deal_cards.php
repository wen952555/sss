<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// --- 获取URL参数 ---
$gameType = isset($_GET['game']) ? $_GET['game'] : 'thirteen'; // 默认为十三张
$players = isset($_GET['players']) ? intval($_GET['players']) : 1;
$cards_per_player = isset($_GET['cards']) ? intval($_GET['cards']) : 13;


// --- 定义一副完整的牌 ---
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


// --- 十三张的智能理牌函数 ---
function autoArrangeThirteen($hand) {
    $rankValues = [
        '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10, 
        'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
    ];
    usort($hand, function($a, $b) use ($rankValues) {
        return $rankValues[$b['rank']] - $rankValues[$a['rank']];
    });
    return [
        'top' => array_slice($hand, 10, 3),
        'middle' => array_slice($hand, 5, 5),
        'bottom' => array_slice($hand, 0, 5)
    ];
}

// --- 八张游戏的初始理牌函数 ---
function autoArrangeEight($hand) {
    // 按要求，所有8张牌初始都在中道
    return [
        'top' => [],
        'middle' => $hand,
        'bottom' => []
    ];
}


// --- 主逻辑 ---
$total_cards_needed = $players * $cards_per_player;
if (count($deck) < $total_cards_needed) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => '牌不够分']);
    exit;
}

$all_hands = [];
for ($i = 0; $i < $players; $i++) {
    $playerHand = array_slice($deck, $i * $cards_per_player, $cards_per_player);
    
    // 根据游戏类型选择不同的理牌函数
    if ($gameType === 'eight') {
        $arrangedHand = autoArrangeEight($playerHand);
    } else {
        $arrangedHand = autoArrangeThirteen($playerHand);
    }
    
    $all_hands['玩家 ' . ($i + 1)] = $arrangedHand;
}


// 返回所有理好的牌
echo json_encode([
    'success' => true,
    'hands' => $all_hands
]);

?>

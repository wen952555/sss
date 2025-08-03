<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

function generateDeck() {
    $ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    $suits = ['spades', 'hearts', 'clubs', 'diamonds'];
    $deck = [];

    foreach ($suits as $suit) {
        foreach ($ranks as $rank) {
            $deck[] = ['rank' => $rank, 'suit' => $suit];
        }
    }
    // 十三张通常不用大小王，这里暂时移除以确保是52张牌
    // $deck[] = ['rank' => 'red_joker', 'suit' => 'joker'];
    // $deck[] = ['rank' => 'black_joker', 'suit' => 'joker'];
    
    return $deck;
}

$playerCount = isset($_GET['players']) ? (int)$_GET['players'] : 4;
$cardsPerPlayer = isset($_GET['cards']) ? (int)$_GET['cards'] : 13;
$totalCardsNeeded = $playerCount * $cardsPerPlayer;

$deck = generateDeck();

if ($totalCardsNeeded > count($deck)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => "错误：请求的牌数 ({$totalCardsNeeded}) 超过了总牌数 (" . count($deck) . ")。"
    ]);
    exit;
}

shuffle($deck);

$hands = [];
$cardPointer = 0; // 用一个指针来追踪当前发到哪张牌了

for ($i = 1; $i <= $playerCount; $i++) {
    // 使用 array_slice 从牌堆中为每个玩家切出准确数量的牌
    $playerHand = array_slice($deck, $cardPointer, $cardsPerPlayer);
    $hands["玩家 {$i}"] = $playerHand;
    $cardPointer += $cardsPerPlayer; // 移动指针
}

http_response_code(200);
echo json_encode([
    'success' => true,
    'hands' => $hands
]);
?>
<?php
// backend/api/deal_cards.php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); // 允许跨域请求，在生产环境中应配置得更严格

// 定义一副标准的52张扑克牌
$suits = ['hearts', 'diamonds', 'clubs', 'spades'];
$ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];

$deck = [];
foreach ($suits as $suit) {
    foreach ($ranks as $rank) {
        $deck[] = ['suit' => $suit, 'rank' => $rank];
    }
}

// 洗牌
shuffle($deck);

// 从URL参数获取玩家数量和每位玩家的牌数，如果未提供则使用默认值
$numPlayers = isset($_GET['players']) ? (int)$_GET['players'] : 4; // 默认4个玩家
$cardsPerPlayer = isset($_GET['cards']) ? (int)$_GET['cards'] : 13; // 默认每个玩家13张牌

$hands = [];
for ($i = 0; $i < $numPlayers; $i++) {
    // 从牌堆中为每个玩家发指定数量的牌
    $hand = array_slice($deck, $i * $cardsPerPlayer, $cardsPerPlayer);
    $hands["player" . ($i + 1)] = $hand;
}

// 以JSON格式返回发牌结果
echo json_encode(['success' => true, 'hands' => $hands]);

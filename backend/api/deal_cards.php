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

// 添加大小王
$deck[] = ['rank' => 'red_joker', 'suit' => 'joker'];
$deck[] = ['rank' => 'black_joker', 'suit' => 'joker'];

// 洗牌
shuffle($deck);

// 根据游戏类型获取玩家数量和每位玩家的牌数
$numPlayers = isset($_GET['players']) ? (int)$_GET['players'] : 4;
$cardsPerPlayer = isset($_GET['cards']) ? (int)$_GET['cards'] : 13;

$hands = [];
// 确保不会因发牌数量超过牌堆总数而报错
if ($numPlayers * $cardsPerPlayer <= count($deck)) {
    for ($i = 0; $i < $numPlayers; $i++) {
        // 从牌堆中为每个玩家发指定数量的牌
        $hand = array_slice($deck, $i * $cardsPerPlayer, $cardsPerPlayer);
        $hands["玩家 " . ($i + 1)] = $hand;
    }
    echo json_encode(['success' => true, 'hands' => $hands]);
} else {
    echo json_encode(['success' => false, 'message' => '牌堆中的牌不足以满足游戏要求。']);
}

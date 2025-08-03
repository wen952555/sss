<?php
// backend/utils/poker_evaluator.php

// 定义常量
const RANK_VALUES = [
    '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10, 
    'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
];

const HAND_TYPES = [
    'HIGH_CARD' => ['rank' => 0, 'name' => '高牌'],
    'PAIR' => ['rank' => 1, 'name' => '对子'],
    'TWO_PAIR' => ['rank' => 2, 'name' => '两对'],
    'THREE_OF_A_KIND' => ['rank' => 3, 'name' => '三条'],
    'STRAIGHT' => ['rank' => 4, 'name' => '顺子'],
    'FLUSH' => ['rank' => 5, 'name' => '同花'],
    'FULL_HOUSE' => ['rank' => 6, 'name' => '葫芦'],
    'FOUR_OF_A_KIND' => ['rank' => 7, 'name' => '铁支'],
    'STRAIGHT_FLUSH' => ['rank' => 8, 'name' => '同花顺'],
];

// 用于排序的单卡牌力评估
function evaluate_card_value($card) {
    return RANK_VALUES[$card['rank']];
}

// PHP版手牌评估函数
function evaluateHand($cards) {
    if (empty($cards)) {
        return array_merge(HAND_TYPES['HIGH_CARD'], ['values' => [0]]);
    }

    $ranks = array_map(function($c) { return RANK_VALUES[$c['rank']]; }, $cards);
    rsort($ranks);
    $suits = array_map(function($c) { return $c['suit']; }, $cards);

    $isFlush = count(array_unique($suits)) === 1;
    
    $rankSet = array_unique($ranks);
    $isStraight = count($rankSet) === count($cards) && ($ranks[0] - $ranks[count($ranks) - 1] === count($cards) - 1);
    // A-5顺子特殊处理
    $isAceLowStraight = ($ranks === [14, 5, 4, 3, 2]);

    if ($isStraight && $isFlush) return array_merge(HAND_TYPES['STRAIGHT_FLUSH'], ['values' => $ranks]);
    if ($isAceLowStraight && $isFlush) return array_merge(HAND_TYPES['STRAIGHT_FLUSH'], ['values' => [5, 4, 3, 2, 1]]);

    $rankCounts = array_count_values($ranks);
    arsort($rankCounts);
    
    $counts = array_values($rankCounts);
    $primaryRanks = array_keys($rankCounts);

    if ($counts[0] === 4) return array_merge(HAND_TYPES['FOUR_OF_A_KIND'], ['values' => $primaryRanks]);
    if ($counts[0] === 3 && isset($counts[1]) && $counts[1] === 2) return array_merge(HAND_TYPES['FULL_HOUSE'], ['values' => $primaryRanks]);
    if ($isFlush) return array_merge(HAND_TYPES['FLUSH'], ['values' => $ranks]);
    if ($isStraight) return array_merge(HAND_TYPES['STRAIGHT'], ['values' => $ranks]);
    if ($isAceLowStraight) return array_merge(HAND_TYPES['STRAIGHT'], ['values' => [5, 4, 3, 2, 1]]);
    if ($counts[0] === 3) return array_merge(HAND_TYPES['THREE_OF_A_KIND'], ['values' => $primaryRanks]);
    if ($counts[0] === 2 && isset($counts[1]) && $counts[1] === 2) return array_merge(HAND_TYPES['TWO_PAIR'], ['values' => $primaryRanks]);
    if ($counts[0] === 2) return array_merge(HAND_TYPES['PAIR'], ['values' => $primaryRanks]);

    return array_merge(HAND_TYPES['HIGH_CARD'], ['values' => $ranks]);
}

// PHP版牌力比较函数
function compareHands($handA, $handB) {
    if (!$handA || !$handB) return 0;
    $rankDifference = $handA['rank'] - $handB['rank'];
    if ($rankDifference !== 0) return $rankDifference;
    
    // 对于牌型相同的，比较关键张
    $valuesA = $handA['values'];
    $valuesB = $handB['values'];
    $count = min(count($valuesA), count($valuesB));
    for ($i = 0; $i < $count; $i++) {
        $valueDifference = $valuesA[$i] - $valuesB[$i];
        if ($valueDifference !== 0) return $valueDifference;
    }
    return 0;
}
?>

<?php
// backend/includes/card_logic.php

define('SUITS', ['S', 'H', 'D', 'C']); // Spades, Hearts, Diamonds, Clubs (黑桃, 红桃, 方块, 梅花)
define('RANKS', ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']); // T for Ten

function createDeck() {
    $deck = [];
    foreach (SUITS as $suit) {
        foreach (RANKS as $rank) {
            $deck[] = ['suit' => $suit, 'rank' => $rank];
        }
    }
    return $deck;
}

function shuffleDeck(array &$deck) {
    shuffle($deck);
}

function dealHand(array &$deck, int $numCards = 13) {
    if (count($deck) < $numCards) {
        return false; // Not enough cards
    }
    return array_splice($deck, 0, $numCards);
}

// 十三水牌型判断和比较逻辑非常复杂，这里仅为示例框架
// 你需要为每种牌型（对子、两对、三条、顺子、同花、葫芦、铁支、同花顺、乌龙）编写判断函数
// 还需要比较牌型大小的函数，以及特殊牌型（三顺子、三同花、全大、全小、凑一色、十二皇族、一条龙、至尊清龙）

function getRankValue($rank) {
    $rankValues = array_flip(RANKS); // ['2'=>0, '3'=>1, ..., 'A'=>12]
    return $rankValues[strtoupper($rank)] ?? -1;
}

function getSuitValue($suit) {
    $suitValues = array_flip(SUITS);
    return $suitValues[strtoupper($suit)] ?? -1;
}

// 示例：判断是否为同花
function isFlush(array $hand) {
    if (count($hand) === 0) return false;
    $firstSuit = $hand[0]['suit'];
    foreach ($hand as $card) {
        if ($card['suit'] !== $firstSuit) {
            return false;
        }
    }
    return true;
}

// 示例：判断是否为顺子 (A2345算最小顺，TJQKA算最大顺)
function isStraight(array $hand) {
    if (count($hand) < 5) return false; // 顺子至少5张，但十三水里中尾道是5张，头道3张不能是顺子
    
    $ranks = [];
    foreach ($hand as $card) {
        $ranks[] = getRankValue($card['rank']);
    }
    sort($ranks);

    // 检查A2345特殊顺子
    $isA2345 = true;
    $aceValue = getRankValue('A');
    $fiveValue = getRankValue('5');
    if (in_array($aceValue, $ranks) && count($ranks) === 5) { // 确保是5张牌
        $tempRanks = $ranks;
        $aceKey = array_search($aceValue, $tempRanks);
        if ($aceKey !== false) $tempRanks[$aceKey] = -1; // A作为1处理
        sort($tempRanks);
        for ($i = 0; $i < count($tempRanks) - 1; $i++) {
            if ($tempRanks[$i+1] - $tempRanks[$i] !== 1) {
                $isA2345 = false;
                break;
            }
        }
        // 并且最大的牌是5
        if ($isA2345 && $tempRanks[count($tempRanks)-1] !== $fiveValue) $isA2345 = false;
    } else {
        $isA2345 = false;
    }
    if ($isA2345) return true;

    // 检查普通顺子
    for ($i = 0; $i < count($ranks) - 1; $i++) {
        if ($ranks[$i+1] - $ranks[$i] !== 1) {
            return false;
        }
    }
    return true;
}

// 高度简化的牌型判断，仅用于演示
function getHandTypeSimple(array $hand) {
    if (empty($hand)) return "空";
    $numCards = count($hand);

    if ($numCards == 3) { // 头道
        // 简单判断：三条 > 一对 > 乌龙
        $rankCounts = array_count_values(array_column($hand, 'rank'));
        if (in_array(3, $rankCounts)) return "三条";
        if (in_array(2, $rankCounts)) return "一对";
        return "乌龙(头)";
    } elseif ($numCards == 5) { // 中道、尾道
        $isF = isFlush($hand);
        $isS = isStraight($hand);
        if ($isF && $isS) return "同花顺";
        
        $rankCounts = array_count_values(array_column($hand, 'rank'));
        arsort($rankCounts); // 按出现次数降序
        $counts = array_values($rankCounts);

        if ($counts[0] == 4) return "铁支";
        if ($counts[0] == 3 && $counts[1] == 2) return "葫芦";
        if ($isF) return "同花";
        if ($isS) return "顺子";
        if ($counts[0] == 3) return "三条";
        if ($counts[0] == 2 && $counts[1] == 2) return "两对";
        if ($counts[0] == 2) return "一对";
        return "乌龙";
    }
    return "未知牌型";
}

// 倒水检查 (非常重要，这里是极简的，实际规则复杂)
// 返回 true 如果倒水，false 如果没倒水
function isMisArranged(array $head, array $middle, array $tail) {
    // 这是一个非常非常简化的示例，真正的十三水比牌逻辑远比这复杂
    // 你需要实现一个函数 `compareHands(hand1, hand2)` 来比较两个牌墩的牌力
    // 并且根据牌墩类型（头、中、尾）调用不同的比较逻辑
    // 简化：假设我们有一个函数 getHandStrength($hand) 返回一个数值代表牌力
    // $strengthHead = getHandStrength($head);
    // $strengthMiddle = getHandStrength($middle);
    // $strengthTail = getHandStrength($tail);
    // if ($strengthHead > $strengthMiddle || $strengthMiddle > $strengthTail) return true;

    // 临时简化：头道不能大于中道，中道不能大于尾道 (基于牌型字符串的简单比较，不准确)
    $typeOrder = ["乌龙" => 0, "一对" => 1, "两对" => 2, "三条" => 3, "顺子" => 4, "同花" => 5, "葫芦" => 6, "铁支" => 7, "同花顺" => 8];
    $typeOrderHead = ["乌龙(头)" => 0, "一对" => 1, "三条" => 2];


    $headType = getHandTypeSimple($head);
    $middleType = getHandTypeSimple($middle);
    $tailType = getHandTypeSimple($tail);
    
    $headStrength = $typeOrderHead[$headType] ?? -1;
    $middleStrength = $typeOrder[$middleType] ?? -1;
    $tailStrength = $typeOrder[$tailType] ?? -1;

    // 实际比牌时，同牌型还要比大小张
    if ($headStrength > $middleStrength) return true; // 头比中大，倒水
    if ($middleStrength > $tailStrength) return true; // 中比尾大，倒水

    return false;
}

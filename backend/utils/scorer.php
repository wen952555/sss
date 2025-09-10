<?php

// Constants for scoring
if (!defined('VALUE_ORDER')) {
    define('VALUE_ORDER', [
      '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9,
      '10' => 10, 'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
    ]);
}
if (!defined('SSS_SCORES')) {
    define('SSS_SCORES', [
      'HEAD' => ['三条' => 3],
      'MIDDLE' => ['铁支' => 8, '同花顺' => 10, '葫芦' => 2],
      'TAIL' => ['铁支' => 4, '同花顺' => 5],
      'SPECIAL' => ['一条龙' => 13, '三同花' => 4, '三顺子' => 4, '六对半' => 3],
    ]);
}

// Helper functions for scoring
function parseCard($cardStr) {
    $parts = explode('_', $cardStr);
    return ['rank' => $parts[0], 'suit' => $parts[2]];
}

function getGroupedValues($cards) {
    $counts = [];
    foreach ($cards as $card) {
        $val = VALUE_ORDER[parseCard($card)['rank']];
        $counts[$val] = ($counts[$val] ?? 0) + 1;
    }
    $groups = [];
    foreach ($counts as $val => $count) {
        if (!isset($groups[$count])) {
            $groups[$count] = [];
        }
        $groups[$count][] = (int)$val;
    }
    foreach ($groups as &$group) {
        rsort($group);
    }
    return $groups;
}

function isStraight($cards) {
    if (empty($cards)) return false;
    $unique_ranks = array_unique(array_map(function($c) { return VALUE_ORDER[parseCard($c)['rank']]; }, $cards));
    if (count($unique_ranks) !== count($cards)) return false;
    sort($unique_ranks);
    $is_a2345 = $unique_ranks === [2, 3, 4, 5, 14];
    $is_normal = ($unique_ranks[count($unique_ranks) - 1] - $unique_ranks[0] === count($cards) - 1);
    return $is_normal || $is_a2345;
}

function isFlush($cards) {
    if (empty($cards)) return false;
    $first_suit = parseCard($cards[0])['suit'];
    foreach ($cards as $card) {
        if (parseCard($card)['suit'] !== $first_suit) {
            return false;
        }
    }
    return true;
}

function getSssAreaType($cards, $area) {
    if (empty($cards)) return "高牌";
    $grouped = getGroupedValues($cards);
    $isF = isFlush($cards);
    $isS = isStraight($cards);
    if (count($cards) === 3) {
        if (isset($grouped[3])) return "三条";
        if (isset($grouped[2])) return "对子";
        return "高牌";
    }
    if ($isF && $isS) return "同花顺";
    if (isset($grouped[4])) return "铁支";
    if (isset($grouped[3]) && isset($grouped[2])) return "葫芦";
    if ($isF) return "同花";
    if ($isS) return "顺子";
    if (isset($grouped[3])) return "三条";
    if (isset($grouped[2]) && count($grouped[2]) === 2) return "两对";
    if (isset($grouped[2])) return "对子";
    return "高牌";
}

function sssAreaTypeRank($type, $area) {
    $ranks = [ "高牌" => 1, "对子" => 2, "两对" => 3, "三条" => 4, "顺子" => 5, "同花" => 6, "葫芦" => 7, "铁支" => 8, "同花顺" => 9 ];
    if ($area === 'head' && $type === '三条') return 4;
    return $ranks[$type] ?? 1;
}

function compareSssArea($a, $b, $area) {
    $typeA = getSssAreaType($a, $area);
    $typeB = getSssAreaType($b, $area);
    $rankA = sssAreaTypeRank($typeA, $area);
    $rankB = sssAreaTypeRank($typeB, $area);
    if ($rankA !== $rankB) return $rankA - $rankB;
    $valsA = array_map(function($c) { return VALUE_ORDER[parseCard($c)['rank']]; }, $a);
    $valsB = array_map(function($c) { return VALUE_ORDER[parseCard($c)['rank']]; }, $b);
    rsort($valsA);
    rsort($valsB);
    for ($i = 0; $i < count($valsA); $i++) {
        if ($valsA[$i] !== $valsB[$i]) return $valsA[$i] - $valsB[$i];
    }
    return 0;
}

function isSssFoul($hand) {
    $headRank = sssAreaTypeRank(getSssAreaType($hand['top'], 'head'), 'head');
    $midRank = sssAreaTypeRank(getSssAreaType($hand['middle'], 'middle'), 'middle');
    $tailRank = sssAreaTypeRank(getSssAreaType($hand['bottom'], 'tail'), 'tail');
    if ($headRank > $midRank || $midRank > $tailRank) return true;
    if ($headRank === $midRank && compareSssArea($hand['top'], $hand['middle'], 'head') > 0) return true;
    if ($midRank === $tailRank && compareSssArea($hand['middle'], $hand['bottom'], 'middle') > 0) return true;
    return false;
}

function getSssAreaScore($cards, $area) {
    $type = getSssAreaType($cards, $area);
    $areaUpper = strtoupper($area);
    return SSS_SCORES[$areaUpper][$type] ?? 1;
}

function calculateTotalBaseScore($p) {
    return getSssAreaScore($p['top'], 'head') + getSssAreaScore($p['middle'], 'middle') + getSssAreaScore($p['bottom'], 'tail');
}

function calculateSinglePairScore($p1_hand, $p2_hand) {
    $p1_foul = isSssFoul($p1_hand);
    $p2_foul = isSssFoul($p2_hand);
    if ($p1_foul && !$p2_foul) return -calculateTotalBaseScore($p2_hand);
    if (!$p1_foul && $p2_foul) return calculateTotalBaseScore($p1_hand);
    if ($p1_foul && $p2_foul) return 0;
    $pairScore = 0;
    foreach (['top', 'middle', 'bottom'] as $area) {
        $cmp = compareSssArea($p1_hand[$area], $p2_hand[$area], $area);
        if ($cmp > 0) $pairScore += getSssAreaScore($p1_hand[$area], $area);
        else if ($cmp < 0) $pairScore -= getSssAreaScore($p2_hand[$area], $area);
    }
    return $pairScore;
}

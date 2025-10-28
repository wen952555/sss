<?php
// backend/utils/scorer.php

const VALUE_ORDER_PHP = [
  '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9,
  '10' => 10, 'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
];

const SUIT_ORDER_PHP = ['spades' => 4, 'hearts' => 3, 'clubs' => 2, 'diamonds' => 1];

const SSS_SCORES_PHP = [
  'HEAD' => [ '三条' => 3 ],
  'MIDDLE' => [ '铁支' => 8, '同花顺' => 10, '葫芦' => 2, '五同' => 10 ],
  'TAIL' => [ '铁支' => 4, '同花顺' => 5, '五同' => 5 ],
  'SPECIAL' => [ '一条龙' => 13, '三同花' => 3, '三顺子' => 3, '六对半' => 3, '大六对' => 7, '高级三同花/三顺子' => 8 ],
];

function parseCardPhp($cardStr) {
    $parts = explode('_', $cardStr);
    return ['rank' => $parts[0], 'suit' => $parts[2]];
}

function getGroupedValuesPhp($cards) {
    global $VALUE_ORDER_PHP;
    $counts = [];
    foreach ($cards as $card) {
        $val = $VALUE_ORDER_PHP[parseCardPhp($card)['rank']];
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

function isStraightPhp($cards) {
    global $VALUE_ORDER_PHP;
    if (!$cards || count($cards) === 0) return false;
    $unique_ranks = array_unique(array_map(function($c) use ($VALUE_ORDER_PHP) { return $VALUE_ORDER_PHP[parseCardPhp($c)['rank']]; }, $cards));
    if (count($unique_ranks) !== count($cards)) return false;
    sort($unique_ranks);
    $is_a2345 = json_encode($unique_ranks) === json_encode([2, 3, 4, 5, 14]);
    $is_normal = ($unique_ranks[count($unique_ranks) - 1] - $unique_ranks[0] === count($cards) - 1);
    return $is_normal || $is_a2345;
}

function isFlushPhp($cards) {
    if (!$cards || count($cards) === 0) return false;
    $first_suit = parseCardPhp($cards[0])['suit'];
    foreach ($cards as $card) {
        if (parseCardPhp($card)['suit'] !== $first_suit) {
            return false;
        }
    }
    return true;
}

function getSssAreaTypePhp($cards, $area) {
    if (!$cards || count($cards) === 0) return "高牌";
    $grouped = getGroupedValuesPhp($cards);
    $isF = isFlushPhp($cards);
    $isS = isStraightPhp($cards);
    if (count($cards) === 3) {
        if (isset($grouped[3])) return "三条";
        if (isset($grouped[2])) return "对子";
        return "高牌";
    }
    if (isset($grouped[5])) return "五同";
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

function sssAreaTypeRankPhp($type, $area) {
    $ranks = ["高牌" => 1, "对子" => 2, "两对" => 3, "三条" => 4, "顺子" => 5, "同花" => 6, "葫芦" => 7, "铁支" => 8, "同花顺" => 9, "五同" => 10];
    if ($area === 'head' && $type === '三条') return 4;
    return $ranks[$type] ?? 1;
}

function compareSssAreaPhp($a, $b, $area) {
    $typeA = getSssAreaTypePhp($a, $area);
    $typeB = getSssAreaTypePhp($b, $area);
    $rankA = sssAreaTypeRankPhp($typeA, $area);
    $rankB = sssAreaTypeRankPhp($typeB, $area);
    if ($rankA !== $rankB) return $rankA - $rankB;

    if ($typeA === '顺子' || $typeA === '同花顺') {
        $getStraightHighCard = function($cards) {
            global $VALUE_ORDER_PHP;
            $vals = array_unique(array_map(function($c) use ($VALUE_ORDER_PHP) { return $VALUE_ORDER_PHP[parseCardPhp($c)['rank']]; }, $cards));
            sort($vals);
            $isAceLow = json_encode($vals) === json_encode([2, 3, 4, 5, 14]);
            if ($isAceLow) return 5;
            return $vals[count($vals) - 1];
        };
        $valA = $getStraightHighCard($a);
        $valB = $getStraightHighCard($b);
        if ($valA !== $valB) return $valA - $valB;
    }

    if ($typeA === '同花' || $typeA === '同花顺') {
        global $SUIT_ORDER_PHP;
        $suitA = $SUIT_ORDER_PHP[parseCardPhp($a[0])['suit']];
        $suitB = $SUIT_ORDER_PHP[parseCardPhp($b[0])['suit']];
        if ($suitA !== $suitB) return $suitA - $suitB;
    }

    $groupedA = getGroupedValuesPhp($a);
    $groupedB = getGroupedValuesPhp($b);

    $sortedKeysA = array_keys($groupedA);
    rsort($sortedKeysA);
    $sortedKeysB = array_keys($groupedB);
    rsort($sortedKeysB);

    $sortedValuesA = [];
    foreach ($sortedKeysA as $key) {
        $sortedValuesA = array_merge($sortedValuesA, $groupedA[$key]);
    }
    $sortedValuesB = [];
    foreach ($sortedKeysB as $key) {
        $sortedValuesB = array_merge($sortedValuesB, $groupedB[$key]);
    }

    for ($i = 0; $i < count($sortedValuesA); $i++) {
        if ($sortedValuesA[$i] !== $sortedValuesB[$i]) return $sortedValuesA[$i] - $sortedValuesB[$i];
    }

    return 0;
}

function isSssFoulPhp($hand) {
    $headRank = sssAreaTypeRankPhp(getSssAreaTypePhp($hand['top'], 'head'), 'head');
    $midRank = sssAreaTypeRankPhp(getSssAreaTypePhp($hand['middle'], 'middle'), 'middle');
    $tailRank = sssAreaTypeRankPhp(getSssAreaTypePhp($hand['bottom'], 'tail'), 'tail');
    if ($headRank > $midRank || $midRank > $tailRank) return true;
    if ($headRank === $midRank && compareSssAreaPhp($hand['top'], $hand['middle'], 'head') > 0) return true;
    if ($midRank === $tailRank && compareSssAreaPhp($hand['middle'], $hand['bottom'], 'middle') > 0) return true;
    return false;
}

function getSssAreaScorePhp($cards, $area) {
    global $SSS_SCORES_PHP;
    $type = getSssAreaTypePhp($cards, $area);
    $areaUpper = strtoupper($area);
    return $SSS_SCORES_PHP[$areaUpper][$type] ?? 1;
}

function getSpecialTypePhp($hand) {
    $all_cards = array_merge($hand['top'], $hand['middle'], $hand['bottom']);

    $ranks = array_map(function($card) { return parseCardPhp($card)['rank']; }, $all_cards);
    if (count(array_unique($ranks)) === 13) {
        return '一条龙';
    }

    $groupedAll = getGroupedValuesPhp($all_cards);

    if (isset($groupedAll[4])) {
        return '大六对';
    }
    if (isset($groupedAll[2]) && count($groupedAll[2]) === 6 && !isset($groupedAll[3])) {
        return '六对半';
    }

    $isHeadFlush = isFlushPhp($hand['top']);
    $isMidFlush = isFlushPhp($hand['middle']);
    $isTailFlush = isFlushPhp($hand['bottom']);

    $isHeadStraight = isStraightPhp($hand['top']);
    $isMidStraight = isStraightPhp($hand['middle']);
    $isTailStraight = isStraightPhp($hand['bottom']);

    if ($isHeadFlush && $isMidFlush && $isTailFlush) {
        if (getSssAreaTypePhp($hand['middle'], 'middle') === '同花顺' || getSssAreaTypePhp($hand['bottom'], 'tail') === '同花顺') {
            return '高级三同花/三顺子';
        }
        return '三同花';
    }

    if ($isHeadStraight && $isMidStraight && $isTailStraight) {
        if (getSssAreaTypePhp($hand['middle'], 'middle') === '同花顺' || getSssAreaTypePhp($hand['bottom'], 'tail') === '同花顺') {
            return '高级三同花/三顺子';
        }
        return '三顺子';
    }

    return null;
}

function calculateSinglePairScorePhp($p1_hand, $p2_hand) {
    global $SSS_SCORES_PHP;
    $p1_special_type = getSpecialTypePhp($p1_hand);
    $p2_special_type = getSpecialTypePhp($p2_hand);

    if ($p1_special_type && !$p2_special_type) {
        return ['total_score' => $SSS_SCORES_PHP['SPECIAL'][$p1_special_type] ?? 0, 'lane_results' => []];
    }
    if (!$p1_special_type && $p2_special_type) {
        return ['total_score' => -($SSS_SCORES_PHP['SPECIAL'][$p2_special_type] ?? 0), 'lane_results' => []];
    }
    if ($p1_special_type && $p2_special_type) {
        return ['total_score' => 0, 'lane_results' => []];
    }

    $pairScore = 0;
    $laneResults = [];
    $area_map = ['top' => 'head', 'middle' => 'middle', 'bottom' => 'tail'];
    foreach ($area_map as $hand_key => $area_name) {
        $cmp = compareSssAreaPhp($p1_hand[$hand_key], $p2_hand[$hand_key], $area_name);
        $score_change = 0;
        $result = 'draw';
        if ($cmp > 0) {
            $score_change = getSssAreaScorePhp($p1_hand[$hand_key], $area_name);
            $pairScore += $score_change;
            $result = 'win';
        } else if ($cmp < 0) {
            $score_change = -getSssAreaScorePhp($p2_hand[$hand_key], $area_name);
            $pairScore += $score_change;
            $result = 'loss';
        }
        $laneResults[$hand_key] = ['result' => $result, 'score_change' => $score_change];
    }
    return ['total_score' => $pairScore, 'lane_results' => $laneResults];
}
?>

<?php

const VALUE_ORDER = [
    '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9,
    '10' => 10, 'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
];

const SUIT_ORDER = ['spades' => 4, 'hearts' => 3, 'clubs' => 2, 'diamonds' => 1];

const SSS_SCORES = [
    'HEAD' => ['三条' => 3],
    'MIDDLE' => [
        '顺子' => 2,
        '同花' => 4,
        '葫芦' => 6,
        '铁支' => 10,
        '同花顺' => 15,
        '五同' => 20
    ],
    'TAIL' => [
        '顺子' => 1,
        '同花' => 2,
        '葫芦' => 3,
        '铁支' => 5,
        '同花顺' => 8,
        '五同' => 10
    ],
    'SPECIAL' => [
        '一条龙' => 13,
        '三同花' => 4,
        '三顺子' => 4,
        '六对半' => 4,
        '大六对' => 8,
        '高级三同花/三顺子' => 10,
    ],
];

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
    if (!$cards || count($cards) === 0) return false;
    $unique_ranks = array_unique(array_map(function($c) { return VALUE_ORDER[parseCard($c)['rank']]; }, $cards));
    if (count($unique_ranks) !== count($cards)) return false;
    sort($unique_ranks);
    $is_a2345 = json_encode($unique_ranks) === json_encode([2, 3, 4, 5, 14]);
    $is_normal = ($unique_ranks[count($unique_ranks) - 1] - $unique_ranks[0] === count($cards) - 1);
    return $is_normal || $is_a2345;
}

function isFlush($cards) {
    if (!$cards || count($cards) === 0) return false;
    $first_suit = parseCard($cards[0])['suit'];
    foreach ($cards as $card) {
        if (parseCard($card)['suit'] !== $first_suit) {
            return false;
        }
    }
    return true;
}

function getSssAreaType($cards, $area) {
    if (!$cards || count($cards) === 0) return "高牌";
    $grouped = getGroupedValues($cards);
    $isF = isFlush($cards);
    $isS = isStraight($cards);

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

function sssAreaTypeRank($type, $area) {
    $ranks = ["高牌" => 1, "对子" => 2, "两对" => 3, "三条" => 4, "顺子" => 5, "同花" => 6, "葫芦" => 7, "铁支" => 8, "同花顺" => 9, "五同" => 10];
    if ($area === 'head' && $type === '三条') return 4;
    return $ranks[$type] ?? 1;
}

function compareSssArea($a, $b, $area) {
    $typeA = getSssAreaType($a, $area);
    $typeB = getSssAreaType($b, $area);
    $rankA = sssAreaTypeRank($typeA, $area);
    $rankB = sssAreaTypeRank($typeB, $area);
    if ($rankA !== $rankB) return $rankA - $rankB;

    if ($typeA === '顺子' || $typeA === '同花顺') {
        $getStraightHighCard = function ($cards) {
            $vals = array_unique(array_map(fn($c) => VALUE_ORDER[parseCard($c)['rank']], $cards));
            sort($vals);
            $isAceLow = json_encode($vals) === json_encode([2, 3, 4, 5, 14]);
            if ($isAceLow) return 5; // A-2-3-4-5, highest is 5
            return $vals[count($vals)-1];
        };
        $valA = $getStraightHighCard($a);
        $valB = $getStraightHighCard($b);
        if ($valA !== $valB) return $valA - $valB;
    }

    // For hands of the same type, compare kickers by building a sorted list of card values
    $groupedA = getGroupedValues($a);
    $groupedB = getGroupedValues($b);

    $valsA = [];
    if (isset($groupedA[4])) $valsA = array_merge($valsA, $groupedA[4]);
    if (isset($groupedA[3])) $valsA = array_merge($valsA, $groupedA[3]);
    if (isset($groupedA[2])) $valsA = array_merge($valsA, $groupedA[2]);
    if (isset($groupedA[1])) $valsA = array_merge($valsA, $groupedA[1]);

    $valsB = [];
    if (isset($groupedB[4])) $valsB = array_merge($valsB, $groupedB[4]);
    if (isset($groupedB[3])) $valsB = array_merge($valsB, $groupedB[3]);
    if (isset($groupedB[2])) $valsB = array_merge($valsB, $groupedB[2]);
    if (isset($groupedB[1])) $valsB = array_merge($valsB, $groupedB[1]);

    for ($i = 0; $i < count($valsA); $i++) {
        if ($valsA[$i] !== $valsB[$i]) return $valsA[$i] - $valsB[$i];
    }

    // If all kickers are the same, compare suits for flushes
    if ($typeA === '同花' || $typeA === '同花顺') {
        $suitA = SUIT_ORDER[parseCard($a[0])['suit']];
        $suitB = SUIT_ORDER[parseCard($b[0])['suit']];
        if ($suitA !== $suitB) return $suitA - $suitB;
    }

    return 0;
}

function isSssFoul($hand) {
    if (empty($hand['top']) || empty($hand['middle']) || empty($hand['bottom'])) return true;

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

function getSpecialType($hand) {
    $all_cards = array_merge($hand['top'], $hand['middle'], $hand['bottom']);
    if (count($all_cards) !== 13) return null;

    $ranks = array_map(fn($c) => parseCard($c)['rank'], $all_cards);
    if (count(array_unique($ranks)) === 13) return '一条龙';

    $groupedAll = getGroupedValues($all_cards);
    if (isset($groupedAll[4])) return '大六对';
    if (isset($groupedAll[2]) && count($groupedAll[2]) === 6 && !isset($groupedAll[3])) return '六对半';

    $isHeadFlush = isFlush($hand['top']);
    $isMidFlush = isFlush($hand['middle']);
    $isTailFlush = isFlush($hand['bottom']);

    $isHeadStraight = isStraight($hand['top']);
    $isMidStraight = isStraight($hand['middle']);
    $isTailStraight = isStraight($hand['bottom']);

    if ($isHeadFlush && $isMidFlush && $isTailFlush) {
        if (getSssAreaType($hand['middle'], 'middle') === '同花顺' || getSssAreaType($hand['bottom'], 'tail') === '同花顺') {
            return '高级三同花/三顺子';
        }
        return '三同花';
    }

    if ($isHeadStraight && $isMidStraight && $isTailStraight) {
        if (getSssAreaType($hand['middle'], 'middle') === '同花顺' || getSssAreaType($hand['bottom'], 'tail') === '同花顺') {
            return '高级三同花/三顺子';
        }
        return '三顺子';
    }

    return null;
}

function calculateSinglePairScore($p1_hand, $p2_hand) {
    if (isSssFoul($p1_hand) && isSssFoul($p2_hand)) return 0;

    $p1_base_score = calculateTotalBaseScore($p1_hand);
    $p2_base_score = calculateTotalBaseScore($p2_hand);

    if (isSssFoul($p1_hand)) return -$p2_base_score;
    if (isSssFoul($p2_hand)) return $p1_base_score;

    $p1_special_type = getSpecialType($p1_hand);
    $p2_special_type = getSpecialType($p2_hand);

    if ($p1_special_type && !$p2_special_type) return SSS_SCORES['SPECIAL'][$p1_special_type] ?? 0;
    if (!$p1_special_type && $p2_special_type) return -(SSS_SCORES['SPECIAL'][$p2_special_type] ?? 0);
    if ($p1_special_type && $p2_special_type) {
        // Here you might want to compare special hands if there's a ranking among them
        return 0;
    }

    $pairScore = 0;
    $area_map = ['top' => 'head', 'middle' => 'middle', 'bottom' => 'tail'];
    $p1_wins = 0;

    foreach ($area_map as $hand_key => $area_name) {
        $cmp = compareSssArea($p1_hand[$hand_key], $p2_hand[$hand_key], $area_name);
        if ($cmp > 0) {
            $pairScore += getSssAreaScore($p1_hand[$hand_key], $area_name);
            $p1_wins++;
        } elseif ($cmp < 0) {
            $pairScore -= getSssAreaScore($p2_hand[$hand_key], $area_name);
        }
    }

    // "打枪" (Shooting) bonus
    if ($p1_wins === 3) $pairScore *= 2;
    if ($p1_wins === 0 && $pairScore !== 0) $pairScore *= 2;


    return $pairScore;
}

function calculateTotalBaseScore($p_hand) {
    $p_special_type = getSpecialType($p_hand);
    if ($p_special_type) {
        return SSS_SCORES['SPECIAL'][$p_special_type] ?? 0;
    }
    return getSssAreaScore($p_hand['top'], 'head') + getSssAreaScore($p_hand['middle'], 'middle') + getSssAreaScore($p_hand['bottom'], 'tail');
}

?>

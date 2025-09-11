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
      'SPECIAL' => ['一条龙' => 13, '三同花' => 4, '三顺子' => 4, '六对半' => 3, '大六对' => 7, '高级三同花/三顺子' => 8],
    ]);
}
if (!defined('SUIT_ORDER')) {
    define('SUIT_ORDER', ['spades' => 4, 'hearts' => 3, 'clubs' => 2, 'diamonds' => 1]);
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

    // If ranks are the same, proceed with detailed comparison

    // Special handling for straights (and straight flushes, which are also straights)
    if ($typeA === '顺子' || $typeA === '同花顺') {
        $getStraightHighCard = function($cards) {
            $vals = array_unique(array_map(function($c) { return VALUE_ORDER[parseCard($c)['rank']]; }, $cards));
            sort($vals);
            // A-2-3-4-5 is a 5-high straight
            if ($vals === [2, 3, 4, 5, 14]) {
                return 5;
            }
            return $vals[count($vals) - 1];
        };
        $valA = $getStraightHighCard($a);
        $valB = getStraightHighCard($b);
        if ($valA !== $valB) return $valA - $valB;
        // If high card is the same, it's a draw, but for flushes we compare suit
    }

    // Special handling for flushes (and straight flushes)
    if ($typeA === '同花' || $typeA === '同花顺') {
        $suitA = SUIT_ORDER[parseCard($a[0])['suit']];
        $suitB = SUIT_ORDER[parseCard($b[0])['suit']];
        if ($suitA !== $suitB) return $suitA - $suitB;
    }

    // General kicker comparison for all other types (including flushes with same suit)
    $groupedA = getGroupedValues($a);
    $groupedB = getGroupedValues($b);

    krsort($groupedA, SORT_NUMERIC);
    krsort($groupedB, SORT_NUMERIC);

    $sortedValuesA = [];
    foreach ($groupedA as $values) {
        $sortedValuesA = array_merge($sortedValuesA, $values);
    }
    $sortedValuesB = [];
    foreach ($groupedB as $values) {
        $sortedValuesB = array_merge($sortedValuesB, $values);
    }

    for ($i = 0; $i < count($sortedValuesA); $i++) {
        if ($sortedValuesA[$i] !== $sortedValuesB[$i]) return $sortedValuesA[$i] - $sortedValuesB[$i];
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

function calculateTotalBaseScore($p_hand, $p_special_type = null) {
    if ($p_special_type) {
        return SSS_SCORES['SPECIAL'][$p_special_type] ?? 0;
    }
    return getSssAreaScore($p_hand['top'], 'head') + getSssAreaScore($p_hand['middle'], 'middle') + getSssAreaScore($p_hand['bottom'], 'tail');
}

function calculateSinglePairScore($p1_hand, $p2_hand) {
    $p1_foul = isSssFoul($p1_hand);
    $p1_special_type = $p1_foul ? null : getSpecialType($p1_hand);

    $p2_foul = isSssFoul($p2_hand);
    $p2_special_type = $p2_foul ? null : getSpecialType($p2_hand);

    if ($p1_foul && !$p2_foul) {
        return -calculateTotalBaseScore($p2_hand, $p2_special_type);
    }
    if (!$p1_foul && $p2_foul) {
        return calculateTotalBaseScore($p1_hand, $p1_special_type);
    }
    if ($p1_foul && $p2_foul) {
        return 0;
    }

    // --- Neither player is foul, now compare hands ---

    if ($p1_special_type && !$p2_special_type) {
        return SSS_SCORES['SPECIAL'][$p1_special_type] ?? 0;
    }
    if (!$p1_special_type && $p2_special_type) {
        return -(SSS_SCORES['SPECIAL'][$p2_special_type] ?? 0);
    }
    if ($p1_special_type && $p2_special_type) {
        // TODO: Compare special hands if rules are defined. For now, it's a draw.
        return 0;
    }

    // --- No special hands, proceed with normal lane-by-lane comparison ---
    $pairScore = 0;
    $area_map = ['top' => 'head', 'middle' => 'middle', 'bottom' => 'tail'];
    foreach ($area_map as $hand_key => $area_name) {
        $cmp = compareSssArea($p1_hand[$hand_key], $p2_hand[$hand_key], $area_name);
        if ($cmp > 0) {
            $pairScore += getSssAreaScore($p1_hand[$hand_key], $area_name);
        } else if ($cmp < 0) {
            $pairScore -= getSssAreaScore($p2_hand[$hand_key], $area_name);
        }
    }
    return $pairScore;
}

function getSpecialType($hand) {
    $all_cards = array_merge($hand['top'], $hand['middle'], $hand['bottom']);

    // Check for '一条龙' (Dragon)
    $ranks = [];
    foreach ($all_cards as $card) {
        $ranks[] = parseCard($card)['rank'];
    }
    if (count(array_unique($ranks)) === 13) {
        return '一条龙';
    }

    $groupedAll = getGroupedValues($all_cards);

    // Check for '大六对' (Hand with a Four of a Kind, as named in JS)
    if (isset($groupedAll[4])) {
        return '大六对';
    }
    // Check for '六对半' (Six and a half pairs)
    if (isset($groupedAll[2]) && count($groupedAll[2]) === 6 && !isset($groupedAll[3])) {
        return '六对半';
    }

    // Check for '三同花' (Three Flushes) and '三顺子' (Three Straights)
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

    if ($isHeadStraight && isMidStraight && isTailStraight) {
        if (getSssAreaType($hand['middle'], 'middle') === '同花顺' || getSssAreaType($hand['bottom'], 'tail') === '同花顺') {
            return '高级三同花/三顺子';
        }
        return '三顺子';
    }

    return null;
}

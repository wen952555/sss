<?php
// backend/utils/sssScorer.php

const SSS_VALUE_ORDER = [
    '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10,
    'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
];
const SSS_SUIT_ORDER = ['diamonds' => 1, 'clubs' => 2, 'hearts' => 3, 'spades' => 4];

const SSS_SCORES = [
    'HEAD' => ['三条' => 3],
    'MIDDLE' => ['铁支' => 8, '同花顺' => 10, '葫芦' => 2],
    'TAIL' => ['铁支' => 4, '同花顺' => 5],
    'SPECIAL' => ['一条龙' => 13, '三同花' => 4, '三顺子' => 4, '六对半' => 3],
];

function sss_get_grouped_values($cards) {
    $counts = [];
    foreach ($cards as $card) {
        $val = SSS_VALUE_ORDER[explode('_', $card)[0]];
        $counts[$val] = ($counts[$val] ?? 0) + 1;
    }
    $groups = [];
    foreach ($counts as $val => $count) {
        if (!isset($groups[$count])) $groups[$count] = [];
        $groups[$count][] = (int)$val;
    }
    foreach ($groups as &$group) {
        rsort($group);
    }
    return $groups;
}

function sss_is_straight($cards) {
    if (!$cards || count($cards) == 0) return false;
    $vals = array_unique(array_map(function($c) { return SSS_VALUE_ORDER[explode('_', $c)[0]]; }, $cards));
    sort($vals);
    if (count($vals) !== count($cards)) return false;
    $isA2345 = json_encode($vals) === json_encode([2,3,4,5,14]);
    return ($vals[count($vals) - 1] - $vals[0] === count($cards) - 1) || $isA2345;
}

function sss_is_flush($cards) {
    if (!$cards || count($cards) == 0) return false;
    $firstSuit = explode('_', $cards[0])[2];
    foreach ($cards as $card) {
        if (explode('_', $card)[2] !== $firstSuit) return false;
    }
    return true;
}

function sss_get_area_type($cards, $area) {
    if (!$cards || count($cards) === 0) return "高牌";
    $grouped = sss_get_grouped_values($cards);
    $isF = sss_is_flush($cards);
    $isS = sss_is_straight($cards);

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

function sss_area_type_rank($type, $area) {
    if ($area === 'head') {
        if ($type === "三条") return 4;
        if ($type === "对子") return 2;
        return 1;
    }
    if ($type === "同花顺") return 9;
    if ($type === "铁支") return 8;
    if ($type === "葫芦") return 7;
    if ($type === "同花") return 6;
    if ($type === "顺子") return 5;
    if ($type === "三条") return 4;
    if ($type === "两对") return 3;
    if ($type === "对子") return 2;
    return 1;
}

function sss_compare_area($a, $b, $area) {
    $typeA = sss_get_area_type($a, $area);
    $typeB = sss_get_area_type($b, $area);
    $rankA = sss_area_type_rank($typeA, $area);
    $rankB = sss_area_type_rank($typeB, $area);
    if ($rankA !== $rankB) return $rankA - $rankB;

    if (($typeA === '同花顺' || $typeA === '同花')) {
        $suitA = SSS_SUIT_ORDER[explode('_', $a[0])[2]];
        $suitB = SSS_SUIT_ORDER[explode('_', $b[0])[2]];
        if ($suitA !== $suitB) return $suitA - $suitB;
    }

    $groupedA = sss_get_grouped_values($a);
    $groupedB = sss_get_grouped_values($b);

    $valsA = [];
    $countsA = ksort($groupedA, SORT_DESC);
    foreach($groupedA as $count => $values) {
        foreach($values as $v) { $valsA[] = $v; }
    }

    $valsB = [];
    ksort($groupedB, SORT_DESC);
    foreach($groupedB as $count => $values) {
        foreach($values as $v) { $valsB[] = $v; }
    }

    for ($i = 0; $i < count($valsA); $i++) {
        if ($valsA[$i] !== $valsB[$i]) return $valsA[$i] - $valsB[$i];
    }

    return 0;
}

function sss_is_foul($head, $middle, $tail) {
    if (sss_compare_area($middle, $tail, 'middle') > 0) return true;
    if (sss_compare_area($head, $middle, 'head') > 0) return true;
    return false;
}

function sss_get_special_type($p) {
    $all = array_merge($p['head'], $p['middle'], $p['tail']);
    $uniqVals = count(array_unique(array_map(function($c){ return explode('_', $c)[0]; }, $all)));
    if ($uniqVals === 13) return '一条龙';

    $groupedAll = sss_get_grouped_values($all);
    if (isset($groupedAll[2]) && count($groupedAll[2]) === 6 && !isset($groupedAll[3])) return '六对半';

    if (sss_is_flush($p['head']) && sss_is_flush($p['middle']) && sss_is_flush($p['tail'])) return '三同花';
    if (sss_is_straight($p['head']) && sss_is_straight($p['middle']) && sss_is_straight($p['tail'])) return '三顺子';

    return null;
}

function sss_get_area_score($cards, $area) {
    $type = sss_get_area_type($cards, $area);
    return SSS_SCORES[strtoupper($area)][$type] ?? 1;
}

function sss_calculate_single_pair_score($p1, $p2) {
    $p1Info = ['head'=>$p1['head'], 'middle'=>$p1['middle'], 'tail'=>$p1['tail']];
    $p1Info['isFoul'] = sss_is_foul($p1['head'], $p1['middle'], $p1['tail']);
    $p1Info['specialType'] = $p1Info['isFoul'] ? null : sss_get_special_type($p1Info);

    $p2Info = ['head'=>$p2['head'], 'middle'=>$p2['middle'], 'tail'=>$p2['tail']];
    $p2Info['isFoul'] = sss_is_foul($p2['head'], $p2['middle'], $p2['tail']);
    $p2Info['specialType'] = $p2Info['isFoul'] ? null : sss_get_special_type($p2Info);

    $pairScore = 0;
    if ($p1Info['isFoul'] && !$p2Info['isFoul']) {
        $score = sss_get_area_score($p2Info['head'], 'head') + sss_get_area_score($p2Info['middle'], 'middle') + sss_get_area_score($p2Info['tail'], 'tail');
        return -$score;
    }
    if (!$p1Info['isFoul'] && $p2Info['isFoul']) {
         $score = sss_get_area_score($p1Info['head'], 'head') + sss_get_area_score($p1Info['middle'], 'middle') + sss_get_area_score($p1Info['tail'], 'tail');
        return $score;
    }
    if ($p1Info['isFoul'] && $p2Info['isFoul']) return 0;

    if ($p1Info['specialType']) return SSS_SCORES['SPECIAL'][$p1Info['specialType']] ?? 0;
    if ($p2Info['specialType']) return -(SSS_SCORES['SPECIAL'][$p2Info['specialType']] ?? 0);

    foreach (['head', 'middle', 'tail'] as $area) {
        $cmp = sss_compare_area($p1Info[$area], $p2Info[$area], $area);
        if ($cmp > 0) $pairScore += sss_get_area_score($p1Info[$area], $area);
        else if ($cmp < 0) $pairScore -= sss_get_area_score($p2Info[$area], $area);
    }
    return $pairScore;
}

function sss_calculate_all_scores($players) {
    $n = count($players);
    if ($n < 2) return array_fill(0, $n, 0);
    $finalScores = array_fill(0, $n, 0);
    for ($i = 0; $i < $n; $i++) {
        for ($j = $i + 1; $j < $n; $j++) {
            $pairScore = sss_calculate_single_pair_score($players[$i], $players[$j]);
            $finalScores[$i] += $pairScore;
            $finalScores[$j] -= $pairScore;
        }
    }
    return $finalScores;
}
?>

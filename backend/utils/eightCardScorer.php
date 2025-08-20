<?php
// backend/utils/eightCardScorer.php

const EIGHT_CARD_VALUE_ORDER = [
    '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8, '9' => 9, '10' => 10,
    'jack' => 11, 'queen' => 12, 'king' => 13, 'ace' => 14
];
const EIGHT_CARD_SUIT_ORDER = ['diamonds' => 1, 'clubs' => 2, 'hearts' => 3, 'spades' => 4];
const EIGHT_CARD_HAND_RANK = ['同花顺' => 5, '三条' => 4, '顺子' => 3, '对子' => 2, '高牌' => 1];

function eight_card_parse_card_string($cardStr) {
    list($rank, , $suit) = explode('_', $cardStr);
    return ['rank' => $rank, 'suit' => $suit, 'value' => EIGHT_CARD_VALUE_ORDER[$rank], 'suitValue' => EIGHT_CARD_SUIT_ORDER[$suit]];
}

function eight_card_get_hand_type($cards) {
    if (!$cards || count($cards) === 0) return '高牌';
    $n = count($cards);
    $ranks = array_map(function($c) { return EIGHT_CARD_VALUE_ORDER[$c['rank']]; }, $cards);
    sort($ranks);
    $suits = array_map(function($c) { return $c['suit']; }, $cards);

    $isFlush = count(array_unique($suits)) === 1;
    $isStraight = (count(array_unique($ranks)) === $n) && ($ranks[$n - 1] - $ranks[0] === $n - 1 || json_encode($ranks) === json_encode([2, 3, 14]));

    if ($isStraight && $isFlush) return '同花顺';

    $rankCounts = array_count_values($ranks);
    $counts = array_values($rankCounts);

    if (in_array(3, $counts)) return '三条';
    if ($isStraight) return '顺子';
    if (in_array(2, $counts)) return '对子';

    return '高牌';
}

function eight_card_get_straight_value($cards) {
    $ranks = array_map(function($c) { return $c['value']; }, $cards);
    sort($ranks);
    if (in_array(14, $ranks) && in_array(13, $ranks)) return 14;
    if (in_array(14, $ranks) && in_array(2, $ranks)) return 13.5;
    return $ranks[count($ranks) - 1];
}

function eight_card_compare_same_type_hands($cardsA, $cardsB) {
    usort($cardsA, function($a, $b) { return $b['value'] - $a['value'] ?: $b['suitValue'] - $a['suitValue']; });
    usort($cardsB, function($a, $b) { return $b['value'] - $a['value'] ?: $b['suitValue'] - $a['suitValue']; });

    for ($i = 0; $i < count($cardsA); $i++) {
        if ($cardsA[$i]['value'] !== $cardsB[$i]['value']) return $cardsA[$i]['value'] - $cardsB[$i]['value'];
    }
    for ($i = 0; $i < count($cardsA); $i++) {
        if ($cardsA[$i]['suitValue'] !== $cardsB[$i]['suitValue']) return $cardsA[$i]['suitValue'] - $cardsB[$i]['suitValue'];
    }
    return 0;
}

function eight_card_compare_lanes($laneA, $laneB) {
    $typeA = eight_card_get_hand_type($laneA);
    $typeB = eight_card_get_hand_type($laneB);

    if (EIGHT_CARD_HAND_RANK[$typeA] !== EIGHT_CARD_HAND_RANK[$typeB]) {
        return EIGHT_CARD_HAND_RANK[$typeA] - EIGHT_CARD_HAND_RANK[$typeB];
    }

    $cardsA = array_map(function($c) { return ['rank'=>$c['rank'], 'suit'=>$c['suit'], 'value' => EIGHT_CARD_VALUE_ORDER[$c['rank']], 'suitValue' => EIGHT_CARD_SUIT_ORDER[$c['suit']]]; }, $laneA);
    $cardsB = array_map(function($c) { return ['rank'=>$c['rank'], 'suit'=>$c['suit'], 'value' => EIGHT_CARD_VALUE_ORDER[$c['rank']], 'suitValue' => EIGHT_CARD_SUIT_ORDER[$c['suit']]]; }, $laneB);

    if ($typeA === '同花顺') {
        $suitA = $cardsA[0]['suitValue'];
        $suitB = $cardsB[0]['suitValue'];
        if ($suitA !== $suitB) return $suitA - $suitB;
    }

    if ($typeA === '同花顺' || $typeA === '顺子') {
        $straightValueA = eight_card_get_straight_value($cardsA);
        $straightValueB = eight_card_get_straight_value($cardsB);
        if ($straightValueA !== $straightValueB) return $straightValueA - $straightValueB;
    }

    return eight_card_compare_same_type_hands($cardsA, $cardsB);
}

function eight_card_is_foul($head, $middle, $tail) {
    if (eight_card_compare_lanes($middle, $tail) > 0) return true;
    if (eight_card_compare_lanes($head, $middle) > 0) return true;
    return false;
}

function eight_card_get_lane_score($cards, $laneName) {
    $type = eight_card_get_hand_type($cards);
    switch ($laneName) {
        case 'head':
            if ($type === '对子') return EIGHT_CARD_VALUE_ORDER[$cards[0]['rank']];
            break;
        case 'middle':
            if ($type === '同花顺') return 10;
            if ($type === '三条') return 6;
            break;
        case 'tail':
            if ($type === '同花顺') return 5;
            if ($type === '三条') return 3;
            break;
    }
    return 1;
}

function eight_card_calculate_single_pair_score($p1, $p2) {
    $p1Info = ['head'=>$p1['head'], 'middle'=>$p1['middle'], 'tail'=>$p1['tail']];
    $p1Info['isFoul'] = eight_card_is_foul($p1['head'], $p1['middle'], $p1['tail']);

    $p2Info = ['head'=>$p2['head'], 'middle'=>$p2['middle'], 'tail'=>$p2['tail']];
    $p2Info['isFoul'] = eight_card_is_foul($p2['head'], $p2['middle'], $p2['tail']);

    $pairScore = 0;
    if ($p1Info['isFoul'] && !$p2Info['isFoul']) $pairScore = -3;
    else if (!$p1Info['isFoul'] && $p2Info['isFoul']) $pairScore = 3;
    else if ($p1Info['isFoul'] && $p2Info['isFoul']) $pairScore = 0;
    else {
        $headComparison = eight_card_compare_lanes($p1Info['head'], $p2Info['head']);
        if ($headComparison > 0) $pairScore += eight_card_get_lane_score($p1Info['head'], 'head');
        else if ($headComparison < 0) $pairScore -= eight_card_get_lane_score($p2Info['head'], 'head');

        $middleComparison = eight_card_compare_lanes($p1Info['middle'], $p2Info['middle']);
        if ($middleComparison > 0) $pairScore += eight_card_get_lane_score($p1Info['middle'], 'middle');
        else if ($middleComparison < 0) $pairScore -= eight_card_get_lane_score($p2Info['middle'], 'middle');

        $tailComparison = eight_card_compare_lanes($p1Info['tail'], $p2Info['tail']);
        if ($tailComparison > 0) $pairScore += eight_card_get_lane_score($p1Info['tail'], 'tail');
        else if ($tailComparison < 0) $pairScore -= eight_card_get_lane_score($p2Info['tail'], 'tail');
    }
    return $pairScore;
}

function eight_card_calculate_all_scores($players) {
    $n = count($players);
    if ($n < 2) return array_fill(0, $n, 0);
    $finalScores = array_fill(0, $n, 0);
    for ($i = 0; $i < $n; $i++) {
        for ($j = $i + 1; $j < $n; $j++) {
            $pairScore = eight_card_calculate_single_pair_score($players[$i], $players[$j]);
            $finalScores[$i] += $pairScore;
            $finalScores[$j] -= $pairScore;
        }
    }
    return $finalScores;
}
?>

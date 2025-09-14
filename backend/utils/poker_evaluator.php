<?php
require_once __DIR__ . '/scorer.php'; // For VALUE_ORDER

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

function sortCards($cards) {
    if (!$cards) return [];
    usort($cards, function ($a, $b) {
        $rankComparison = VALUE_ORDER[$a['rank']] - VALUE_ORDER[$b['rank']];
        if ($rankComparison !== 0) {
            return $rankComparison;
        }
        $suitOrder = ['diamonds' => 1, 'clubs' => 2, 'hearts' => 3, 'spades' => 4];
        return $suitOrder[$a['suit']] - $suitOrder[$b['suit']];
    });
    return $cards;
}

function combinations($array, $size) {
    if ($size === 0) return [[]];
    if (!$array || count($array) < $size) return [];
    $first = $array[0];
    $rest = array_slice($array, 1);
    $combsWithFirst = array_map(function ($comb) use ($first) {
        return array_merge([$first], $comb);
    }, combinations($rest, $size - 1));
    $combsWithoutFirst = combinations($rest, $size);
    return array_merge($combsWithFirst, $combsWithoutFirst);
}

function evaluateHand($cards) {
    if (!$cards || count($cards) === 0) {
        return array_merge(HAND_TYPES['HIGH_CARD'], ['values' => [0]]);
    }

    $ranks = array_map(fn($c) => VALUE_ORDER[$c['rank']], $cards);
    rsort($ranks);
    $suits = array_map(fn($c) => $c['suit'], $cards);

    $isFlush = count(array_unique($suits)) === 1;

    $rankSet = array_unique($ranks);
    $isStraight = count($rankSet) === count($cards) && ($ranks[0] - $ranks[count($ranks) - 1] === count($cards) - 1);
    $isAceLowStraight = json_encode($ranks) === json_encode([14, 5, 4, 3, 2]);

    if ($isStraight && $isFlush) {
        return array_merge(HAND_TYPES['STRAIGHT_FLUSH'], ['values' => $ranks]);
    }
    if ($isAceLowStraight && $isFlush) {
        return array_merge(HAND_TYPES['STRAIGHT_FLUSH'], ['values' => [5, 4, 3, 2, 1]]);
    }

    $rankCounts = array_count_values($ranks);
    arsort($rankCounts);

    $counts = array_values($rankCounts);
    $primaryRanks = array_keys($rankCounts);

    if ($counts[0] === 4) {
        return array_merge(HAND_TYPES['FOUR_OF_A_KIND'], ['values' => $primaryRanks]);
    }

    if ($counts[0] === 3 && isset($counts[1]) && $counts[1] === 2) {
        return array_merge(HAND_TYPES['FULL_HOUSE'], ['values' => $primaryRanks]);
    }

    if ($isFlush) {
        return array_merge(HAND_TYPES['FLUSH'], ['values' => $ranks]);
    }

    if ($isStraight) {
        return array_merge(HAND_TYPES['STRAIGHT'], ['values' => $ranks]);
    }
    if ($isAceLowStraight) {
        return array_merge(HAND_TYPES['STRAIGHT'], ['values' => [5, 4, 3, 2, 1]]);
    }

    if ($counts[0] === 3) {
        return array_merge(HAND_TYPES['THREE_OF_A_KIND'], ['values' => $primaryRanks]);
    }

    if ($counts[0] === 2 && isset($counts[1]) && $counts[1] === 2) {
        return array_merge(HAND_TYPES['TWO_PAIR'], ['values' => $primaryRanks]);
    }

    if ($counts[0] === 2) {
        return array_merge(HAND_TYPES['PAIR'], ['values' => $primaryRanks]);
    }

    return array_merge(HAND_TYPES['HIGH_CARD'], ['values' => $ranks]);
}

function compareHands($handA, $handB) {
    $rankDifference = $handA['rank'] - $handB['rank'];
    if ($rankDifference !== 0) {
        return $rankDifference;
    }

    for ($i = 0; $i < count($handA['values']); $i++) {
        $valueDifference = $handA['values'][$i] - $handB['values'][$i];
        if ($valueDifference !== 0) {
            return $valueDifference;
        }
    }

    return 0;
}
?>

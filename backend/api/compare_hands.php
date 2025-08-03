<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- PHP版牌型评估器 ---

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
    $isAceLowStraight = $ranks === [14, 5, 4, 3, 2];

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
    $rankDifference = $handA['rank'] - $handB['rank'];
    if ($rankDifference !== 0) return $rankDifference;
    for ($i = 0; $i < count($handA['values']); $i++) {
        $valueDifference = $handA['values'][$i] - $handB['values'][$i];
        if ($valueDifference !== 0) return $valueDifference;
    }
    return 0;
}

// --- 主逻辑 ---

// 1. 获取玩家提交的牌
$playerData = json_decode(file_get_contents('php://input'), true);
if (!$playerData || !isset($playerData['top']) || !isset($playerData['middle']) || !isset($playerData['bottom'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的请求数据']);
    exit;
}
$playerTop = $playerData['top'];
$playerMiddle = $playerData['middle'];
$playerBottom = $playerData['bottom'];

// 2. 生成一副完整的牌，并移除玩家已有的牌，剩下的给AI
$ranksDeck = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
$suitsDeck = ['spades', 'hearts', 'clubs', 'diamonds'];
$fullDeck = [];
foreach ($suitsDeck as $suit) {
    foreach ($ranksDeck as $rank) {
        $fullDeck[] = ['rank' => $rank, 'suit' => $suit];
    }
}
$playerFullHand = array_merge($playerTop, $playerMiddle, $playerBottom);
$aiDeck = array_udiff($fullDeck, $playerFullHand, function($a, $b) {
    return ($a['rank'] === $b['rank'] && $a['suit'] === $b['suit']) ? 0 : -1;
});
shuffle($aiDeck);
$aiHand = array_slice($aiDeck, 0, 13);


// 3. AI 自动理牌（简单策略）
usort($aiHand, function($a, $b) {
    return RANK_VALUES[$b['rank']] - RANK_VALUES[$a['rank']];
});
$aiBottom = array_slice($aiHand, 0, 5);
$aiMiddle = array_slice($aiHand, 5, 5);
$aiTop = array_slice($aiHand, 10, 3);

// 4. 评估双方的牌
$playerEval = [
    'top' => evaluateHand($playerTop),
    'middle' => evaluateHand($playerMiddle),
    'bottom' => evaluateHand($playerBottom),
];
$aiEval = [
    'top' => evaluateHand($aiTop),
    'middle' => evaluateHand($aiMiddle),
    'bottom' => evaluateHand($aiBottom),
];

// 5. 逐墩比较并计分
$score = 0;
$results = [];
$lanePoints = ['top' => 1, 'middle' => 1, 'bottom' => 1]; // 每墩基础分

foreach (['top', 'middle', 'bottom'] as $lane) {
    $comparison = compareHands($playerEval[$lane], $aiEval[$lane]);
    if ($comparison > 0) {
        $results[$lane] = 'win';
        $score += $lanePoints[$lane];
    } elseif ($comparison < 0) {
        $results[$lane] = 'loss';
        $score -= $lanePoints[$lane];
    } else {
        $results[$lane] = 'tie';
    }
}

// 6. 返回完整结果
echo json_encode([
    'success' => true,
    'playerHand' => [
        'top' => $playerTop, 'middle' => $playerMiddle, 'bottom' => $playerBottom
    ],
    'aiHand' => [
        'top' => $aiTop, 'middle' => $aiMiddle, 'bottom' => $aiBottom
    ],
    'playerEval' => $playerEval,
    'aiEval' => $aiEval,
    'results' => $results,
    'score' => $score
]);
?>

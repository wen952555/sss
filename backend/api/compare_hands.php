<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- 引入可复用的评估器 ---
require_once('../utils/poker_evaluator.php');


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

function card_to_string($card) {
    return "{$card['rank']}_of_{$card['suit']}";
}
$playerHandLookup = array_flip(array_map('card_to_string', $playerFullHand));
$aiDeck = array_filter($fullDeck, function($card) use ($playerHandLookup) {
    return !isset($playerHandLookup[card_to_string($card)]);
});
shuffle($aiDeck);
$aiHand = array_slice(array_values($aiDeck), 0, 13);


// 3. AI 自动理牌（简单策略，复用我们已有的函数）
usort($aiHand, function($a, $b) {
    return evaluate_card_value($b) - evaluate_card_value($a);
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
$lanePoints = ['top' => 1, 'middle' => 1, 'bottom' => 1];

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
    'playerHand' => ['top' => $playerTop, 'middle' => $playerMiddle, 'bottom' => $playerBottom],
    'aiHand' => ['top' => $aiTop, 'middle' => $aiMiddle, 'bottom' => $aiBottom],
    'playerEval' => $playerEval,
    'aiEval' => $aiEval,
    'results' => $results,
    'score' => $score
]);
?>

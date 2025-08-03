<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 引入牌力评估函数，因为智能理牌需要它
require_once('../utils/poker_evaluator.php');

// --- 接收前端发来的手牌 ---
$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['hand']) || !is_array($data['hand'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '无效的手牌数据']);
    exit;
}
$hand = $data['hand'];
$gameType = isset($data['gameType']) ? $data['gameType'] : 'thirteen'; // 默认为十三张

// --- 智能理牌核心逻辑 (基础策略) ---
// 这个函数的目标是找到一个不会“倒水”的有效牌型组合。
// 更高级的策略会尝试所有组合并评估总分，但这里的策略是找到一个合理的、有效的组合。
function findValidArrangement($hand, $gameType) {
    // 定义牌墩大小
    $laneSizes = ($gameType === 'thirteen') ? [3, 5, 5] : [2, 3, 3];
    list($topSize, $middleSize, $bottomSize) = $laneSizes;

    // 1. 生成所有可能的组合 (这是一个计算密集型操作，对于13张牌，组合数巨大)
    // 为了简化，我们采用一个启发式策略，而不是暴力搜索所有组合。

    // 启发式策略：
    // a. 先找出所有可能的顺子、同花、葫芦、铁支等强力牌型。
    // b. 尝试将最强的牌型放在尾墩，次强的放在中墩。
    // c. 如果找不到强力牌型，则按牌力排序，最大的放尾墩，以此类推。

    // 这里我们使用一个更简单的排序策略作为演示
    usort($hand, function($a, $b) {
        return evaluate_card_value($b) - evaluate_card_value($a);
    });

    $bottomLane = array_slice($hand, 0, $bottomSize);
    $middleLane = array_slice($hand, $bottomSize, $middleSize);
    $topLane = array_slice($hand, $bottomSize + $middleSize, $topSize);

    // 检查这个默认组合是否“倒水”
    $bottomEval = evaluateHand($bottomLane);
    $middleEval = evaluateHand($middleLane);
    $topEval = evaluateHand($topLane);

    if (compareHands($middleEval, $bottomEval) > 0 || compareHands($topEval, $middleEval) > 0) {
        // 如果倒水了，可以尝试一些基本的调整，例如交换一些牌
        // (这部分可以非常复杂，我们暂时只返回一个基础排序)
    }

    return [
        'top' => $topLane,
        'middle' => $middleLane,
        'bottom' => $bottomLane
    ];
}

// 执行理牌并返回结果
$arrangedHand = findValidArrangement($hand, $gameType);

echo json_encode([
    'success' => true,
    'arrangedHand' => $arrangedHand
]);
?>

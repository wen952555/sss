<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once('../utils/poker_evaluator.php');

// --- 接收前端数据 ---
$data = json_decode(file_get_contents("php://input"), true);
$hand = $data['hand'] ?? [];
$gameType = $data['gameType'] ?? 'thirteen';

// --- 全新的智能理牌算法 ---
// (这是一个非常复杂的逻辑，这里提供一个中等复杂度的实现)

function findBestArrangement($hand, $gameType) {
    $cardCount = count($hand);
    $laneSizes = ($gameType === 'thirteen') ? [3, 5, 5] : [2, 3, 3];
    list($topSize, $middleSize, $bottomSize) = $laneSizes;

    if ($cardCount !== ($topSize + $middleSize + $bottomSize)) {
        // 如果牌数不对，返回一个基础排序，避免错误
        usort($hand, fn($a, $b) => evaluate_card_value($b) - evaluate_card_value($a));
        return [
            'top' => array_slice($hand, $bottomSize + $middleSize),
            'middle' => array_slice($hand, $bottomSize, $middleSize),
            'bottom' => array_slice($hand, 0, $bottomSize),
        ];
    }
    
    // 1. 生成所有可能的牌墩组合 (这是一个简化的暴力搜索)
    $bestArrangement = null;
    $bestScore = -1;

    // 为了避免超时，我们只尝试有限次数的随机组合
    for ($i = 0; $i < 2000; $i++) { // 尝试2000次随机组合
        shuffle($hand);
        
        $bottom = array_slice($hand, 0, $bottomSize);
        $middle = array_slice($hand, $bottomSize, $middleSize);
        $top = array_slice($hand, $bottomSize + $middleSize);
        
        $bottomEval = evaluateHand($bottom);
        $middleEval = evaluateHand($middle);
        $topEval = evaluateHand($top);

        // 2. 检查是否“倒水”
        if (compareHands($middleEval, $bottomEval) > 0 || compareHands($topEval, $middleEval) > 0) {
            continue; // 如果倒水，跳过这个组合
        }

        // 3. 为合法的组合打分 (一个简单的评分策略)
        $score = $bottomEval['rank'] * 100 + $middleEval['rank'] * 10 + $topEval['rank'];
        
        if ($score > $bestScore) {
            $bestScore = $score;
            $bestArrangement = [
                'top' => $top,
                'middle' => $middle,
                'bottom' => $bottom
            ];
        }
    }

    // 4. 如果经过多次尝试仍未找到合法组合（几乎不可能），则返回一个基础排序
    if ($bestArrangement === null) {
        usort($hand, fn($a, $b) => evaluate_card_value($b) - evaluate_card_value($a));
        $bestArrangement = [
            'top' => array_slice($hand, $bottomSize + $middleSize),
            'middle' => array_slice($hand, $bottomSize, $middleSize),
            'bottom' => array_slice($hand, 0, $bottomSize),
        ];
    }
    
    return $bestArrangement;
}

// 执行理牌并返回结果
$arrangedHand = findBestArrangement($hand, $gameType);

echo json_encode([
    'success' => true,
    'arrangedHand' => $arrangedHand
]);
?>

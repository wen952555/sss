<?php
// backend/api/submit_hand.php
require_once '../includes/cors_config.php';
require_once '../includes/card_logic.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['head']) || !isset($input['middle']) || !isset($input['tail'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => '无效的输入数据']);
    exit;
}

$head = $input['head'];
$middle = $input['middle'];
$tail = $input['tail'];

// 基本数量验证
if (count($head) !== 3 || count($middle) !== 5 || count($tail) !== 5) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '牌墩数量不正确 (头3, 中5, 尾5)']);
    exit;
}

// 检查是否有重复的牌被提交 (更复杂的验证)
$allSubmittedCards = array_merge($head, $middle, $tail);
$uniqueSubmittedCards = [];
foreach ($allSubmittedCards as $card) {
    $cardKey = $card['suit'] . $card['rank'];
    if (in_array($cardKey, $uniqueSubmittedCards)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '提交的牌型中包含重复的牌']);
        exit;
    }
    $uniqueSubmittedCards[] = $cardKey;
}
if (count($uniqueSubmittedCards) !== 13) {
     http_response_code(400);
    echo json_encode(['success' => false, 'message' => '提交的牌总数不为13张不同的牌']);
    exit;
}


// 倒水检查 (使用 card_logic.php 中的简化版)
if (isMisArranged($head, $middle, $tail)) {
    http_response_code(400); // Bad Request or custom code for misarranged
    echo json_encode([
        'success' => false, 
        'message' => '提交失败：牌型倒水！(头道 > 中道 或 中道 > 尾道)',
        'details' => [
            'head_type' => getHandTypeSimple($head),
            'middle_type' => getHandTypeSimple($middle),
            'tail_type' => getHandTypeSimple($tail)
        ]
    ]);
    exit;
}

// 实际游戏中这里会有复杂的比牌和计分逻辑
$headType = getHandTypeSimple($head);
$middleType = getHandTypeSimple($middle);
$tailType = getHandTypeSimple($tail);

// 假设验证通过
http_response_code(200); // OK
echo json_encode([
    'success' => true, 
    'message' => '牌型已提交并通过初步验证',
    'details' => [
        'head_type' => $headType,
        'middle_type' => $middleType,
        'tail_type' => $tailType,
        // 'score' => calculate_score(...) // 计分逻辑
    ]
]);

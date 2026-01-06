<?php
require_once 'db.php';
require_once 'CardEvaluator.php';

$action = $_GET['action'] ?? '';
$userId = authCheck(); // 假设此函数校验Token并返回UID

if ($action == 'create') {
    $type = $_POST['type']; // tonight or tomorrow
    $endTime = ($type == 'tonight') ? date('Y-m-d 20:00:00') : date('Y-m-d 20:00:00', strtotime('+1 day'));
    
    $stmt = $pdo->prepare("INSERT INTO rooms (end_time, status) VALUES (?, 'active')");
    $stmt->execute([$endTime]);
    echo json_encode(['roomId' => $pdo->lastInsertId()]);
}

if ($action == 'get_cards') {
    $roomId = $_GET['roomId'];
    // 逻辑：获取该玩家当前应打的RoundID，如果是新段，生成随机序列
    // 检查数据库 pre_deals，按需生成
    // 返回13张牌
}

if ($action == 'submit_segment') {
    $cardsData = json_decode($_POST['data'], true); // 10局的摆牌方案
    foreach($cardsData as $round) {
        // 校验相公
        if(CardEvaluator::isInvalid($round['head'], $round['mid'], $round['tail'])) {
            sendResponse(['msg' => '存在非法摆牌'], 400);
        }
        // 存入 submissions 表
    }
    // 触发结算检查：如果该段满4人，调用 CardEvaluator::settle($roomId, $segment)
}

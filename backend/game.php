<?php
require_once 'db.php';

$action = $_GET['action'] ?? '';
$userId = authCheck(); // 验证Token

if ($action == 'create') {
    $type = $_POST['type'] ?? 'tonight';
    $endTime = ($type == 'tonight') ? date('Y-m-d 20:00:00') : date('Y-m-d 20:00:00', strtotime('+1 day'));
    
    // 查找是否已有该类型的活动房间
    $stmt = $pdo->prepare("SELECT id FROM rooms WHERE type = ? AND status = 'active' AND end_time = ?");
    $stmt->execute([$type, $endTime]);
    $room = $stmt->fetch();
    
    if (!$room) {
        $stmt = $pdo->prepare("INSERT INTO rooms (type, end_time, status) VALUES (?, ?, 'active')");
        $stmt->execute([$type, $endTime]);
        $roomId = $pdo->lastInsertId();
    } else {
        $roomId = $room['id'];
    }
    echo json_encode(['roomId' => $roomId]);
}

if ($action == 'get_cards') {
    $roomId = $_GET['roomId'];
    
    // 1. 确定玩家当前的局数进度
    $stmt = $pdo->prepare("SELECT MAX(round_index) as last_round FROM submissions WHERE user_id = ? AND room_id = ?");
    $stmt->execute([$userId, $roomId]);
    $progress = $stmt->fetch();
    $startRound = ($progress['last_round'] ?? 0) + 1;
    $endRound = $startRound + 9;

    // 2. 检查发牌池是否有这10局，没有则生成
    for ($i = $startRound; $i <= $endRound; $i++) {
        $stmt = $pdo->prepare("SELECT id FROM pre_deals WHERE room_id = ? AND round_index = ?");
        $stmt->execute([$roomId, $i]);
        if (!$stmt->fetch()) {
            // 生成一副52张牌并洗牌
            $cards = range(1, 52); shuffle($cards);
            $t1 = array_slice($cards, 0, 13);
            $t2 = array_slice($cards, 13, 13);
            $t3 = array_slice($cards, 26, 13);
            $t4 = array_slice($cards, 39, 13);
            
            $stmt = $pdo->prepare("INSERT INTO pre_deals (room_id, round_index, track_1, track_2, track_3, track_4) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$roomId, $i, json_encode($t1), json_encode($t2), json_encode($t3), json_encode($t4)]);
        }
    }

    // 3. 分配跑道（简单逻辑：按进入房间顺序分配1-4）
    $trackIdx = ($userId % 4) + 1; 
    $trackKey = "track_" . $trackIdx;

    // 4. 获取这10局的手牌并返回
    $stmt = $pdo->prepare("SELECT round_index, $trackKey as cards FROM pre_deals WHERE room_id = ? AND round_index BETWEEN ? AND ? ORDER BY round_index ASC");
    $stmt->execute([$roomId, $startRound, $endRound]);
    $rounds = $stmt->fetchAll();
    
    // 格式化输出
    $result = [];
    foreach($rounds as $r) {
        $result[] = [
            'roundId' => $r['round_index'],
            'cards' => json_decode($r['cards'])
        ];
    }
    echo json_encode(['rounds' => $result]);
}

if ($action == 'submit_segment') {
    $roomId = $_GET['roomId'];
    $data = json_decode($_POST['data'], true); // 10局的摆牌数据

    foreach($data as $item) {
        $stmt = $pdo->prepare("INSERT INTO submissions (user_id, room_id, round_index, head, mid, tail) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $userId, 
            $roomId, 
            $item['roundId'], 
            json_encode($item['head']), 
            json_encode($item['mid']), 
            json_encode($item['tail'])
        ]);
    }
    echo json_encode(['msg' => '提交成功']);
}
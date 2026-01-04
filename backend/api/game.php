<?php
/* backend/api/game.php */
require_once '../lib/DB.php';
$pdo = DB::connect();

$action = $_GET['action'] ?? '';

if ($action === 'fetch_segment') {
    // 获取当前段的10局乱序牌
    $userId = $_POST['user_id'];
    $roomId = $_POST['room_id'];
    $segment = $_POST['segment']; // 0代表1-10局
    
    // 检查并生成预发牌
    $start = $segment * 10 + 1;
    $end = $start + 9;
    
    $rounds = [];
    for ($i = $start; $i <= $end; $i++) {
        $stmt = $pdo->prepare("SELECT * FROM pre_deals WHERE room_id = ? AND round_id = ?");
        $stmt->execute([$roomId, $i]);
        $deal = $stmt->fetch();
        
        if (!$deal) {
            // 生成新牌
            $deck = range(1, 52); shuffle($deck);
            $t = [
                array_slice($deck, 0, 13),
                array_slice($deck, 13, 13),
                array_slice($deck, 26, 13),
                array_slice($deck, 39, 13)
            ];
            $pdo->prepare("INSERT INTO pre_deals (room_id, round_id, t1, t2, t3, t4) VALUES (?,?,?,?,?,?)")
                ->execute([$roomId, $i, json_encode($t[0]), json_encode($t[1]), json_encode($t[2]), json_encode($t[3])]);
            $deal = ['t1'=>json_encode($t[0]), 't2'=>json_encode($t[1]), 't3'=>json_encode($t[2]), 't4'=>json_encode($t[3])];
        }
        
        // 分配赛道逻辑 (简化：根据用户进房顺序)
        $trackId = ($_POST['track_id'] ?? 1);
        $rounds[] = ['round_id' => $i, 'cards' => json_decode($deal["t$trackId"])];
    }
    // 乱序返回
    shuffle($rounds);
    echo json_encode($rounds);
}

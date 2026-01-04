<?php
/* backend/api/game.php */
require_once __DIR__ . '/../lib/DB.php';
require_once __DIR__ . '/../lib/CardLogic.php';

$pdo = DB::connect();
$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

if ($action === 'fetch_segment') {
    $userId = $data['user_id'] ?? 0;
    $roomId = $data['room_id'] ?? 1;
    $segment = $data['segment'] ?? 0;
    $trackId = $data['track_id'] ?? 1;

    $start = $segment * 10 + 1;
    $end = $start + 9;
    
    $rounds = [];
    for ($i = $start; $i <= $end; $i++) {
        $stmt = $pdo->prepare("SELECT * FROM pre_deals WHERE room_id = ? AND round_id = ?");
        $stmt->execute([$roomId, $i]);
        $deal = $stmt->fetch();
        
        if (!$deal) {
            // 生成新牌
            $deck = range(1, 52); 
            shuffle($deck);
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
        
        $column = "t$trackId";
        $rounds[] = ['round_id' => $i, 'cards' => json_decode($deal[$column])];
    }
    shuffle($rounds);
    echo json_encode($rounds);

} elseif ($action === 'submit') {
    $userId = $data['user_id'] ?? 0;
    $roomId = $data['room_id'] ?? 1;
    $roundId = $data['round_id'] ?? 0;
    $trackId = $data['track_id'] ?? 1;
    $head = $data['head'] ?? [];
    $mid = $data['mid'] ?? [];
    $tail = $data['tail'] ?? [];

    if (CardLogic::isXiangGong($head, $mid, $tail)) {
        echo json_encode(['error' => '相公了！请重新摆牌。']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO submissions (user_id, room_id, round_id, track_id, head, mid, tail) 
                               VALUES (?, ?, ?, ?, ?, ?, ?) 
                               ON DUPLICATE KEY UPDATE head=?, mid=?, tail=?, is_settled=0");
        $stmt->execute([
            $userId, $roomId, $roundId, $trackId, 
            json_encode($head), json_encode($mid), json_encode($tail),
            json_encode($head), json_encode($mid), json_encode($tail)
        ]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        echo json_encode(['error' => '提交失败: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['error' => '无效的操作']);
}

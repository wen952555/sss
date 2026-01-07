<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/src/GameLogic.php';
require_once __DIR__ . '/src/Database.php';

date_default_timezone_set('Asia/Shanghai');
$pdo = Database::getInstance();

$current_time = date('H:i');
// 匹配 12:00 或 20:00 (允许5分钟内的误差执行)
if (!in_array($current_time, ['12:00', '12:01', '20:00', '20:01'])) {
    exit("非结算时间");
}

$pool_type = (date('H') < 15) ? '12pm' : '8pm';
$today = date('Y-m-d');

// 1. 获取未结算的场次
$stmt = $pdo->prepare("SELECT id FROM pools WHERE pool_type = ? AND target_date = ? AND status = 'open'");
$stmt->execute([$pool_type, $today]);
$pool = $stmt->fetch();

if (!$pool) exit("今日场次已结算或未开启");

// 2. 遍历该场次所有车厢
$cStmt = $pdo->prepare("SELECT * FROM carriages WHERE pool_id = ?");
$cStmt->execute([$pool['id']]);
$carriages = $cStmt->fetchAll();

foreach ($carriages as $car) {
    // 找出该车厢内已提交的真人
    $pStmt = $pdo->prepare("SELECT * FROM player_submissions WHERE carriage_id = ? AND is_submitted = 1");
    $pStmt->execute([$car['id']]);
    $players = $pStmt->fetchAll();

    // 只有真人数量 >= 2 才结算
    if (count($players) >= 2) {
        // 解码玩家理牌方案
        foreach ($players as &$p) {
            $p['solutions'] = json_decode($p['solutions'], true);
        }

        // 调用之前编写的结算算法 (此处调用 Scorer 逻辑)
        // 假设已经引入了计算水数的类
        $results = ThirteenWaterSettle::settleCarriage($players);

        // 更新数据库积分
        foreach ($results as $uid => $score) {
            $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?")->execute([$score, $uid]);
            $pdo->prepare("UPDATE player_submissions SET total_score = ?, is_settled = 1 WHERE user_id = ? AND carriage_id = ?")
                ->execute([$score, $uid, $car['id']]);
        }
    }
}

// 3. 关闭场次
$pdo->prepare("UPDATE pools SET status = 'settled' WHERE id = ?")->execute([$pool['id']]);
echo "结算完成: $pool_type";
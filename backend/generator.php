<?php
// backend/generator.php
require 'db.php';
require 'game_logic.php';

// 1. 生成牌池 (960局)
$pdo->exec("TRUNCATE TABLE pre_dealt_pool");
for ($i = 0; $i < 960; $i++) {
    $suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    $vals = ['2','3','4','5','6','7','8','9','10','jack','queen','king','ace'];
    $deck = [];
    foreach($suits as $s) foreach($vals as $v) $deck[] = "{$v}_of_{$s}.svg";
    shuffle($deck);
    $p1 = json_encode(Shisanshui::autoSort(array_slice($deck,0,13)));
    $p2 = json_encode(Shisanshui::autoSort(array_slice($deck,13,13)));
    $p3 = json_encode(Shisanshui::autoSort(array_slice($deck,26,13)));
    $p4 = json_encode(Shisanshui::autoSort(array_slice($deck,39,13)));
    $stmt = $pdo->prepare("INSERT INTO pre_dealt_pool (pos1_ai,pos2_ai,pos3_ai,pos4_ai) VALUES (?,?,?,?)");
    $stmt->execute([$p1,$p2,$p3,$p4]);
}

// 2. 生成演示场次 (今晚8点和明晚8点)
$pdo->exec("TRUNCATE TABLE game_sessions");
$tonight = date('Y-m-d 20:00:00');
$tomorrow = date('Y-m-d 20:00:00', strtotime('+1 day'));
$pdo->prepare("INSERT INTO game_sessions (settle_time) VALUES (?)")->execute([$tonight]);
$pdo->prepare("INSERT INTO game_sessions (settle_time) VALUES (?)")->execute([$tomorrow]);

echo "初始化完成：960局牌池及两场预约场。";
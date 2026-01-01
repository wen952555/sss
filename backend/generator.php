<?php
/** 路径: backend/generator.php */
require_once 'db.php';
require_once 'game_logic.php';

// 清空旧牌池
$pdo->exec("TRUNCATE TABLE pre_dealt_pool");

$suits = ['spades', 'hearts', 'diamonds', 'clubs'];
$values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
$base_deck = [];
foreach($suits as $s) foreach($values as $v) $base_deck[] = "{$v}_of_{$s}.svg";

for ($i = 0; $i < 960; $i++) {
    $deck = $base_deck;
    shuffle($deck);
    $seats = [];
    for ($p = 0; $p < 4; $p++) {
        $hand = array_slice($deck, $p * 13, 13);
        $seats[] = json_encode(['cards' => $hand, 'ai' => Shisanshui::autoSort($hand)]);
    }
    
    $stmt = $pdo->prepare("INSERT INTO pre_dealt_pool (pos1_json, pos2_json, pos3_json, pos4_json) VALUES (?, ?, ?, ?)");
    $stmt->execute($seats);
}
echo "960 games generated with AI solutions.";
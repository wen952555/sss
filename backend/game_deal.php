<?php
require 'utils.php';
// 生成一副牌
$suits = ['clubs', 'spades', 'diamonds', 'hearts'];
$ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
$deck = [];

foreach ($suits as $s) {
    foreach ($ranks as $r) {
        // 对应文件名的映射逻辑，例如: ace_of_spades
        $deck[] = "{$r}_of_{$s}";
    }
}
$deck[] = "red_joker";
$deck[] = "black_joker";

shuffle($deck);

// 十三水取前13张
$hand = array_slice($deck, 0, 13);
sendJSON(["hand" => $hand]);
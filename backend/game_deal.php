<?php
require 'utils.php';

$suits = ['clubs', 'spades', 'diamonds', 'hearts'];
$ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
$deck = [];

// 生成52张牌，不包含大小王
foreach ($suits as $s) {
    foreach ($ranks as $r) {
        $deck[] = "{$r}_of_{$s}";
    }
}

shuffle($deck);

// 十三水取前13张
$hand = array_slice($deck, 0, 13);
sendJSON(["hand" => $hand]);
<?php
require 'utils.php';

$suits = ['clubs', 'spades', 'diamonds', 'hearts'];
$ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
$deck = [];

foreach ($suits as $s) {
    foreach ($ranks as $r) {
        $deck[] = "{$r}_of_{$s}";
    }
}
shuffle($deck);
sendJSON(["hand" => array_slice($deck, 0, 13)]);
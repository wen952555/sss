<?php
// backend/constants.php

define('SUITS', ['hearts', 'diamonds', 'clubs', 'spades']);
define('RANKS', ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);

define('RANK_VALUES', [
    '2' => 2, '3' => 3, '4' => 4, '5' => 5, '6' => 6, '7' => 7, '8' => 8,
    '9' => 9, '10' => 10, 'J' => 11, 'Q' => 12, 'K' => 13, 'A' => 14
]);

define('HAND_TYPES', [
    'HIGH_CARD' => ['name' => 'High Card', 'value' => 1],
    'ONE_PAIR' => ['name' => 'One Pair', 'value' => 2],
    'TWO_PAIR' => ['name' => 'Two Pair', 'value' => 3],
    'THREE_OF_A_KIND' => ['name' => 'Three of a Kind', 'value' => 4],
    'STRAIGHT' => ['name' => 'Straight', 'value' => 5],
    'FLUSH' => ['name' => 'Flush', 'value' => 6],
    'FULL_HOUSE' => ['name' => 'Full House', 'value' => 7],
    'FOUR_OF_A_KIND' => ['name' => 'Four of a Kind', 'value' => 8],
    'STRAIGHT_FLUSH' => ['name' => 'Straight Flush', 'value' => 9],
    'ROYAL_FLUSH' => ['name' => 'Royal Flush', 'value' => 10]
]);

define('SPECIAL_HAND_TYPES', [
    'NONE' => ['name' => 'None', 'value' => 0, 'score' => 0],
    'SIX_PAIRS' => ['name' => 'Six Pairs', 'value' => 1, 'score' => 3],
    'THREE_STRAIGHTS' => ['name' => 'Three Straights', 'value' => 2, 'score' => 4],
    'THREE_FLUSHES' => ['name' => 'Three Flushes', 'value' => 3, 'score' => 5],
    'FIVE_PAIRS_AND_TRIPLE' => ['name' => 'Five Pairs and a Triple', 'value' => 4, 'score' => 6],
    'ALL_SAME_COLOR' => ['name' => 'All Same Color', 'value' => 5, 'score' => 10],
    'ALL_SMALL' => ['name' => 'All Small', 'value' => 6, 'score' => 12],
    'ALL_BIG' => ['name' => 'All Big', 'value' => 7, 'score' => 12],
    'FOUR_TRIPLES' => ['name' => 'Four Triples', 'value' => 8, 'score' => 20],
    'THREE_STRAIGHT_FLUSHES' => ['name' => 'Three Straight Flushes', 'value' => 9, 'score' => 30],
    'TWELVE_ROYALS' => ['name' => 'Twelve Royals', 'value' => 10, 'score' => 52],
    'DRAGON' => ['name' => 'Dragon (A-K)', 'value' => 11, 'score' => 13],
    'SUPREME_DRAGON' => ['name' => 'Supreme Dragon (Same Suit)', 'value' => 12, 'score' => 108]
]);

define('SEGMENT_SCORES', [
    'front' => [
        'THREE_OF_A_KIND' => 3
    ],
    'middle' => [
        'FULL_HOUSE' => 2,
        'FOUR_OF_A_KIND' => 8,
        'STRAIGHT_FLUSH' => 10
    ],
    'back' => [
        'FOUR_OF_A_KIND' => 4,
        'STRAIGHT_FLUSH' => 5
    ]
]);

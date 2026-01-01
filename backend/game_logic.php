<?php
// backend/game_logic.php

class Shisanshui {
    // 牌型等级
    const ROYAL_FLUSH = 10;    // 同花大顺
    const STRAIGHT_FLUSH = 9; // 同花顺
    const FOUR_KIND = 8;      // 四条
    const FULL_HOUSE = 7;     // 葫芦
    const FLUSH = 6;          // 同花
    const STRAIGHT = 5;       // 顺子
    const THREE_KIND = 4;     // 三条
    const TWO_PAIR = 3;       // 两对
    const ONE_PAIR = 2;       // 对子
    const HIGH_CARD = 1;      // 散牌

    private static $valueMap = [
        '2'=>2, '3'=>3, '4'=>4, '5'=>5, '6'=>6, '7'=>7, '8'=>8, '9'=>9, '10'=>10,
        'jack'=>11, 'queen'=>12, 'king'=>13, 'ace'=>14
    ];

    public static function analyzeHand($cards) {
        if (count($cards) == 0) return ['rank' => 0];
        
        $parsed = [];
        foreach ($cards as $c) {
            // 解析文件名: "ace_of_spades.svg" -> value: ace, suit: spades
            if (preg_match('/(.*)_of_(.*)\.svg/', $c, $m)) {
                $parsed[] = ['v' => self::$valueMap[$m[1]], 's' => $m[2]];
            }
        }

        // 排序
        usort($parsed, function($a, $b) { return $b['v'] - $a['v']; });
        
        $values = array_column($parsed, 'v');
        $suits = array_column($parsed, 's');
        $counts = array_count_values($values);
        arsort($counts);

        $isFlush = count(array_unique($suits)) === 1;
        $isStraight = self::checkStraight($values);

        // 简单逻辑判断等级
        if ($isFlush && $isStraight) return ['rank' => self::STRAIGHT_FLUSH, 'power' => max($values)];
        if (reset($counts) === 4) return ['rank' => self::FOUR_KIND, 'power' => key($counts)];
        if (reset($counts) === 3 && next($counts) === 2) return ['rank' => self::FULL_HOUSE, 'power' => key($counts)];
        if ($isFlush) return ['rank' => self::FLUSH, 'power' => $values];
        if ($isStraight) return ['rank' => self::STRAIGHT, 'power' => max($values)];
        if (reset($counts) === 3) return ['rank' => self::THREE_KIND, 'power' => key($counts)];
        if (reset($counts) === 2 && next($counts) === 2) return ['rank' => self::TWO_PAIR, 'power' => array_keys($counts)];
        if (reset($counts) === 2) return ['rank' => self::ONE_PAIR, 'power' => key($counts)];
        
        return ['rank' => self::HIGH_CARD, 'power' => $values];
    }

    private static function checkStraight($values) {
        $uniqueValues = array_unique($values);
        if (count($uniqueValues) < 5) return false;
        return (max($uniqueValues) - min($uniqueValues) === 4);
    }
}